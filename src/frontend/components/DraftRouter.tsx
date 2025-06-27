/**
 * FlashDraft - Draft Router Component
 * 
 * Routes between different draft views based on URL structure.
 */

import React, { useState, useEffect } from 'react';
import { useDraftStore } from '../stores/draftStore.js';
import { loadDraftState, getCurrentDraftId } from '../../shared/utils/draftPersistence.js';
import DraftOverview from './DraftOverview.js';
import DraftInterface from './DraftInterface.js';
import DraftApp from './DraftApp.js';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loadDraft, navigateToPosition, draft_started, draft_id } = useDraftStore();

  useEffect(() => {
    initializeRoute();
  }, [routeType, draftId, round, pick]);

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
            const success = loadDraft(draftId);
            if (!success) {
              setError(`Draft not found: ${draftId}`);
            }
          } else {
            // Load current draft or show overview
            const currentId = getCurrentDraftId();
            if (currentId) {
              const success = loadDraft(currentId);
              if (!success) {
                setError('Failed to load current draft');
              }
            }
          }
          setLoading(false);
          break;

        case 'position':
          if (draftId && round && pick) {
            // Load draft and navigate to specific position
            const loadSuccess = loadDraft(draftId);
            if (loadSuccess) {
              const navSuccess = navigateToPosition(round, pick);
              if (!navSuccess) {
                setError(`Invalid position: Pack ${round}, Pick ${pick}`);
              }
            } else {
              setError(`Draft not found: ${draftId}`);
            }
          }
          setLoading(false);
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