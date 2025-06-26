/**
 * FlashDraft - Pack Display Component
 * 
 * Displays a booster pack during draft with card selection
 * functionality and pack information.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { DraftCard, MTGCard } from '../../shared/types/card.js';
import type { GeneratedPack } from '../utils/clientPackGenerator.js';
import Card from './Card.js';

// Client-safe utility functions
const calculateManaCurve = (cards: DraftCard[]): Record<number, number> => {
  const curve: Record<number, number> = {};
  cards.forEach(card => {
    const cmc = Math.min(card.cmc, 7);
    curve[cmc] = (curve[cmc] || 0) + 1;
  });
  return curve;
};

export interface PackDisplayProps {
  pack: GeneratedPack;
  selectedCard?: DraftCard | null;
  onCardSelect: (card: DraftCard) => void;
  onCardHover?: (card: DraftCard | null) => void;
  showPackInfo?: boolean;
  allowMultiSelect?: boolean;
  sortBy?: 'cmc' | 'color' | 'rarity' | 'name' | 'type';
  filterBy?: {
    colors?: string[];
    rarities?: string[];
    types?: string[];
  };
}

const SORT_OPTIONS = [
  { value: 'cmc', label: 'Mana Cost' },
  { value: 'color', label: 'Color' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
];

const RARITY_ORDER = { common: 1, uncommon: 2, rare: 3, mythic: 4, special: 5, bonus: 6 };

export const PackDisplay: React.FC<PackDisplayProps> = ({
  pack,
  selectedCard,
  onCardSelect,
  onCardHover,
  showPackInfo = true,
  allowMultiSelect = false,
  sortBy = 'rarity',
  filterBy,
}) => {
  const [localSort, setLocalSort] = useState(sortBy);

  // Sort and filter cards
  const sortedCards = useMemo(() => {
    let cards = [...pack.cards];

    // Apply filters
    if (filterBy) {
      if (filterBy.colors?.length) {
        cards = cards.filter(card => 
          card.color_identity.some(color => filterBy.colors!.includes(color))
        );
      }
      if (filterBy.rarities?.length) {
        cards = cards.filter(card => filterBy.rarities!.includes(card.rarity));
      }
      if (filterBy.types?.length) {
        cards = cards.filter(card => 
          filterBy.types!.some(type => card.type_line.includes(type))
        );
      }
    }

    // Sort cards
    switch (localSort) {
      case 'cmc':
        return cards.sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));
      
      case 'color':
        return cards.sort((a, b) => {
          const aColor = a.color_identity[0] || 'Z'; // Colorless cards last
          const bColor = b.color_identity[0] || 'Z';
          return aColor.localeCompare(bColor) || a.cmc - b.cmc;
        });
      
      case 'rarity':
        return cards.sort((a, b) => {
          const aRarity = RARITY_ORDER[a.rarity] || 0;
          const bRarity = RARITY_ORDER[b.rarity] || 0;
          return bRarity - aRarity || a.name.localeCompare(b.name);
        });
      
      case 'name':
        return cards.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'type':
        return cards.sort((a, b) => 
          a.type_line.localeCompare(b.type_line) || a.name.localeCompare(b.name)
        );
      
      default:
        return cards;
    }
  }, [pack.cards, localSort, filterBy]);

  // Pack statistics
  const packStats = useMemo(() => {
    const stats = {
      total: pack.cards.length,
      by_rarity: {} as Record<string, number>,
      by_color: {} as Record<string, number>,
      mana_curve: calculateManaCurve(pack.cards),
      average_cmc: 0,
    };

    let totalCmc = 0;
    let nonLandCards = 0;

    pack.cards.forEach(card => {
      // Rarity stats
      stats.by_rarity[card.rarity] = (stats.by_rarity[card.rarity] || 0) + 1;

      // Color stats
      if (card.color_identity.length === 0) {
        stats.by_color['colorless'] = (stats.by_color['colorless'] || 0) + 1;
      } else if (card.color_identity.length === 1) {
        const color = card.color_identity[0];
        stats.by_color[color] = (stats.by_color[color] || 0) + 1;
      } else {
        stats.by_color['multicolor'] = (stats.by_color['multicolor'] || 0) + 1;
      }

      // CMC calculation (exclude lands)
      if (!card.type_line.includes('Land')) {
        totalCmc += card.cmc;
        nonLandCards++;
      }
    });

    stats.average_cmc = nonLandCards > 0 ? totalCmc / nonLandCards : 0;
    return stats;
  }, [pack.cards]);

  // Handle card selection
  const handleCardSelect = useCallback((card: DraftCard) => {
    onCardSelect(card);
  }, [onCardSelect]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Pack Header */}
      {showPackInfo && (
        <div className="bg-white border-b border-gray-200 p-3 sm:p-4 flex-shrink-0">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {pack.set_code} Pack #{pack.pack_number}
              </h2>
              <p className="text-gray-600">
                Pick #{pack.pick_number} • {pack.cards.length} cards remaining
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Avg CMC: {packStats.average_cmc.toFixed(1)}
              </div>
              {pack.metadata.foil_count > 0 && (
                <div className="text-sm text-yellow-600 font-medium">
                  ✨ {pack.metadata.foil_count} foil
                </div>
              )}
            </div>
          </div>

          {/* Pack Statistics - Mobile Optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Rarities</h4>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {Object.entries(packStats.by_rarity).map(([rarity, count]) => (
                  <span 
                    key={rarity}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      rarity === 'mythic' ? 'bg-orange-100 text-orange-800' :
                      rarity === 'rare' ? 'bg-yellow-100 text-yellow-800' :
                      rarity === 'uncommon' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {count} {rarity}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-1">Colors</h4>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {Object.entries(packStats.by_color).map(([color, count]) => (
                  <span 
                    key={color}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      color === 'W' ? 'bg-yellow-100 text-yellow-800' :
                      color === 'U' ? 'bg-blue-100 text-blue-800' :
                      color === 'B' ? 'bg-gray-100 text-gray-800' :
                      color === 'R' ? 'bg-red-100 text-red-800' :
                      color === 'G' ? 'bg-green-100 text-green-800' :
                      color === 'multicolor' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {count} {color === 'multicolor' ? 'multi' : color}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sort Controls - Mobile Friendly */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={localSort}
              onChange={(e) => setLocalSort(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <div className="text-sm text-gray-600">
              Showing {sortedCards.length} of {pack.cards.length} cards
            </div>
          </div>
        </div>
      )}

      {/* Cards Grid - Responsive */}
      <div className="flex-1 overflow-auto p-2 sm:p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 auto-rows-max">
          {sortedCards.map((card) => (
            <Card
              key={card.id}
              card={card}
              size="normal"
              selected={selectedCard?.id === card.id}
              onClick={handleCardSelect}
              showDetails={true}
              className="group touch-manipulation"
            />
          ))}
        </div>

        {sortedCards.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            No cards match the current filters
          </div>
        )}
      </div>
    </div>
  );
};

export default PackDisplay;