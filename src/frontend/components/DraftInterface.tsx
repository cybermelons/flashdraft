/**
 * Draft Interface - Simple, Clean Component
 * 
 * No complex logic - just displays current state and handles user interactions.
 * Reads state from store, renders UI, calls draft actions on clicks.
 */

import React from 'react';
import { draftActions } from '../../stores/simpleDraftStore';
import { getPreviousLinkProps, getNextLinkProps } from '../../utils/navigation';
import type { SeededDraftState } from '../../shared/types/seededDraftState';

export interface DraftInterfaceProps {
  draft: SeededDraftState;
}

export function DraftInterface({ draft }: DraftInterfaceProps) {
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">
          Draft {draft.seed} - Round {draft.round}, Pick {draft.pick}
        </h2>
        
        <div className="mb-6">
          <p className="text-gray-600">Status: {draft.status}</p>
          <p className="text-gray-600">Direction: {draft.direction}</p>
        </div>

        {/* Navigation */}
        <DraftNavigation draft={draft} />
        
        {/* Current Pack */}
        {draft.status === 'active' && <CurrentPack draft={draft} />}
        
        {/* Picked Cards */}
        <PickedCards draft={draft} />
      </div>
    </div>
  );
}

/**
 * Draft Navigation Component
 * Uses <a> tags for Previous/Next - browser handles navigation naturally
 */
function DraftNavigation({ draft }: { draft: SeededDraftState }) {
  const prevProps = getPreviousLinkProps(draft);
  const nextProps = getNextLinkProps(draft);

  return (
    <div className="flex justify-between items-center mb-6">
      {prevProps ? (
        <a
          href={prevProps.href}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          ← Previous
        </a>
      ) : (
        <div className="px-4 py-2 bg-gray-100 text-gray-400 rounded cursor-not-allowed">
          ← Previous
        </div>
      )}
      
      <span className="text-lg font-medium">
        Round {draft.round}, Pick {draft.pick}
      </span>
      
      {nextProps ? (
        <a
          href={nextProps.href}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Next →
        </a>
      ) : (
        <div className="px-4 py-2 bg-gray-100 text-gray-400 rounded cursor-not-allowed">
          Next →
        </div>
      )}
    </div>
  );
}

/**
 * Current Pack Component
 * Renders available cards and handles pick clicks
 */
function CurrentPack({ draft }: { draft: SeededDraftState }) {
  const humanPlayer = draft.players.find(p => p.isHuman);
  const currentPack = humanPlayer?.currentPack;

  if (!currentPack || !currentPack.cards.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No cards to pick</p>
      </div>
    );
  }

  const handleCardClick = async (cardId: string) => {
    try {
      console.log(`[DraftInterface] Attempting to pick card: ${cardId}`);
      console.log(`[DraftInterface] Current pack has ${currentPack?.cards.length} cards:`, 
        currentPack?.cards.map(c => c.id));
      await draftActions.makeHumanPick(cardId);
      // Navigation handled automatically by draftActions
    } catch (error) {
      console.error('Failed to make pick:', error);
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">
        Choose a card ({currentPack.cards.length} remaining)
      </h3>
      <div className="grid grid-cols-5 gap-4">
        {currentPack.cards.map((card: any) => (
          <button
            key={card.instanceId}
            onClick={() => handleCardClick(card.id)}
            className="p-2 border-2 border-gray-200 rounded hover:border-blue-500 transition-colors"
          >
            <div className="text-sm font-medium">{card.name}</div>
            <div className="text-xs text-gray-500">{card.manaCost}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Picked Cards Component
 * Displays cards the player has drafted
 */
function PickedCards({ draft }: { draft: SeededDraftState }) {
  const humanPlayer = draft.players.find(p => p.isHuman);
  const pickedCards = humanPlayer?.pickedCards || [];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        Your Picks ({pickedCards.length})
      </h3>
      {pickedCards.length === 0 ? (
        <p className="text-gray-600">No cards picked yet</p>
      ) : (
        <div className="grid grid-cols-6 gap-2">
          {pickedCards.map((card: any) => (
            <div key={card.instanceId} className="p-2 border border-gray-200 rounded">
              <div className="text-xs font-medium">{card.name}</div>
              <div className="text-xs text-gray-500">{card.manaCost}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}