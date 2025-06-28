/** @jsxImportSource react */
/**
 * Draft Complete Screen Component
 * 
 * Shows draft completion with final deck and next steps.
 * Purely presentational component.
 */

import * as React from 'react';
import type { Card } from '../../engine/types/core';
import NewCard from './NewCard';

export interface DraftCompleteScreenProps {
  playerCards: Card[];
  onStartNewDraft: () => void;
  onShowCardDetails: (card: Card) => void;
  className?: string;
}

export const DraftCompleteScreen: React.FC<DraftCompleteScreenProps> = ({
  playerCards,
  onStartNewDraft,
  onShowCardDetails,
  className = ''
}) => {
  // Group cards by type for better display
  const creatures = playerCards.filter(card => card.typeLine.includes('Creature'));
  const spells = playerCards.filter(card => 
    card.typeLine.includes('Instant') || card.typeLine.includes('Sorcery')
  );
  const otherCards = playerCards.filter(card => 
    !card.typeLine.includes('Creature') && 
    !card.typeLine.includes('Instant') && 
    !card.typeLine.includes('Sorcery')
  );

  return (
    <div className={`flex items-center justify-center min-h-full bg-gradient-to-br from-green-50 to-blue-50 p-6 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-green-600 mb-2">
            Draft Complete!
          </h2>
          <p className="text-gray-600 text-lg">
            You've drafted {playerCards.length} cards. Ready for deck building!
          </p>
        </div>

        {/* Draft Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{creatures.length}</div>
            <div className="text-blue-800">Creatures</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{spells.length}</div>
            <div className="text-purple-800">Spells</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{otherCards.length}</div>
            <div className="text-gray-800">Other</div>
          </div>
        </div>

        {/* Card Display */}
        <div className="space-y-6 mb-8">
          {/* Creatures */}
          {creatures.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Creatures ({creatures.length})
              </h3>
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {creatures.map((card) => (
                  <NewCard
                    key={card.id}
                    card={card}
                    size="small"
                    canInteract={true}
                    onDoubleClick={() => onShowCardDetails(card)}
                    className="hover:transform hover:scale-105 transition-transform"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Spells */}
          {spells.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Spells ({spells.length})
              </h3>
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {spells.map((card) => (
                  <NewCard
                    key={card.id}
                    card={card}
                    size="small"
                    canInteract={true}
                    onDoubleClick={() => onShowCardDetails(card)}
                    className="hover:transform hover:scale-105 transition-transform"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Cards */}
          {otherCards.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Other ({otherCards.length})
              </h3>
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {otherCards.map((card) => (
                  <NewCard
                    key={card.id}
                    card={card}
                    size="small"
                    canInteract={true}
                    onDoubleClick={() => onShowCardDetails(card)}
                    className="hover:transform hover:scale-105 transition-transform"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => {/* TODO: Implement deck builder */}}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            🔧 Build Deck
            <span className="text-sm opacity-75">(Coming Soon)</span>
          </button>
          
          <button
            onClick={() => {/* TODO: Implement goldfish mode */}}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            🎯 Test Deck
            <span className="text-sm opacity-75">(Coming Soon)</span>
          </button>
          
          <button
            onClick={onStartNewDraft}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            🎲 New Draft
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Export your deck or start a new draft to continue practicing
          </p>
        </div>
      </div>
    </div>
  );
};

export default DraftCompleteScreen;