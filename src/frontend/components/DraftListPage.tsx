/** @jsxImportSource react */
/**
 * Draft List Page Component
 * 
 * Shows list of saved drafts with management actions.
 * Purely presentational component using draft persistence hooks.
 */

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useDraftListManager } from '../hooks/useDraftPersistence';
import LoadingScreen from './LoadingScreen';
import ErrorScreen from './ErrorScreen';

export interface DraftListPageProps {
  onNavigateHome: () => void;
  onNavigateToNewDraft: () => void;
  onNavigateToDraft: (draftId: string, round?: number, pick?: number) => void;
}

export const DraftListPage: React.FC<DraftListPageProps> = ({
  onNavigateHome,
  onNavigateToNewDraft,
  onNavigateToDraft
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const {
    drafts,
    loadDrafts,
    deleteDraft,
    clearAllDrafts,
    getDraftSummary
  } = useDraftListManager();

  // Load drafts on mount
  useEffect(() => {
    const loadDraftList = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadDrafts();
      } catch (err) {
        console.error('Failed to load drafts:', err);
        setError('Failed to load saved drafts');
      } finally {
        setIsLoading(false);
      }
    };

    loadDraftList();
  }, [loadDrafts]);

  // Handle draft deletion
  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      await deleteDraft(draftId);
      await loadDrafts(); // Reload the list
    } catch (err) {
      console.error('Failed to delete draft:', err);
      setError('Failed to delete draft');
    }
  };

  // Handle clear all drafts
  const handleClearAllDrafts = async () => {
    if (!confirm('Are you sure you want to delete ALL saved drafts? This cannot be undone.')) {
      return;
    }

    try {
      await clearAllDrafts();
      await loadDrafts(); // Reload the list
    } catch (err) {
      console.error('Failed to clear all drafts:', err);
      setError('Failed to clear all drafts');
    }
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'complete': return 'bg-green-100 text-green-800';
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <LoadingScreen
        message="Loading saved drafts..."
        className="h-full"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorScreen
        error={error}
        onRetry={async () => {
          setError(null);
          try {
            await loadDrafts();
          } catch (err) {
            setError('Failed to load saved drafts');
          }
        }}
        onNavigateHome={onNavigateHome}
        className="h-full"
      />
    );
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Saved Drafts</h1>
              <p className="text-gray-600">
                {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'} saved
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onNavigateHome}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors"
              >
                🏠 Home
              </button>
              
              <button
                onClick={onNavigateToNewDraft}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                🎲 New Draft
              </button>
              
              {drafts.length > 0 && (
                <button
                  onClick={handleClearAllDrafts}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                >
                  🗑️ Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {drafts.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Saved Drafts</h2>
            <p className="text-gray-500 mb-6">
              Start your first draft to see it appear here
            </p>
            
            <button
              onClick={onNavigateToNewDraft}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🎲 Start New Draft
            </button>
          </div>
        ) : (
          // Drafts list
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map((draft) => {
              const summary = getDraftSummary(draft.id);
              
              return (
                <div key={draft.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  {/* Draft Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {summary?.setCode || 'Unknown Set'}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(summary?.status || 'unknown')}`}>
                        {summary?.status || 'Unknown'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-1">
                      Draft ID: {draft.id.slice(0, 8)}...
                    </p>
                    
                    <p className="text-xs text-gray-400">
                      {formatDate(draft.updatedAt)}
                    </p>
                  </div>

                  {/* Draft Stats */}
                  <div className="p-4">
                    {summary && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress:</span>
                          <span className="font-medium">
                            Pack {summary.currentRound}, Pick {summary.currentPick}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cards Picked:</span>
                          <span className="font-medium">{summary.pickedCards}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Players:</span>
                          <span className="font-medium">{summary.playerCount}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{summary.pickedCards}/45</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min((summary.pickedCards / 45) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onNavigateToDraft(draft.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
                      >
                        {summary?.status === 'complete' ? 'View' : 'Continue'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 py-2 px-3 rounded text-sm transition-colors"
                        title="Delete draft"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftListPage;