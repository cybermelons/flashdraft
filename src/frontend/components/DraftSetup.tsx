/**
 * Draft Setup Component - Simple New Draft Creation
 * 
 * Handles new draft creation with minimal logic.
 * Just collects user input and calls draftActions.
 */

import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { draftActions, draftLoadingStore } from '../../stores/simpleDraftStore';

export function DraftSetup() {
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