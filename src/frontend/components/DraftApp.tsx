/**
 * FlashDraft - Main Draft Application Component
 * 
 * Root React component that initializes and manages the complete
 * draft experience, including setup, draft flow, and data loading.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useDraftStore } from '../stores/draftStore.js';
import DraftInterface from './DraftInterface.js';
import { clientPackGenerator, generateDraftSession } from '../utils/clientPackGenerator.js';
import type { MTGSetData } from '../../shared/types/card.js';

interface AppState {
  loading: boolean;
  error: string | null;
  availableSets: string[];
  selectedSet: string;
  setupComplete: boolean;
}

const DEMO_SETS = ['FIN', 'DTK']; // Sets we've downloaded

export const DraftApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    loading: true,
    error: null,
    availableSets: [],
    selectedSet: '',
    setupComplete: false,
  });

  const {
    initializeDraft,
    startDraft,
    setActivePacks,
    draft_started,
    draft_completed,
    players,
  } = useDraftStore();

  // Load available sets on mount
  useEffect(() => {
    async function loadAvailableSets() {
      try {
        setAppState(prev => ({ ...prev, loading: true, error: null }));
        
        // Fetch available sets from API
        const response = await fetch('/api/sets');
        if (!response.ok) {
          throw new Error('Failed to fetch available sets');
        }
        
        const data = await response.json();
        const sets = data.sets || DEMO_SETS;
        
        setAppState(prev => ({
          ...prev,
          loading: false,
          availableSets: sets,
          selectedSet: sets[0] || '',
        }));
      } catch (error) {
        console.error('Failed to load available sets:', error);
        // Fallback to demo sets
        setAppState(prev => ({
          ...prev,
          loading: false,
          availableSets: DEMO_SETS,
          selectedSet: DEMO_SETS[0] || '',
          error: null, // Don't show error for fallback
        }));
      }
    }

    loadAvailableSets();
  }, []);

  // Initialize draft with selected set
  const handleSetupDraft = useCallback(async (setCode: string) => {
    try {
      setAppState(prev => ({ ...prev, loading: true, error: null }));

      console.log(`Loading set data for ${setCode}...`);
      const response = await fetch(`/api/sets/${setCode}`);
      if (!response.ok) {
        throw new Error(`Failed to load set data for ${setCode}`);
      }
      
      const setData = await response.json();
      
      console.log(`Initializing pack generator for ${setCode}...`);
      clientPackGenerator.initialize(setData);
      
      console.log(`Setting up draft with ${setData.total_cards} cards...`);
      initializeDraft(setCode, setData, 8);
      
      setAppState(prev => ({
        ...prev,
        loading: false,
        selectedSet: setCode,
        setupComplete: true,
      }));
      
      console.log('Draft setup complete!');
    } catch (error) {
      console.error('Failed to setup draft:', error);
      setAppState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to setup draft',
      }));
    }
  }, [initializeDraft]);

  // Start the actual draft
  const handleStartDraft = useCallback(async () => {
    try {
      if (!appState.selectedSet) {
        throw new Error('No set selected');
      }

      setAppState(prev => ({ ...prev, loading: true, error: null }));

      console.log('Generating draft packs...');
      const draftPacks = generateDraftSession(appState.selectedSet, 8, 3);
      
      // Set initial packs for round 1
      const round1Packs = draftPacks.map(playerPacks => playerPacks[0]);
      setActivePacks(round1Packs);
      
      console.log('Starting draft...');
      startDraft();
      
      setAppState(prev => ({ ...prev, loading: false }));
      
      console.log('Draft started successfully!');
    } catch (error) {
      console.error('Failed to start draft:', error);
      setAppState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to start draft',
      }));
    }
  }, [appState.selectedSet, setActivePacks, startDraft]);

  // Handle set selection change
  const handleSetChange = useCallback((setCode: string) => {
    setAppState(prev => ({ ...prev, selectedSet: setCode, setupComplete: false }));
  }, []);

  // Retry on error
  const handleRetry = useCallback(() => {
    setAppState(prev => ({ ...prev, error: null, loading: false }));
  }, []);

  // Loading state
  if (appState.loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {!appState.setupComplete ? 'Loading Sets...' :
             !draft_started ? 'Setting up Draft...' :
             'Generating Packs...'}
          </h2>
          <p className="text-gray-600">
            Please wait while we prepare your draft experience
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (appState.error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Draft Error</h2>
          <p className="text-gray-600 mb-4">{appState.error}</p>
          <div className="space-x-2">
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Setup screen (choose set and start draft)
  if (!appState.setupComplete || !draft_started) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">FlashDraft</h1>
            <p className="text-gray-600">MTG Draft Simulator & Learning Platform</p>
          </div>

          {!appState.setupComplete ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Choose a Set</h2>
              
              <div className="space-y-3 mb-6">
                {appState.availableSets.map(setCode => (
                  <button
                    key={setCode}
                    onClick={() => handleSetupDraft(setCode)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      appState.selectedSet === setCode
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{setCode}</div>
                    <div className="text-sm text-gray-600">
                      {setCode === 'FIN' ? 'Final Fantasy' :
                       setCode === 'DTK' ? 'Dragons of Tarkir' :
                       'MTG Set'}
                    </div>
                  </button>
                ))}
              </div>

              {appState.availableSets.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p className="mb-2">No sets available</p>
                  <p className="text-sm">
                    Run the data download script to add sets
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Draft Setup Complete
              </h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-600 mb-2">Set:</div>
                <div className="font-medium text-gray-900 mb-3">{appState.selectedSet}</div>
                
                <div className="text-sm text-gray-600 mb-2">Players:</div>
                <div className="space-y-1">
                  {players.map((player, index) => (
                    <div key={player.id} className="flex justify-between text-sm">
                      <span>{player.name}</span>
                      <span className={player.is_human ? 'text-blue-600' : 'text-gray-500'}>
                        {player.is_human ? 'You' : 'Bot'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartDraft}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Draft
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Practice MTG drafts with realistic AI opponents
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main draft interface
  return <DraftInterface className="h-full" />;
};

export default DraftApp;