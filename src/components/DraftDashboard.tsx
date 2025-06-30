/**
 * Draft Dashboard - Home page draft listing and management
 * 
 * Shows saved drafts, allows resuming drafts, and provides
 * quick access to start new drafts.
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { draftEngine } from '@/stores/draftStore';
import type { DraftState } from '@/lib/engine/DraftEngine';

interface DraftSummary {
  id: string;
  status: string;
  setCode: string;
  createdAt: string;
  currentRound: number;
  currentPick: number;
  progress: number;
  humanDeckSize: number;
}

export function DraftDashboard() {
  // Use the exported draftEngine instance directly
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!draftEngine) {
        setDrafts([]);
        setLoading(false);
        return;
      }

      // Get all draft IDs from storage
      const storage = draftEngine.getStorage();
      if (!storage?.listDrafts) {
        setDrafts([]);
        setLoading(false);
        return;
      }

      const draftSummaries = await storage.listDrafts();
      
      // Convert to our summary format
      const formattedDrafts: DraftSummary[] = draftSummaries.map(summary => ({
        id: summary.draftId,
        status: summary.status,
        setCode: summary.setCode || 'Unknown',
        createdAt: summary.createdAt,
        currentRound: summary.currentRound,
        currentPick: summary.currentPick,
        progress: summary.progress,
        humanDeckSize: summary.humanDeckSize
      }));

      // Sort by most recent first
      formattedDrafts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setDrafts(formattedDrafts);
    } catch (err) {
      console.error('Failed to load drafts:', err);
      setError('Failed to load drafts. Local storage may be unavailable.');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'drafting':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResumeDraft = (draftId: string) => {
    window.location.href = `/draft/${draftId}`;
  };

  const handleDeleteDraft = async (draftId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      const storage = draftEngine.getStorage();
      if (storage?.deleteDraft) {
        await storage.deleteDraft(draftId);
        await loadDrafts(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to delete draft:', err);
      alert('Failed to delete draft. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading drafts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <p className="text-red-600 font-medium mb-2">Error Loading Drafts</p>
        <p className="text-gray-600 text-sm mb-4">{error}</p>
        <button 
          onClick={loadDrafts}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Drafts Yet</h3>
        <p className="text-gray-600 mb-6">Start your first draft to begin practicing!</p>
        <a 
          href="/draft/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Start Your First Draft
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active/Recent Drafts */}
      <div className="grid gap-4">
        {drafts.slice(0, 10).map((draft) => (
          <div
            key={draft.id}
            onClick={() => handleResumeDraft(draft.id)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium text-gray-900">
                    {draft.setCode} Draft
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(draft.status)}`}>
                    {draft.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Round {draft.currentRound}, Pick {draft.currentPick}</span>
                  <span>{draft.humanDeckSize} cards</span>
                  <span>{Math.round(draft.progress * 100)}% complete</span>
                  <span>{formatDate(draft.createdAt)}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${draft.progress * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleResumeDraft(draft.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  {draft.status === 'completed' ? 'Review' : 'Resume'}
                </button>
                
                <button
                  onClick={(e) => handleDeleteDraft(draft.id, e)}
                  className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                  title="Delete draft"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show All Drafts Link */}
      {drafts.length > 10 && (
        <div className="text-center pt-4">
          <a 
            href="/draft"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View All {drafts.length} Drafts →
          </a>
        </div>
      )}
    </div>
  );
}