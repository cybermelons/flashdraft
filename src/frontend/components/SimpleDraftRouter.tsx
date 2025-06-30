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
import { DraftInterface } from './DraftInterface';
import { DraftSetup } from './DraftSetup';

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
          // URL-based navigation: check if current state matches
          const currentDraft = draftStore.get();
          const isSameDraft = currentDraft?.seed === urlParams.seed;
          const isCurrentPosition = currentDraft?.round === urlParams.round && currentDraft?.pick === urlParams.pick;
          const hasLiveState = currentDraft?.status === 'active';
          
          console.log(`[SimpleDraftRouter] URL check - Current: ${currentDraft?.seed} p${currentDraft?.round}p${currentDraft?.pick}, URL: ${urlParams.seed} p${urlParams.round}p${urlParams.pick}`);
          console.log(`[SimpleDraftRouter] Same draft: ${isSameDraft}, Same position: ${isCurrentPosition}, Has live state: ${hasLiveState}`);
          
          if (isSameDraft && isCurrentPosition && hasLiveState) {
            // We're already at this position with live state - NEVER replay
            console.log(`[SimpleDraftRouter] Already at position ${urlParams.seed} p${urlParams.round}p${urlParams.pick} with live state - using current state`);
          } else {
            // Different position or no live state - load via replay
            console.log(`[SimpleDraftRouter] Loading position from URL: ${urlParams.seed} p${urlParams.round}p${urlParams.pick}`);
            await draftActions.loadPosition(urlParams.seed, urlParams.round, urlParams.pick);
          }
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
    return <DraftSetup />;
  }

  if (draft) {
    // Active draft - show draft interface
    return <DraftInterface draft={draft} />;
  }

  // No draft loaded - show overview
  return <DraftOverviewView />;
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