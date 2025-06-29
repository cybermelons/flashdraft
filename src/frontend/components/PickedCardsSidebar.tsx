/** @jsxImportSource react */
/**
 * Picked Cards Sidebar Component
 * 
 * Shows player's drafted cards with stats and organization.
 * Purely presentational component.
 */

import * as React from 'react';
import type { Card } from '../../engine/types/core';
import NewCard from './NewCard';

export interface PickedCardsSidebarProps {
  playerCards: Card[];
  onCardHover: (card: Card | null) => void;
  onShowCardDetails: (card: Card) => void;
}

export const PickedCardsSidebar: React.FC<PickedCardsSidebarProps> = ({
  playerCards,
  onCardHover,
  onShowCardDetails
}) => {
  // Calculate basic stats
  const creatures = playerCards.filter(card => 
    card.typeLine.includes('Creature')
  ).length;
  
  const spells = playerCards.filter(card => 
    card.typeLine.includes('Instant') || 
    card.typeLine.includes('Sorcery')
  ).length;
  
  const artifacts = playerCards.filter(card => 
    card.typeLine.includes('Artifact')
  ).length;
  
  const enchantments = playerCards.filter(card => 
    card.typeLine.includes('Enchantment')
  ).length;
  
  const planeswalkers = playerCards.filter(card => 
    card.typeLine.includes('Planeswalker')
  ).length;
  
  const lands = playerCards.filter(card => 
    card.typeLine.includes('Land')
  ).length;

  // Calculate mana curve
  const getManaCost = (card: Card): number => {
    if (!card.cmc && !card.manaCost) return 0;
    if (typeof card.cmc === 'number') return card.cmc;
    
    // Parse mana cost string if cmc not available
    const manaMatches = card.manaCost?.match(/\{(\d+)\}/);
    const genericCost = manaMatches ? parseInt(manaMatches[1]) : 0;
    const coloredSymbols = card.manaCost?.match(/\{[WUBRG]\}/g) || [];
    
    return genericCost + coloredSymbols.length;
  };

  const manaCurve = [0, 1, 2, 3, 4, 5, 6].map(cost => ({
    cost,
    count: playerCards.filter(card => {
      const cardCost = getManaCost(card);
      return cost === 6 ? cardCost >= 6 : cardCost === cost;
    }).length
  }));

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">
          Your Picks ({playerCards.length})
        </h2>
      </div>
      
      {/* Cards Grid */}
      <div className="flex-1 overflow-auto p-4">
        {playerCards.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {playerCards.map((card) => (
              <NewCard
                key={card.instanceId}
                card={card}
                size="small"
                canInteract={true}
                onHover={(hovered) => onCardHover(hovered ? card : null)}
                onDoubleClick={() => onShowCardDetails(card)}
                className="hover:transform hover:scale-105 transition-transform"
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-2">📦</div>
            <p>No cards picked yet</p>
          </div>
        )}
      </div>

      {/* Stats Section */}
      {playerCards.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-white space-y-4">
          {/* Card Type Breakdown */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Card Types</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Creatures:</span>
                <span>{creatures}</span>
              </div>
              <div className="flex justify-between">
                <span>Spells:</span>
                <span>{spells}</span>
              </div>
              {artifacts > 0 && (
                <div className="flex justify-between">
                  <span>Artifacts:</span>
                  <span>{artifacts}</span>
                </div>
              )}
              {enchantments > 0 && (
                <div className="flex justify-between">
                  <span>Enchantments:</span>
                  <span>{enchantments}</span>
                </div>
              )}
              {planeswalkers > 0 && (
                <div className="flex justify-between">
                  <span>Planeswalkers:</span>
                  <span>{planeswalkers}</span>
                </div>
              )}
              {lands > 0 && (
                <div className="flex justify-between">
                  <span>Lands:</span>
                  <span>{lands}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mana Curve */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Mana Curve</h3>
            <div className="flex items-end space-x-1 h-16">
              {manaCurve.map(({ cost, count }) => (
                <div key={cost} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t"
                    style={{ 
                      height: `${Math.max(4, (count / Math.max(...manaCurve.map(c => c.count))) * 100)}%`
                    }}
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    {cost === 6 ? '6+' : cost}
                  </div>
                  <div className="text-xs text-gray-500">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            <p>Total: {playerCards.length} cards</p>
            <p>Avg CMC: {playerCards.length > 0 ? 
              (playerCards.reduce((sum, card) => sum + getManaCost(card), 0) / playerCards.length).toFixed(1) : 
              '0.0'
            }</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickedCardsSidebar;