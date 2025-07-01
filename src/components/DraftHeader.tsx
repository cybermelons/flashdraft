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
  $currentPosition,
  $viewingRound,
  $viewingPick
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
  const viewingRound = useStore($viewingRound);
  const viewingPick = useStore($viewingPick);
  const navigation = useDraftNavigation();

  if (!currentDraft) return null;

  const getPreviousPosition = () => {
    let newRound = viewingRound;
    let newPick = viewingPick - 1;
    
    if (newPick < 1) {
      newRound = viewingRound - 1;
      newPick = 15;
    }
    
    return { round: newRound, pick: newPick };
  };

  const getNextPosition = () => {
    let newRound = viewingRound;
    let newPick = viewingPick + 1;
    
    if (newPick > 15) {
      newRound = viewingRound + 1;
      newPick = 1;
    }
    
    return { round: newRound, pick: newPick };
  };

  const canGoPrevious = () => {
    return !(viewingRound === 1 && viewingPick === 1);
  };

  const canGoNext = () => {
    if (!draftProgress) return false;
    if (!currentDraft) return false;
    
    // Can navigate forward if:
    // 1. We're viewing a position before the current engine position
    // 2. We're not at the absolute end (round 3, pick 15)
    
    // Debug logging
    console.log('canGoNext check:', {
      viewingRound,
      viewingPick,
      engineRound: draftProgress.currentRound,
      enginePick: draftProgress.currentPick,
      humanDeckSize: currentDraft.playerDecks[currentDraft.humanPlayerIndex]?.length || 0,
      comparison: {
        roundLess: viewingRound < draftProgress.currentRound,
        pickLess: viewingRound === draftProgress.currentRound && viewingPick < draftProgress.currentPick
      }
    });
    
    // Check if we're before the engine position
    if (viewingRound < draftProgress.currentRound) return true;
    if (viewingRound === draftProgress.currentRound && viewingPick < draftProgress.currentPick) return true;
    
    // Special case: If we've made picks, we can navigate through our pick history
    // even if we're at the current engine position
    const humanDeckSize = currentDraft.playerDecks[currentDraft.humanPlayerIndex]?.length || 0;
    const totalPicksMade = (viewingRound - 1) * 15 + viewingPick - 1;
    
    // If we're viewing a position where we've already made a pick, we can go forward
    if (totalPicksMade < humanDeckSize) {
      console.log('Can go forward based on pick history:', { totalPicksMade, humanDeckSize });
      return true;
    }
    
    // If we're at or past engine position with no pick history, we can't go forward
    return false;
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
              {canGoPrevious() ? (
                <a
                  href={`/draft/${currentDraft.draftId}/p${getPreviousPosition().round}p${getPreviousPosition().pick}`}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white font-bold transition-colors flex items-center justify-center"
                  title="Previous pick"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </a>
              ) : (
                <span className="w-10 h-10 rounded-xl bg-slate-800/50 text-slate-500 font-bold flex items-center justify-center cursor-not-allowed">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </span>
              )}
              
              <div className="text-center min-w-0">
                <div className="text-white font-semibold">
                  <div className="text-lg">Round {viewingRound}</div>
                  <div className="text-sm text-slate-300">Pick {viewingPick}</div>
                </div>
              </div>
              
              {canGoNext() ? (
                <a
                  href={`/draft/${currentDraft.draftId}/p${getNextPosition().round}p${getNextPosition().pick}`}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white font-bold transition-colors flex items-center justify-center"
                  title="Next pick"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </a>
              ) : (
                <span className="w-10 h-10 rounded-xl bg-slate-800/50 text-slate-500 font-bold flex items-center justify-center cursor-not-allowed">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
              )}
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