/**
 * FlashDraft - Draft Overview Component
 * 
 * Shows list of saved drafts and options to create/resume drafts.
 */

import React, { useState, useEffect } from 'react';
import { getDraftList, deleteDraft, updateDraftTitle, type PersistedDraft } from '../../shared/utils/draftPersistence';

export interface DraftOverviewProps {
  className?: string;
}

const DraftOverview: React.FC<DraftOverviewProps> = ({ className = '' }) => {
  const [drafts, setDrafts] = useState<PersistedDraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = () => {
    setLoading(true);
    try {
      const draftList = getDraftList();
      setDrafts(draftList);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = (draftId: string) => {
    if (confirm('Are you sure you want to delete this draft?')) {
      try {
        deleteDraft(draftId);
        loadDrafts(); // Reload the list
      } catch (error) {
        console.error('Failed to delete draft:', error);
        alert('Failed to delete draft');
      }
    }
  };

  const handleStartNewDraft = () => {
    window.location.href = '/draft/new';
  };

  const handleResumeDraft = (draftId: string) => {
    window.location.href = `/draft/${draftId}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProgressText = (draft: PersistedDraft) => {
    if (draft.completed) {
      return 'Completed';
    }
    return `Pack ${draft.round}, Pick ${draft.pick}`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FlashDraft</h1>
            <p className="text-gray-600 mt-2">MTG Draft Simulator & Playtesting Platform</p>
          </div>
          
          <button
            onClick={handleStartNewDraft}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Start New Draft
          </button>
        </div>

        {/* Drafts List */}
        {drafts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md mx-auto">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No drafts yet</h3>
              <p className="text-gray-600 mb-6">Start your first draft to practice Limited!</p>
              <button
                onClick={handleStartNewDraft}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Create Your First Draft
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Your Drafts ({drafts.length})</h2>
              <button
                onClick={loadDrafts}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {draft.title || `${draft.set_code} Draft`}
                      </h3>
                      <p className="text-sm text-gray-600">{getProgressText(draft)}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      draft.completed 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {draft.set_code}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span>Picks made:</span>
                      <span className="font-medium">{draft.human_player_picks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last played:</span>
                      <span>{formatDate(draft.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleResumeDraft(draft.id)}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        draft.completed
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {draft.completed ? 'View Draft' : 'Resume'}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Delete draft"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            FlashDraft helps you practice MTG Limited by drafting against AI opponents
            trained on real data, then playtesting your deck immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DraftOverview;