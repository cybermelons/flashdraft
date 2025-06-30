/**
 * Draft Interface - Main draft interface component
 * 
 * Renders the current draft state, pack display, and draft controls.
 * Integrates with SimpleDraftRouter for navigation and stores for state.
 */

import { useStore } from '@nanostores/react';
import { 
  $currentDraft, 
  $currentPack, 
  $humanDeck, 
  $draftProgress,
  $canPick,
  $isLoading,
  $error,
  draftActions,
  uiActions 
} from '@/stores/draftStore';
import { $isDarkMode } from '@/stores/uiStore';
import { SimpleDraftRouter, useDraftNavigation, type DraftRouteData } from './SimpleDraftRouter';
import { PackDisplay } from './PackDisplay';
import { DraftHeader } from './DraftHeader';
import { DraftSidebar } from './DraftSidebar';

interface DraftInterfaceProps {
  className?: string;
}

/**
 * Main draft interface that handles routing and state management
 */
export function DraftInterface({ className = '' }: DraftInterfaceProps) {
  const isDarkMode = useStore($isDarkMode);
  
  return (
    <div className={`draft-interface ${isDarkMode ? 'dark' : 'light'} ${className}`}>
      <SimpleDraftRouter>
        {(routeData) => <DraftInterfaceContent routeData={routeData} />}
      </SimpleDraftRouter>
    </div>
  );
}

/**
 * Draft interface content (receives route data from router)
 */
function DraftInterfaceContent({ routeData }: { routeData: DraftRouteData }) {
  const currentDraft = useStore($currentDraft);
  const currentPack = useStore($currentPack);
  const humanDeck = useStore($humanDeck);
  const draftProgress = useStore($draftProgress);
  const canPick = useStore($canPick);
  const isLoading = useStore($isLoading);
  const error = useStore($error);
  
  const navigation = useDraftNavigation();

  // Handle route errors
  if (!routeData.isValidRoute) {
    return (
      <div className="draft-interface-error">
        <div className="error-container">
          <h2>Invalid Draft URL</h2>
          <p>{routeData.routeError}</p>
          <button 
            onClick={() => navigation.navigateToDraftList()}
            className="btn btn-primary"
          >
            Back to Draft List
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="draft-interface-loading">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading draft...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="draft-interface-error">
        <div className="error-container">
          <h2>Draft Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button 
              onClick={() => uiActions.clearError()}
              className="btn btn-secondary"
            >
              Dismiss
            </button>
            <button 
              onClick={() => navigation.navigateToDraftList()}
              className="btn btn-primary"
            >
              Back to Draft List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No draft loaded
  if (!currentDraft) {
    return (
      <div className="draft-interface-empty">
        <div className="empty-container">
          <h2>No Draft Loaded</h2>
          <p>Select a draft to continue or create a new one.</p>
          <button 
            onClick={() => navigation.navigateToDraftList()}
            className="btn btn-primary"
          >
            Browse Drafts
          </button>
        </div>
      </div>
    );
  }

  // Draft completed
  if (currentDraft.status === 'completed') {
    return (
      <div className="draft-interface-completed">
        <DraftHeader />
        <div className="completed-container">
          <h2>Draft Complete!</h2>
          <p>You've finished drafting your deck.</p>
          <div className="deck-summary">
            <h3>Your Deck ({humanDeck.length} cards)</h3>
            <div className="deck-preview">
              {humanDeck.map(cardId => (
                <div key={cardId} className="deck-card">
                  {cardId}
                </div>
              ))}
            </div>
          </div>
          <div className="completed-actions">
            <button 
              onClick={() => navigation.navigateToPosition(1, 1)}
              className="btn btn-secondary"
            >
              Review Draft
            </button>
            <button 
              onClick={() => navigation.navigateToDraftList()}
              className="btn btn-primary"
            >
              Back to Drafts
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active draft interface
  return (
    <div className="draft-interface-active">
      <DraftHeader />
      
      <div className="draft-content">
        <main className="draft-main">
          {currentPack ? (
            <PackDisplay 
              pack={currentPack}
              onCardPick={handleCardPick}
              canPick={canPick}
            />
          ) : (
            <div className="no-pack">
              <p>No pack available for this position.</p>
            </div>
          )}
        </main>
        
        <DraftSidebar />
      </div>
      
      {draftProgress && (
        <div className="draft-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${draftProgress.progress * 100}%` }}
            />
          </div>
          <div className="progress-text">
            Round {draftProgress.currentRound}, Pick {draftProgress.currentPick}
            {' '}({Math.round(draftProgress.progress * 100)}%)
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Handle card pick
   */
  async function handleCardPick(cardId: string) {
    if (!canPick) return;
    
    try {
      await draftActions.pickCard(cardId);
      
      // Process bot picks after human pick
      await draftActions.processBotPicks();
      
      // Advance to next position if available
      if (draftProgress && !draftProgress.isComplete) {
        const nextPosition = getNextPosition(
          draftProgress.currentRound, 
          draftProgress.currentPick
        );
        
        if (nextPosition) {
          await navigation.navigateToPosition(nextPosition.round, nextPosition.pick);
        }
      }
    } catch (pickError) {
      console.error('Failed to pick card:', pickError);
    }
  }
}

/**
 * Get next position helper
 */
function getNextPosition(round: number, pick: number): { round: number; pick: number } | null {
  // Last pick of round 3
  if (round === 3 && pick === 15) {
    return null;
  }
  
  // Last pick of round, move to next round
  if (pick === 15) {
    return { round: round + 1, pick: 1 };
  }
  
  // Next pick in same round
  return { round, pick: pick + 1 };
}