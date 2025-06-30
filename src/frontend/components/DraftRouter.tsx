/** @jsxImportSource react */
/**
 * FlashDraft - Draft Router Component
 * 
 * Routes between different draft views based on URL structure.
 */

import * as React from 'react';
import { useDraftStore } from '../../stores/draftStore';
import { loadDraftState, getCurrentDraftId } from '../../shared/utils/draftPersistence';
import { clientPackGenerator, generateDraftSession } from '../utils/clientPackGenerator';
import type { MTGSetData } from '../../shared/types/card';
import DraftOverview from './DraftOverview';
import DraftInterface from './DraftInterface';
import DraftApp from './DraftApp';

export interface DraftRouterProps {
  routeType: string;
  draftId?: string | null;
  round?: number | null;
  pick?: number | null;
}

export const DraftRouter: React.FC<DraftRouterProps> = ({
  routeType,
  draftId,
  round,
  pick,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { loadDraft, loadDraftWithData, navigateToPosition, draft_started, draft_id, set_code } = useDraftStore();

  React.useEffect(() => {
    initializeRoute();
  }, [routeType, draftId, round, pick]);

  const loadDraftWithSetData = async (targetDraftId: string) => {
    try {
      console.log(`Loading draft: ${targetDraftId}`);
      console.log(`Current store state: draft_id=${draft_id}, set_code=${set_code}, draft_started=${draft_started}`);
      
      // Check if this draft is already loaded in the store
      if (draft_id === targetDraftId && set_code && draft_started) {
        console.log(`Draft ${targetDraftId} already loaded in store`);
        setLoading(false);
        return true;
      }

      // First, load the basic draft state to get the set code
      console.log(`Attempting to load draft ${targetDraftId} from localStorage`);
      const persistedState = loadDraftState(targetDraftId);
      console.log(`Persisted state result:`, persistedState ? 'found' : 'not found');
      
      if (!persistedState) {
        setError(`Draft not found: ${targetDraftId}`);
        setLoading(false);
        return false;
      }

      // Load the set data from API
      const response = await fetch(`/api/sets/${persistedState.set_code}`);
      if (!response.ok) {
        setError(`Failed to load set data for ${persistedState.set_code}`);
        setLoading(false);
        return false;
      }
      
      const setData: MTGSetData = await response.json();
      
      // Initialize pack generator
      clientPackGenerator.initialize(setData);
      
      // Regenerate all draft packs with same structure
      const draftPacks = generateDraftSession(persistedState.set_code, 8, 3);
      
      // Load the draft with set data and packs
      const success = loadDraftWithData(targetDraftId, setData, draftPacks);
      
      if (!success) {
        setError('Failed to restore draft state');
      }
      
      setLoading(false);
      return success;
    } catch (error) {
      console.error('Failed to load draft with set data:', error);
      setError('Failed to load draft');
      setLoading(false);
      return false;
    }
  };

  const initializeRoute = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (routeType) {
        case 'overview':
          // Show draft overview
          setLoading(false);
          break;

        case 'draft':
          if (draftId === 'new') {
            // Show draft setup for new draft
            setLoading(false);
          } else if (draftId) {
            // Load specific draft
            await loadDraftWithSetData(draftId);
          } else {
            // Load current draft or show overview
            const currentId = getCurrentDraftId();
            if (currentId) {
              await loadDraftWithSetData(currentId);
            } else {
              setLoading(false);
            }
          }
          break;

        case 'position':
          if (draftId && round && pick) {
            // Load draft and navigate to specific position
            const loadSuccess = await loadDraftWithSetData(draftId);
            if (loadSuccess) {
              const navSuccess = navigateToPosition(round, pick);
              if (!navSuccess) {
                setError(`Invalid position: Pack ${round}, Pick ${pick}`);
              }
            }
          } else {
            setLoading(false);
          }
          break;

        default:
          setError('Invalid route');
          setLoading(false);
      }
    } catch (error) {
      console.error('Route initialization error:', error);
      setError('Failed to initialize route');
      setLoading(false);
    }
  };

  const handleStartNewDraft = () => {
    // Navigate to draft setup
    window.location.href = '/draft/new';
  };

  const handleError = () => {
    // Navigate back to overview on error
    window.location.href = '/draft';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading draft...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={handleError}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Back to Overview
            </button>
            <button
              onClick={handleStartNewDraft}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Start New Draft
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Route to appropriate component
  switch (routeType) {
    case 'overview':
      return <DraftOverview />;

    case 'draft':
    case 'position':
      if (draftId === 'new' || (!draft_started && !draft_id)) {
        // Show draft setup for new draft or if no active draft
        return <DraftApp />;
      } else if (draft_started && draft_id) {
        return <DraftInterface />;
      } else {
        // Invalid state - redirect to overview
        window.location.href = '/draft';
        return null;
      }

    default:
      return <DraftOverview />;
  }
};

export default DraftRouter;
