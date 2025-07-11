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
        return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-6"></div>
        <p className="text-slate-300 text-lg">Loading drafts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20 text-center">
        <div className="text-red-400 mb-6">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-red-400 mb-3">Error Loading Drafts</h3>
        <p className="text-slate-300 mb-6">{error}</p>
        <button 
          onClick={loadDrafts}
          className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50 text-center">
        <div className="text-slate-400 mb-6">
          <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">No Drafts Yet</h3>
        <p className="text-slate-300 mb-8 text-lg">Start your first draft to begin mastering MTG!</p>
        <a 
          href="/draft/new"
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
        >
          Start Your First Draft
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active/Recent Drafts */}
      <div className="grid gap-4">
        {drafts.slice(0, 10).map((draft) => (
          <div
            key={draft.id}
            onClick={() => handleResumeDraft(draft.id)}
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="font-bold text-white text-lg">
                    {draft.setCode} Draft
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(draft.status)}`}>
                    {draft.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-slate-300 mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    Round {draft.currentRound}, Pick {draft.currentPick}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                    {draft.humanDeckSize} cards
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {formatDate(draft.createdAt)}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-700/50 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${draft.progress * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-300 min-w-0">
                    {Math.round(draft.progress * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 ml-6">
                <button
                  onClick={(e) => { e.stopPropagation(); handleResumeDraft(draft.id); }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold transition-colors group-hover:scale-105"
                >
                  {draft.status === 'completed' ? 'Review' : 'Resume'}
                </button>
                
                <button
                  onClick={(e) => handleDeleteDraft(draft.id, e)}
                  className="text-slate-400 hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-red-500/10"
                  title="Delete draft"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="text-center pt-6">
          <a 
            href="/draft"
            className="text-blue-400 hover:text-blue-300 font-semibold text-lg transition-colors"
          >
            View All {drafts.length} Drafts →
          </a>
        </div>
      )}
    </div>
  );
}