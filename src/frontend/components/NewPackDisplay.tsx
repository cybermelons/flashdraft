/** @jsxImportSource react */
/**
 * New Pack Display Component
 * 
 * Displays draft pack cards using the new engine architecture.
 * Purely presentational component that receives all state and actions as props.
 */

import * as React from 'react';
import type { Pack, Card } from '../../engine/types/core';
import NewCard from './NewCard';

export interface NewPackDisplayProps {
  pack: Pack;
  selectedCard: Card | null;
  hoveredCard: Card | null;
  canMakePick: (cardId: string) => boolean;
  onCardSelect: (card: Card) => void;
  onCardHover: (card: Card | null) => void;
  onShowCardDetails: (card: Card) => void;
}

export const NewPackDisplay: React.FC<NewPackDisplayProps> = ({
  pack,
  selectedCard,
  hoveredCard,
  canMakePick,
  onCardSelect,
  onCardHover,
  onShowCardDetails
}) => {
  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-6">
        {/* Pack Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Pack {pack.round} ({pack.cards.length} cards remaining)
          </h2>
          <p className="text-sm text-gray-600">
            Select a card to add to your deck
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pack.cards.map((card) => {
            const isSelected = selectedCard?.id === card.id;
            const isHovered = hoveredCard?.id === card.id;
            const canPick = canMakePick(card.id);

            return (
              <NewCard
                key={card.id}
                card={card}
                size="medium"
                isSelected={isSelected}
                isHovered={isHovered}
                canInteract={canPick}
                showSelectionIndicator={true}
                onClick={() => onCardSelect(card)}
                onHover={(hovered) => onCardHover(hovered ? card : null)}
                onDoubleClick={() => onShowCardDetails(card)}
                className={`
                  transition-all duration-200
                  ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 transform scale-105' : ''}
                  ${isHovered && !isSelected ? 'transform scale-102' : ''}
                  ${!canPick ? 'opacity-50 grayscale' : 'hover:transform hover:scale-105'}
                `}
              />
            );
          })}
        </div>

        {/* Empty Pack State */}
        {pack.cards.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">Pack Empty</h3>
            <p className="text-gray-500">All cards from this pack have been drafted</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewPackDisplay;