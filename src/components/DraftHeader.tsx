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
    <header className={`draft-header ${className}`}>
      <div className="header-content">
        {/* Draft Info */}
        <div className="draft-info">
          <h1 className="draft-title">
            Draft: {currentDraft.seed}
          </h1>
          <div className="draft-meta">
            <span className="set-info">{currentDraft.setCode}</span>
            <span className="status-info">{currentDraft.status}</span>
          </div>
        </div>

        {/* Position Navigation */}
        <div className="position-nav">
          <button
            onClick={handlePreviousPick}
            disabled={!canGoPrevious()}
            className="btn btn-icon"
            title="Previous pick"
          >
            ←
          </button>
          
          <div className="position-display">
            {draftProgress && (
              <>
                <span className="round-info">
                  Round {draftProgress.currentRound}
                </span>
                <span className="pick-info">
                  Pick {draftProgress.currentPick}
                </span>
              </>
            )}
          </div>
          
          <button
            onClick={handleNextPick}
            disabled={!canGoNext()}
            className="btn btn-icon"
            title="Next pick"
          >
            →
          </button>
        </div>

        {/* Progress Bar */}
        {draftProgress && (
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${draftProgress.progress * 100}%` }}
              />
            </div>
            <div className="progress-text">
              {Math.round(draftProgress.progress * 100)}% Complete
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="header-actions">
          <button
            onClick={() => navigation.navigateToOverview()}
            className="btn btn-secondary"
          >
            Overview
          </button>
          
          <button
            onClick={() => navigation.navigateToDraftList()}
            className="btn btn-secondary"
          >
            All Drafts
          </button>
          
          {currentPosition && (
            <div className="url-info">
              <code className="current-url">
                {currentPosition.urlPath}
              </code>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}