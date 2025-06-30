/**
 * Simple Draft Router
 * 
 * Minimal routing component that parses URLs and loads appropriate draft state.
 * No complex logic - just URL parsing and state loading.
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { draftStore, draftActions, draftLoadingStore, draftErrorStore } from '../../stores/simpleDraftStore';
import { parseDraftUrl, isDraftPositionUrl, browserHistory } from '../../utils/navigation';

export interface SimpleDraftRouterProps {
  routeType: string;
  draftId?: string | null;
  round?: number | null;
  pick?: number | null;
}

export function SimpleDraftRouter({ routeType, draftId, round, pick }: SimpleDraftRouterProps) {
  const draft = useStore(draftStore);
  const loading = useStore(draftLoadingStore);
  const error = useStore(draftErrorStore);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeDraft = async () => {
      if (initialized) return;
      
      try {
        // Parse current URL to determine what to load
        const currentPath = browserHistory.getCurrentPath();
        const urlParams = parseDraftUrl(currentPath);
        
        if (urlParams) {
          // URL-based navigation: load specific position
          console.log(`[SimpleDraftRouter] Loading position from URL: ${urlParams.seed} p${urlParams.round}p${urlParams.pick}`);
          await draftActions.loadPosition(urlParams.seed, urlParams.round, urlParams.pick);
        } else if (routeType === 'draft' && draftId === 'new') {
          // New draft creation - show setup screen
          console.log(`[SimpleDraftRouter] New draft route - showing setup`);
          // Will be handled by setup component
        } else if (routeType === 'draft' && draftId) {
          // Load specific draft by ID
          console.log(`[SimpleDraftRouter] Loading draft: ${draftId}`);
          await draftActions.getCurrentState(draftId);
        } else if (routeType === 'position' && draftId && round && pick) {
          // Load specific position (legacy route params)
          console.log(`[SimpleDraftRouter] Loading position from params: ${draftId} p${round}p${pick}`);
          await draftActions.loadPosition(draftId, round, pick);
        } else {
          // Overview or invalid route
          console.log(`[SimpleDraftRouter] Overview route or invalid route: ${routeType}`);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('[SimpleDraftRouter] Failed to initialize:', error);
        setInitialized(true);
      }
    };

    initializeDraft();
  }, [routeType, draftId, round, pick, initialized]);

  // Loading state
  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading draft...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Draft Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => draftActions.clearError()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Route to appropriate component based on state
  if (routeType === 'draft' && draftId === 'new') {
    // New draft setup
    return <DraftSetupView />;
  }

  if (draft) {
    // Active draft - show draft interface
    return <DraftInterfaceView draft={draft} />;
  }

  // No draft loaded - show overview
  return <DraftOverviewView />;
}

/**
 * Draft Setup View
 * Handles new draft creation
 */
function DraftSetupView() {
  const [selectedSet, setSelectedSet] = useState('');
  const loading = useStore(draftLoadingStore);

  const handleCreateDraft = async () => {
    if (!selectedSet) return;
    
    try {
      await draftActions.createDraft(selectedSet);
      // Navigation handled automatically by draftActions.createDraft
    } catch (error) {
      console.error('Failed to create draft:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Create New Draft</h2>
        
        <div className="mb-6">
          <label htmlFor="set-select" className="block text-sm font-medium text-gray-700 mb-2">
            Choose a Set
          </label>
          <select
            id="set-select"
            value={selectedSet}
            onChange={(e) => setSelectedSet(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">Select a set...</option>
            <option value="DTK">Dragons of Tarkir</option>
            <option value="FFX">Final Fantasy</option>
            <option value="TEST">Test Set</option>
          </select>
        </div>
        
        <button
          onClick={handleCreateDraft}
          disabled={!selectedSet || loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Draft...' : 'Create Draft'}
        </button>
      </div>
    </div>
  );
}

/**
 * Draft Interface View
 * Main draft interface for active drafts
 */
function DraftInterfaceView({ draft }: { draft: any }) {
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
 */
function DraftNavigation({ draft }: { draft: any }) {
  // Import navigation utilities
  const { getPreviousLinkProps, getNextLinkProps } = require('../../utils/navigation');
  
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
 */
function CurrentPack({ draft }: { draft: any }) {
  const humanPlayer = draft.players.find((p: any) => p.isHuman);
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
      await draftActions.makeHumanPick(cardId);
      // Navigation handled automatically
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
 */
function PickedCards({ draft }: { draft: any }) {
  const humanPlayer = draft.players.find((p: any) => p.isHuman);
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

/**
 * Draft Overview View
 * Shows when no specific draft is loaded
 */
function DraftOverviewView() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-6">FlashDraft</h2>
        <p className="text-gray-600 mb-8">
          Practice Magic: The Gathering drafts with realistic AI opponents
        </p>
        
        <div className="space-x-4">
          <a
            href="/draft/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start New Draft
          </a>
          
          <a
            href="/drafts"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            View Past Drafts
          </a>
        </div>
      </div>
    </div>
  );
}