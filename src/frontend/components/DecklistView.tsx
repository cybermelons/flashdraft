/** @jsxImportSource react */
/**
 * FlashDraft - Decklist View Component
 * 
 * Shows drafted cards organized as a proper deck list with categories,
 * mana curve, and deck statistics.
 */

import * as React from 'react';
import type { DraftCard } from '../../shared/types/card';

interface DecklistViewProps {
  cards: DraftCard[];
  onCardClick?: (card: DraftCard) => void;
  onClose?: () => void;
}

interface DeckStats {
  total_cards: number;
  creatures: number;
  spells: number;
  lands: number;
  mana_curve: Record<number, number>;
  colors: Record<string, number>;
}

const MANA_SYMBOLS: Record<string, string> = {
  'W': '⚪', 'U': '🔵', 'B': '⚫', 'R': '🔴', 'G': '🟢', 'C': '⚪'
};

const COLOR_NAMES: Record<string, string> = {
  'W': 'White', 'U': 'Blue', 'B': 'Black', 'R': 'Red', 'G': 'Green', 'C': 'Colorless'
};

function calculateDeckStats(cards: DraftCard[]): DeckStats {
  const stats: DeckStats = {
    total_cards: cards.length,
    creatures: 0,
    spells: 0,
    lands: 0,
    mana_curve: {},
    colors: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
  };

  cards.forEach(card => {
    // Count by type
    if (card.type_line.includes('Land')) {
      stats.lands++;
    } else if (card.type_line.includes('Creature')) {
      stats.creatures++;
    } else {
      stats.spells++;
    }

    // Mana curve (use cmc or first face cmc for transform cards)
    const cmc = card.cmc || (card.card_faces?.[0] as any)?.cmc || 0;
    const cmcKey = Math.min(cmc, 7); // Cap at 7+ for display
    stats.mana_curve[cmcKey] = (stats.mana_curve[cmcKey] || 0) + 1;

    // Color identity
    if (card.color_identity) {
      card.color_identity.forEach(color => {
        if (stats.colors[color] !== undefined) {
          stats.colors[color]++;
        }
      });
    }
  });

  return stats;
}

function sortCardsByType(cards: DraftCard[]) {
  const categories = {
    creatures: [] as DraftCard[],
    spells: [] as DraftCard[],
    lands: [] as DraftCard[],
    other: [] as DraftCard[]
  };

  cards.forEach(card => {
    if (card.type_line.includes('Land')) {
      categories.lands.push(card);
    } else if (card.type_line.includes('Creature')) {
      categories.creatures.push(card);
    } else if (card.type_line.includes('Instant') || card.type_line.includes('Sorcery') || card.type_line.includes('Enchantment') || card.type_line.includes('Artifact')) {
      categories.spells.push(card);
    } else {
      categories.other.push(card);
    }
  });

  // Sort each category by name
  Object.values(categories).forEach(category => {
    category.sort((a, b) => a.name.localeCompare(b.name));
  });

  return categories;
}

const DecklistView: React.FC<DecklistViewProps> = ({ cards, onCardClick, onClose }) => {
  const stats = calculateDeckStats(cards);
  const categories = sortCardsByType(cards);

  const renderCardList = (categoryCards: DraftCard[], title: string) => {
    if (categoryCards.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">
          {title} ({categoryCards.length})
        </h3>
        <div className="space-y-1">
          {categoryCards.map((card, index) => (
            <div
              key={`${card.id}-${index}`}
              className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 ${
                onCardClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onCardClick?.(card)}
            >
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">{card.name}</span>
                {card.mana_cost && (
                  <span className="ml-2 text-xs text-gray-600">
                    {card.mana_cost.replace(/\{([WUBRGCX])\}/g, (_, symbol) => MANA_SYMBOLS[symbol] || symbol)}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {card.cmc || card.card_faces?.[0]?.cmc || 0}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const maxCurveHeight = Math.max(...Object.values(stats.mana_curve));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Deck List</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex">
          {/* Statistics Panel */}
          <div className="w-1/3 p-6 border-r border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deck Statistics</h3>
            
            {/* Basic Stats */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Cards:</span>
                <span className="text-sm font-medium">{stats.total_cards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Creatures:</span>
                <span className="text-sm font-medium">{stats.creatures}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Spells:</span>
                <span className="text-sm font-medium">{stats.spells}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Lands:</span>
                <span className="text-sm font-medium">{stats.lands}</span>
              </div>
            </div>

            {/* Mana Curve */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Mana Curve</h4>
              <div className="flex items-end space-x-1 h-24">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(cmc => {
                  const count = stats.mana_curve[cmc] || 0;
                  const height = maxCurveHeight > 0 ? (count / maxCurveHeight) * 100 : 0;
                  
                  return (
                    <div key={cmc} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${cmc}${cmc === 7 ? '+' : ''} mana: ${count} cards`}
                      />
                      <div className="text-xs text-gray-600 mt-1">
                        {cmc === 7 ? '7+' : cmc}
                      </div>
                      <div className="text-xs font-medium text-gray-900">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Color Distribution */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Colors</h4>
              <div className="space-y-1">
                {Object.entries(stats.colors)
                  .filter(([_, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([color, count]) => (
                    <div key={color} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="mr-2">{MANA_SYMBOLS[color]}</span>
                        <span className="text-sm text-gray-600">{COLOR_NAMES[color]}</span>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Card Lists */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-5rem)]">
            {renderCardList(categories.creatures, 'Creatures')}
            {renderCardList(categories.spells, 'Spells')}
            {renderCardList(categories.lands, 'Lands')}
            {renderCardList(categories.other, 'Other')}
            
            {cards.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>No cards in deck yet.</p>
                <p className="text-sm mt-2">Start drafting to build your deck!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecklistView;