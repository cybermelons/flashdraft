/** @jsxImportSource react */
/**
 * Draft Setup Screen Component
 * 
 * Handles draft configuration and initialization using the new setup hooks.
 * Purely presentational component that receives setup state and actions as props.
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import type { UseDraftSetupReturn } from '../hooks/useDraftSetup';

export interface DraftSetupScreenProps {
  setup: UseDraftSetupReturn;
  onStartDraft: () => Promise<boolean>;
  loading: boolean;
  className?: string;
}

export const DraftSetupScreen: React.FC<DraftSetupScreenProps> = ({
  setup,
  onStartDraft,
  loading,
  className = ''
}) => {
  const [isStarting, setIsStarting] = useState(false);

  const handleStartDraft = useCallback(async () => {
    setIsStarting(true);
    try {
      const success = await onStartDraft();
      if (!success) {
        // Error handling is done by the parent component
        console.error('Failed to start draft');
      }
    } finally {
      setIsStarting(false);
    }
  }, [onStartDraft]);

  const handleSetChange = useCallback((setCode: string) => {
    setup.setSelectedSet(setCode);
  }, [setup]);

  const handlePlayerCountChange = useCallback((count: number) => {
    setup.setPlayerCount(count);
  }, [setup]);

  const isLoading = loading || isStarting || setup.loadingSet;

  return (
    <div className={`h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FlashDraft</h1>
          <p className="text-gray-600">MTG Draft Simulator & Learning Platform</p>
        </div>

        {/* Set Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Choose a Set</h2>
          
          <div className="space-y-3">
            {setup.availableSets.map(setInfo => (
              <button
                key={setInfo.code}
                onClick={() => handleSetChange(setInfo.code)}
                disabled={isLoading}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  setup.config.setCode === setInfo.code
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium text-gray-900">{setInfo.code}</div>
                <div className="text-sm text-gray-600">{setInfo.name}</div>
                {setInfo.totalCards && (
                  <div className="text-xs text-gray-500 mt-1">
                    {setInfo.totalCards} cards
                  </div>
                )}
              </button>
            ))}
          </div>

          {setup.availableSets.length === 0 && !setup.loadingAvailableSets && (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-2">No sets available</p>
              <p className="text-sm">
                Run the data download script to add sets
              </p>
            </div>
          )}

          {setup.loadingAvailableSets && (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading available sets...</p>
            </div>
          )}
        </div>

        {/* Player Configuration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Players</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Players
              </label>
              <select
                value={setup.config.playerCount}
                onChange={(e) => handlePlayerCountChange(Number(e.target.value))}
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[4, 6, 8].map(count => (
                  <option key={count} value={count}>
                    {count} Players
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">Draft Configuration:</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>You:</span>
                  <span className="text-blue-600 font-medium">Human Player</span>
                </div>
                <div className="flex justify-between">
                  <span>Bots:</span>
                  <span className="text-gray-600">{setup.config.playerCount - 1} AI Players</span>
                </div>
                <div className="flex justify-between">
                  <span>Packs:</span>
                  <span className="text-gray-600">3 per player</span>
                </div>
                <div className="flex justify-between">
                  <span>Cards per pack:</span>
                  <span className="text-gray-600">15 cards</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {setup.setError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 text-sm">{setup.setError}</div>
          </div>
        )}

        {/* Start Draft Button */}
        <button
          onClick={handleStartDraft}
          disabled={!setup.isConfigValid || isLoading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            setup.isConfigValid && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isStarting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Starting Draft...
            </div>
          ) : (
            'Start Draft'
          )}
        </button>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Practice MTG drafts with realistic AI opponents
          </p>
        </div>
      </div>
    </div>
  );
};

export default DraftSetupScreen;