/**
 * Decklist Overview - Shows the complete decklist for a finished draft
 * 
 * Displays cards organized by CMC and shows basic deck statistics.
 */

import { useMemo } from 'react';
import type { Card } from '@/lib/engine/PackGenerator';
import { Card as CardComponent } from './Card';

interface DecklistOverviewProps {
  cards: Card[];
  draftId: string;
}

export function DecklistOverview({ cards, draftId }: DecklistOverviewProps) {
  // Organize cards by CMC
  const cardsByCMC = useMemo(() => {
    const organized: Record<number, Card[]> = {};
    
    cards.forEach(card => {
      const cmc = card.cmc || 0;
      if (!organized[cmc]) {
        organized[cmc] = [];
      }
      organized[cmc].push(card);
    });
    
    // Sort cards within each CMC by name
    Object.values(organized).forEach(cmcCards => {
      cmcCards.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return organized;
  }, [cards]);
  
  // Calculate deck statistics
  const stats = useMemo(() => {
    const colors = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    let totalCMC = 0;
    let nonlandCount = 0;
    
    cards.forEach(card => {
      // Count colors
      if (card.colors) {
        card.colors.forEach(color => {
          if (color in colors) {
            colors[color as keyof typeof colors]++;
          }
        });
      }
      
      // Count non-lands and total CMC
      if (!card.type_line?.includes('Land')) {
        nonlandCount++;
        totalCMC += card.cmc || 0;
      }
    });
    
    const avgCMC = nonlandCount > 0 ? (totalCMC / nonlandCount).toFixed(2) : '0.00';
    
    return {
      totalCards: cards.length,
      avgCMC,
      colors,
      nonlandCount,
      landCount: cards.length - nonlandCount
    };
  }, [cards]);
  
  const getColorName = (code: string) => {
    const names: Record<string, string> = {
      W: 'White',
      U: 'Blue', 
      B: 'Black',
      R: 'Red',
      G: 'Green'
    };
    return names[code] || code;
  };
  
  const cmcKeys = Object.keys(cardsByCMC).map(Number).sort((a, b) => a - b);
  
  return (
    <div className="space-y-6">
      {/* Deck Statistics */}
      <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/50">
        <h3 className="text-xl font-semibold text-white mb-4">Deck Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Total Cards:</span>
            <span className="text-white ml-2 font-medium">{stats.totalCards}</span>
          </div>
          <div>
            <span className="text-slate-400">Average CMC:</span>
            <span className="text-white ml-2 font-medium">{stats.avgCMC}</span>
          </div>
          <div>
            <span className="text-slate-400">Creatures:</span>
            <span className="text-white ml-2 font-medium">
              {cards.filter(c => c.type_line?.includes('Creature')).length}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Spells:</span>
            <span className="text-white ml-2 font-medium">{stats.nonlandCount}</span>
          </div>
          <div>
            <span className="text-slate-400">Lands:</span>
            <span className="text-white ml-2 font-medium">{stats.landCount}</span>
          </div>
        </div>
        
        {/* Color Distribution */}
        <div className="mt-4 pt-4 border-t border-slate-600/50">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Color Distribution</h4>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.colors).filter(([_, count]) => count > 0).map(([color, count]) => (
              <div key={color} className="flex items-center gap-1">
                <span className={`w-5 h-5 rounded-full bg-${color.toLowerCase() === 'w' ? 'white' : color.toLowerCase() === 'u' ? 'blue-500' : color.toLowerCase() === 'b' ? 'gray-900' : color.toLowerCase() === 'r' ? 'red-500' : 'green-500'}`} />
                <span className="text-sm text-slate-300">{getColorName(color)}: {count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Cards by CMC */}
      <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/50">
        <h3 className="text-xl font-semibold text-white mb-4">Cards by Mana Value</h3>
        <div className="space-y-6">
          {cmcKeys.map(cmc => (
            <div key={cmc}>
              <h4 className="text-lg font-medium text-slate-300 mb-3">
                {cmc === 0 ? 'Zero' : cmc} Mana ({cardsByCMC[cmc].length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {cardsByCMC[cmc].map(card => (
                  <div key={card.id} className="hover:scale-105 transition-transform">
                    <CardComponent
                      card={card}
                      size="small"
                      canInteract={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}