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
  $viewingPick,
  $isViewingCurrent,
  $currentPack
} from '@/stores/draftStore';
import { 
  $quickPickMode,
  uiActions as uiStoreActions
} from '@/stores/uiStore';
import { useDraftNavigation } from './SimpleDraftRouter';
import { HeaderButton, HeaderButtonGroup } from './HeaderButton';
import { NavigationButton } from './NavigationButton';

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
  const isViewingCurrent = useStore($isViewingCurrent);
  const currentPack = useStore($currentPack);
  const quickPickMode = useStore($quickPickMode);
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
    
    // For completed drafts, allow navigation up to the last pick
    if (currentDraft.status === 'completed') {
      // Can go next unless we're at the absolute end (round 3, pick 15)
      return !(viewingRound === 3 && viewingPick === 15);
    }
    
    // For active drafts, use the existing logic
    // Check if we're before the engine position
    if (viewingRound < draftProgress.currentRound) return true;
    if (viewingRound === draftProgress.currentRound && viewingPick < draftProgress.currentPick) return true;
    
    // Special case: If we've made picks, we can navigate through our pick history
    const humanDeckSize = currentDraft.playerDecks[currentDraft.humanPlayerIndex]?.length || 0;
    const totalPicksMade = (viewingRound - 1) * 15 + viewingPick - 1;
    
    // If we're viewing a position where we've already made a pick, we can go forward
    if (totalPicksMade < humanDeckSize) {
      return true;
    }
    
    // If we're at or past engine position with no pick history, we can't go forward
    return false;
  };

  return (
    <header className={`bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 ${className}`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
        {/* Mobile Layout - Stack vertically */}
        <div className="flex flex-col sm:hidden gap-2">
          {/* Top Row - Draft Info, Pack Info and Settings */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white truncate">
                  {currentDraft.setCode}
                </h1>
                {currentPack && (
                  <span className="bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                    Pack {currentPack.id} • {currentPack.cards.length} cards
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
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
            
            <HeaderButtonGroup>
              {/* Quick Pick Toggle */}
              {isViewingCurrent && currentDraft.status === 'active' && (
                <HeaderButton
                  onClick={() => uiStoreActions.toggleQuickPickMode()}
                  variant="icon"
                  active={quickPickMode}
                  title={quickPickMode ? 'Quick pick ON' : 'Quick pick OFF'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </HeaderButton>
              )}
              
            </HeaderButtonGroup>
          </div>
          
          {/* Bottom Row - Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <NavigationButton
                href={canGoPrevious() ? `/draft/${currentDraft.draftId}/p${getPreviousPosition().round}p${getPreviousPosition().pick}` : undefined}
                disabled={!canGoPrevious()}
                direction="prev"
                title="Previous pick"
              />
              
              <div className="text-center min-w-0 px-2">
                <div className="text-white font-semibold">
                  <div className="text-sm">Round {viewingRound}</div>
                  <div className="text-xs text-slate-300">
                    Pick {viewingPick}
                  </div>
                </div>
              </div>
              
              <NavigationButton
                href={canGoNext() ? `/draft/${currentDraft.draftId}/p${getNextPosition().round}p${getNextPosition().pick}` : undefined}
                disabled={!canGoNext()}
                direction="next"
                title="Next pick"
              />
            </div>
            
            <HeaderButton
              onClick={() => navigation.navigateToDraftList()}
              variant="secondary"
            >
              Drafts
            </HeaderButton>
          </div>
        </div>

        {/* Desktop/Tablet Layout - Keep existing */}
        <div className="hidden sm:flex items-center justify-between gap-2 sm:gap-4">
          {/* Draft Info - Responsive */}
          <div className="flex items-center gap-2 sm:gap-6 min-w-0">
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white">
                {currentDraft.setCode} Draft
                {currentPack && (
                  <span className="ml-3 bg-slate-700/50 text-slate-300 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                    Pack {currentPack.id} • {currentPack.cards.length} cards
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-1">
                <span className="bg-slate-700/50 text-slate-300 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                  {currentDraft.seed.slice(-8)}
                </span>
                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
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

            {/* Position Navigation - Always visible but smaller on mobile */}
            <div className="flex items-center gap-1 sm:gap-3">
              <NavigationButton
                href={canGoPrevious() ? `/draft/${currentDraft.draftId}/p${getPreviousPosition().round}p${getPreviousPosition().pick}` : undefined}
                disabled={!canGoPrevious()}
                direction="prev"
                title="Previous pick"
              />
              
              <div className="text-center min-w-0">
                <div className="text-white font-semibold">
                  <div className="text-sm sm:text-lg">Round {viewingRound}</div>
                  <div className="text-xs sm:text-sm text-slate-300">
                    Pick {viewingPick}
                    {!isViewingCurrent && (
                      <span className="text-yellow-400 text-[10px] sm:text-xs ml-1 hidden sm:inline">(history)</span>
                    )}
                  </div>
                </div>
              </div>
              
              <NavigationButton
                href={canGoNext() ? `/draft/${currentDraft.draftId}/p${getNextPosition().round}p${getNextPosition().pick}` : undefined}
                disabled={!canGoNext()}
                direction="next"
                title="Next pick"
              />
            </div>
          </div>

          {/* Progress Bar - Hidden on mobile */}
          {draftProgress && (
            <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${draftProgress.progress * 100}%` }}
                  />
                </div>
                <div className="text-sm font-medium text-slate-300 min-w-[35px]">
                  {Math.round(draftProgress.progress * 100)}%
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Responsive */}
          <HeaderButtonGroup>
            {/* Quick Pick Toggle - Desktop */}
            {isViewingCurrent && currentDraft.status === 'active' && (
              <HeaderButton
                onClick={() => uiStoreActions.toggleQuickPickMode()}
                variant={quickPickMode ? 'primary' : 'secondary'}
                active={quickPickMode}
                title={quickPickMode ? 'Quick pick: ON - Click to pick immediately' : 'Quick pick: OFF - Click to select, then confirm'}
              >
                <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span className="hidden lg:inline">Quick Pick</span>
              </HeaderButton>
            )}
            
            <HeaderButton
              onClick={() => navigation.navigateToOverview()}
              variant="secondary"
              className="hidden sm:inline-flex"
            >
              Overview
            </HeaderButton>
            
            
            
            {currentPosition && (
              <div className="hidden 2xl:block">
                <code className="bg-slate-900/50 text-slate-400 px-3 py-2 rounded-lg text-sm font-mono">
                  {currentPosition.urlPath}
                </code>
              </div>
            )}
          </HeaderButtonGroup>
        </div>
      </div>
    </header>
  );
}
