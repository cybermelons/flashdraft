/**
 * State Machine Draft Router
 * 
 * Simple router using nanostore-based draft engine.
 * Routes between draft setup, active draft, and results.
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { draftStore, draftActions } from '../../stores/draftStore';
import { StateMachineDraft } from './StateMachineDraft';

export interface StateMachineDraftRouterProps {
  routeType: string;
  draftId?: string | null;
  round?: number | null;
  pick?: number | null;
}

export function StateMachineDraftRouter({ 
  routeType, 
  draftId, 
  round, 
  pick 
}: StateMachineDraftRouterProps) {
  const draft = useStore(draftStore);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeRoute();
  }, [routeType, draftId]);

  const initializeRoute = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (routeType) {
        case 'overview':
          // Show draft list/overview
          setLoading(false);
          break;

        case 'draft':
          if (draftId === 'new' || !draftId) {
            // Create new draft
            await createNewDraft();
          } else {
            // Load existing draft (if we had persistence)
            setError('Loading existing drafts not implemented yet');
          }
          setLoading(false);
          break;

        case 'position':
          // Navigate to specific position (future feature)
          setError('Position navigation not implemented yet');
          setLoading(false);
          break;

        default:
          setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const createNewDraft = async () => {
    try {
      // Load set data for new draft
      const response = await fetch('/api/sets/DTK'); // Default to DTK for now
      if (!response.ok) {
        throw new Error('Failed to load set data');
      }
      
      const setData = await response.json();
      
      // Create and start new draft
      const newDraft = draftActions.create(setData);
      draftActions.start();
      
      console.log('[DraftRouter] Created new draft:', newDraft.id);
    } catch (err) {
      throw new Error(`Failed to create draft: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStartNewDraft = () => {
    window.location.href = '/draft/new';
  };

  const handleBackToOverview = () => {
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
              onClick={handleBackToOverview}
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

  // Route to appropriate view
  switch (routeType) {
    case 'overview':
      return <DraftOverview />;

    case 'draft':
    case 'position':
      if (draft) {
        return <StateMachineDraft />;
      } else {
        return <DraftSetup />;
      }

    default:
      return <DraftOverview />;
  }
}

// Simple draft overview component
function DraftOverview() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">FlashDraft</h1>
        <p className="text-gray-600 mb-8">Practice Magic: The Gathering drafts with AI opponents</p>
        
        <div className="space-y-4">
          <button
            onClick={() => window.location.href = '/draft/new'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-semibold"
          >
            Start New Draft
          </button>
          
          <div className="text-sm text-gray-500">
            <p>• 8-player draft simulation</p>
            <p>• AI opponents trained on real data</p>
            <p>• Instant pack passing and deck building</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple draft setup component
function DraftSetup() {
  const [sets] = useState([
    { code: 'DTK', name: 'Dragons of Tarkir' },
    { code: 'FIN', name: 'Final Fantasy' },
  ]);

  const handleSetSelect = async (setCode: string) => {
    try {
      const response = await fetch(`/api/sets/${setCode}`);
      if (!response.ok) {
        throw new Error('Failed to load set data');
      }
      
      const setData = await response.json();
      draftActions.create(setData);
      draftActions.start();
    } catch (error) {
      console.error('Failed to start draft:', error);
      alert('Failed to start draft. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Choose a Set</h1>
        
        <div className="grid gap-4">
          {sets.map(set => (
            <button
              key={set.code}
              onClick={() => handleSetSelect(set.code)}
              className="p-6 border rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <h3 className="font-semibold text-lg">{set.name}</h3>
              <p className="text-gray-600 text-sm">{set.code}</p>
            </button>
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.href = '/draft'}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Overview
          </button>
        </div>
      </div>
    </div>
  );
}

export default StateMachineDraftRouter;