/**
 * State Machine Draft Interface
 * 
 * React component that directly reads from nanostores.
 * No props - just direct store references.
 */

import React from 'react';
import { useStore } from '@nanostores/react';
import { draftStore, draftActions, type DraftCard } from '../../stores/draftStore';

export function StateMachineDraft() {
  const draft = useStore(draftStore);

  if (!draft) {
    return <div>No draft loaded</div>;
  }

  if (draft.status === 'setup') {
    return (
      <div>
        <h1>Draft Setup</h1>
        <button onClick={() => draftActions.start()}>
          Start Draft
        </button>
      </div>
    );
  }

  if (draft.status === 'complete') {
    return (
      <div>
        <h1>Draft Complete!</h1>
        <DraftResults />
      </div>
    );
  }

  // Active draft
  const human = draft.players.find(p => p.id === draft.humanPlayerId);
  const myPack = human?.currentPack;
  
  // Check if we're viewing a past position
  const currentPosition = (draft.round - 1) * 15 + draft.pick;
  const totalPicksMade = human?.pickedCards.length || 0;
  const isViewingPastPosition = currentPosition <= totalPicksMade;

  return (
    <div className="p-4">
      <DraftHeader />
      
      {isViewingPastPosition ? (
        <div className="bg-gray-100 p-4 rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">Viewing Past Position</h2>
          <p className="text-gray-600">
            This shows your draft state as it was at Pick {draft.pick} of Round {draft.round}.
          </p>
          <p className="text-gray-600 mt-2">
            You had {human?.pickedCards.length || 0} cards in your pool at this point.
          </p>
        </div>
      ) : myPack ? (
        <PackDisplay pack={myPack} />
      ) : (
        <div>Waiting for next pack...</div>
      )}
      
      <PlayerStatus />
    </div>
  );
}

function DraftHeader() {
  const draft = useStore(draftStore);
  if (!draft) return null;

  const human = draft.players.find(p => p.id === draft.humanPlayerId);
  const hasCards = human?.currentPack && human.currentPack.cards.length > 0;
  
  // Calculate navigation availability based on actual draft progress
  const currentPosition = (draft.round - 1) * 15 + draft.pick;
  const canGoPrevious = currentPosition > 1;
  
  // Only allow "next" if there are future positions that have been reached
  const humanPlayer = draft.players.find(p => p.id === draft.humanPlayerId);
  const totalPicksMade = humanPlayer?.pickedCards.length || 0;
  const canGoNext = currentPosition < totalPicksMade + 1;
  
  const handlePrevious = () => {
    if (!canGoPrevious) return;
    
    let newRound = draft.round;
    let newPick = draft.pick - 1;
    
    if (newPick < 1) {
      newRound--;
      newPick = 15;
    }
    
    // Navigate to previous position
    window.location.href = `/draft/${draft.id}/p${newRound}p${newPick}`;
  };
  
  const handleNext = () => {
    if (!canGoNext) return;
    
    let newRound = draft.round;
    let newPick = draft.pick + 1;
    
    if (newPick > 15) {
      newRound++;
      newPick = 1;
    }
    
    // Navigate to next position
    window.location.href = `/draft/${draft.id}/p${newRound}p${newPick}`;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Round {draft.round}, Pick {draft.pick}
          </h1>
          <p className="text-gray-600">
            Direction: {draft.direction} | Status: {draft.status}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`px-3 py-1 rounded text-sm ${
              canGoPrevious 
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            ← Previous
          </button>
          
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`px-3 py-1 rounded text-sm ${
              canGoNext
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Next →
          </button>
        </div>
      </div>
      
      {!hasCards && draft.status === 'active' && (
        <p className="text-orange-600 mt-2">
          ⏳ Waiting for bots to finish Pick {Math.max(1, draft.pick - 1)}...
        </p>
      )}
    </div>
  );
}

function PackDisplay({ pack }: { pack: { cards: DraftCard[] } }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">
        Your Pack ({pack.cards.length} cards)
      </h2>
      <div className="grid grid-cols-5 gap-2">
        {pack.cards.map(card => (
          <CardDisplay key={card.instanceId || card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function CardDisplay({ card }: { card: DraftCard }) {
  const handlePick = () => {
    try {
      draftActions.pick(card.id);
    } catch (error) {
      console.error('Pick failed:', error);
    }
  };

  return (
    <div 
      className="border rounded cursor-pointer hover:bg-gray-100 p-2"
      onClick={handlePick}
    >
      <img 
        src={card.imageUrl} 
        alt={card.name}
        className="w-full aspect-[5/7] object-cover rounded"
        onError={(e) => {
          // Fallback to text display
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.nextElementSibling?.classList.remove('hidden');
        }}
      />
      <div className="hidden text-xs mt-1">
        <div className="font-semibold">{card.name}</div>
        <div className="text-gray-600">{card.manaCost}</div>
        <div className="text-gray-500">{card.rarity}</div>
      </div>
    </div>
  );
}

function PlayerStatus() {
  const draft = useStore(draftStore);
  if (!draft) return null;

  const human = draft.players.find(p => p.id === draft.humanPlayerId);
  if (!human) return null;

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-2">Your Picks ({human.pickedCards.length})</h3>
      <div className="grid grid-cols-8 gap-1">
        {human.pickedCards.map((card, index) => (
          <div key={card.instanceId || `${card.id}-${index}`} className="text-xs border rounded p-1">
            <div className="font-semibold truncate">{card.name}</div>
            <div className="text-gray-600">{card.manaCost}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftResults() {
  const draft = useStore(draftStore);
  if (!draft) return null;

  const human = draft.players.find(p => p.id === draft.humanPlayerId);
  if (!human) return null;

  return (
    <div>
      <h2>Your Final Deck ({human.pickedCards.length} cards)</h2>
      <div className="grid grid-cols-6 gap-2 mt-4">
        {human.pickedCards.map((card, index) => (
          <div key={card.instanceId || `${card.id}-${index}`} className="border rounded p-2">
            <div className="font-semibold text-sm">{card.name}</div>
            <div className="text-xs text-gray-600">{card.manaCost}</div>
          </div>
        ))}
      </div>
      
      <button 
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => draftActions.reset()}
      >
        New Draft
      </button>
    </div>
  );
}

// Development helper
export function DraftDebug() {
  const draft = useStore(draftStore);
  
  if (!draft) return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs">
      No draft loaded
    </div>
  );

  const human = draft.players.find(p => p.isHuman);
  const humanPicks = human?.pickedCards.length || 0;
  const humanPackSize = human?.currentPack?.cards.length || 0;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded text-xs max-w-xs space-y-1">
      <div className="font-bold">Draft Debug</div>
      <div>Status: {draft.status}</div>
      <div>Round {draft.round}, Pick {draft.pick}</div>
      <div>Direction: {draft.direction}</div>
      <div>---</div>
      <div>Human picks made: {humanPicks}</div>
      <div>Current pack size: {humanPackSize}</div>
      <div>---</div>
      <div>Expected behavior:</div>
      <div>• Pick 1 → Pick 2 (not Pick 9)</div>
      <div>• 15 picks per round</div>
      <div>• 3 rounds total</div>
    </div>
  );
}