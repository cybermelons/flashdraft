/**
 * Draft Header - Navigation and draft progress display
 * 
 * Shows current draft information, navigation controls,
 * and progress indicators.
 */

import React from 'react';
import { useStore } from '@nanostores/react';
import { 
  $currentDraft, 
  $draftProgress,
  $currentPosition
} from '@/stores/draftStore';
import { useDraftNavigation } from './SimpleDraftRouter';

interface DraftHeaderProps {
  className?: string;
}

/**
 * Header component for draft interface
 */
export function DraftHeader({ className = '' }: DraftHeaderProps) {
  const currentDraft = useStore($currentDraft);
  const draftProgress = useStore($draftProgress);
  const currentPosition = useStore($currentPosition);
  const navigation = useDraftNavigation();

  if (!currentDraft) return null;

  const handlePreviousPick = () => {
    if (!draftProgress) return;
    
    const { currentRound, currentPick } = draftProgress;
    let prevRound = currentRound;
    let prevPick = currentPick - 1;
    
    if (prevPick < 1) {
      prevRound = Math.max(1, currentRound - 1);
      prevPick = 15;
    }
    
    if (prevRound >= 1 && prevPick >= 1) {
      navigation.navigateToPosition(prevRound, prevPick);
    }
  };

  const handleNextPick = () => {
    if (!draftProgress) return;
    
    const { currentRound, currentPick } = draftProgress;
    let nextRound = currentRound;
    let nextPick = currentPick + 1;
    
    if (nextPick > 15) {
      nextRound = Math.min(3, currentRound + 1);
      nextPick = 1;
    }
    
    if (nextRound <= 3 && nextPick <= 15) {
      navigation.navigateToPosition(nextRound, nextPick);
    }
  };

  const canGoPrevious = () => {
    if (!draftProgress) return false;
    return !(draftProgress.currentRound === 1 && draftProgress.currentPick === 1);
  };

  const canGoNext = () => {
    if (!draftProgress) return false;
    return !(draftProgress.currentRound === 3 && draftProgress.currentPick === 15);
  };

  return (
    <header className={`bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Draft Info */}
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold text-white">
                {currentDraft.setCode} Draft
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="bg-slate-700/50 text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                  {currentDraft.seed.slice(-8)}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  currentDraft.status === 'active' 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : currentDraft.status === 'completed'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                }`}>
                  {currentDraft.status}
                </span>
              </div>
            </div>

            {/* Position Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePreviousPick}
                disabled={!canGoPrevious()}
                className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-slate-800/50 disabled:text-slate-500 text-white font-bold transition-colors disabled:cursor-not-allowed"
                title="Previous pick"
              >
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              
              <div className="text-center min-w-0">
                {draftProgress && (
                  <div className="text-white font-semibold">
                    <div className="text-lg">Round {draftProgress.currentRound}</div>
                    <div className="text-sm text-slate-300">Pick {draftProgress.currentPick}</div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleNextPick}
                disabled={!canGoNext()}
                className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-slate-800/50 disabled:text-slate-500 text-white font-bold transition-colors disabled:cursor-not-allowed"
                title="Next pick"
              >
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {draftProgress && (
            <div className="flex-1 max-w-md mx-8">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${draftProgress.progress * 100}%` }}
                  />
                </div>
                <div className="text-sm font-medium text-slate-300 min-w-0">
                  {Math.round(draftProgress.progress * 100)}%
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigation.navigateToOverview()}
              className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Overview
            </button>
            
            <button
              onClick={() => navigation.navigateToDraftList()}
              className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              All Drafts
            </button>
            
            {currentPosition && (
              <div className="hidden lg:block">
                <code className="bg-slate-900/50 text-slate-400 px-3 py-2 rounded-lg text-sm font-mono">
                  {currentPosition.urlPath}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}