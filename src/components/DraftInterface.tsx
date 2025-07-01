/**
 * Draft Interface - Main draft interface component
 * 
 * Renders the current draft state, pack display, and draft controls.
 * Integrates with SimpleDraftRouter for navigation and stores for state.
 */

import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { clearCorruptedDraftData } from '@/utils/storageCleanup';
import { 
  $currentDraft, 
  $currentPack, 
  $humanDeck,
  $humanDeckCards, 
  $draftProgress,
  $canPick,
  $isLoading,
  $error,
  $isViewingCurrent,
  $currentPosition,
  draftActions,
  uiActions 
} from '@/stores/draftStore';
import { $isDarkMode, $sidebarOpen } from '@/stores/uiStore';
import { SimpleDraftRouter, useDraftNavigation, type DraftRouteData } from './SimpleDraftRouter';
import { PackDisplay } from './PackDisplay';
import { DraftHeader } from './DraftHeader';
import { DraftSidebar } from './DraftSidebar';
import { EngineDebug } from './EngineDebug';
import { DraftSkeleton } from './DraftSkeleton';
import { HoverCardPreview } from './HoverCardPreview';
import { DecklistOverview } from './DecklistOverview';

interface DraftInterfaceProps {
  className?: string;
}

/**
 * Main draft interface that handles routing and state management
 */
export function DraftInterface({ className = '' }: DraftInterfaceProps) {
  const [clientTheme, setClientTheme] = useState<'light' | 'dark'>('light');
  
  // Clear corrupted data on mount
  useEffect(() => {
    clearCorruptedDraftData();
  }, []);
  
  // Proper client-side theme detection (no SSR mismatch)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setClientTheme(mediaQuery.matches ? 'dark' : 'light');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setClientTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return (
    <div 
      className={`draft-interface ${clientTheme} ${className}`}
    >
      {/* Sidebar at root level - always present */}
      <DraftSidebar />
      
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
  const humanDeckCards = useStore($humanDeckCards);
  const draftProgress = useStore($draftProgress);
  const canPick = useStore($canPick);
  const isLoading = useStore($isLoading);
  const error = useStore($error);
  const isViewingCurrent = useStore($isViewingCurrent);
  const currentPosition = useStore($currentPosition);
  const sidebarOpen = useStore($sidebarOpen);
  
  
  // Debug logging - only on mount and key state changes
  useEffect(() => {
    console.log('DraftInterface state:', {
      canPick,
      isViewingCurrent,
      viewingPosition: currentPosition,
      enginePosition: currentDraft ? { round: currentDraft.currentRound, pick: currentDraft.currentPick } : null,
      draftStatus: currentDraft?.status,
      packCards: currentPack?.cards.length || 0,
      humanDeckSize: humanDeck.length,
      isLoading,
      url: window.location.pathname
    });
  }, [canPick, currentDraft?.currentRound, currentDraft?.currentPick]);
  
  const navigation = useDraftNavigation();
  
  // Default to skeleton until we have definitive state
  if (!currentDraft && !error && !routeData.routeError) {
    return <DraftSkeleton />;
  }

  // Handle route errors
  if (!routeData.isValidRoute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20 text-center max-w-md">
          <div className="text-red-400 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-3">Invalid Draft URL</h2>
          <p className="text-slate-300 mb-6">{routeData.routeError}</p>
          <button 
            onClick={() => navigation.navigateToDraftList()}
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Back to Draft List
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20 text-center max-w-md">
          <div className="text-red-400 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-3">Draft Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => uiActions.clearError()}
              className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Dismiss
            </button>
            <button 
              onClick={() => navigation.navigateToDraftList()}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Back to Draft List
            </button>
          </div>
        </div>
      </div>
    );
  }



  // Show completion banner but allow navigation for completed drafts
  const isCompleted = currentDraft.status === 'completed';

  // Active draft interface (also used for completed drafts with navigation)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <DraftHeader />
      <HoverCardPreview />
      
      {/* Completion banner for finished drafts */}
      {isCompleted && isViewingCurrent && (
        <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border-b border-green-500/30 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-green-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Draft Complete!</h3>
                <p className="text-sm text-green-300">You drafted {humanDeck.length} cards. Navigate back to review your picks.</p>
              </div>
            </div>
            <button 
              onClick={() => navigation.navigateToDraftList()}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
            >
              Back to Drafts
            </button>
          </div>
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Main content - shifts when sidebar is open on desktop */}
        <main className={`h-full p-6 overflow-y-auto transition-all duration-300 ${
          sidebarOpen ? 'lg:mr-80' : ''
        }`}>
          {/* Show overview if no position in URL and draft is complete */}
          {isCompleted && !routeData.round && !routeData.pick && isViewingCurrent ? (
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-white mb-2">Draft Complete - Final Deck</h2>
                <div className="flex gap-3">
                  <button 
                    onClick={() => navigation.navigateToPosition(1, 1)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                  >
                    Review Draft Picks
                  </button>
                  <button 
                    onClick={() => navigation.navigateToDraftList()}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                  >
                    Back to Draft List
                  </button>
                </div>
              </div>
              <DecklistOverview cards={humanDeckCards} draftId={currentDraft.draftId} />
            </div>
          ) : currentPack ? (
            <PackDisplay 
              pack={currentPack}
              onCardPick={handleCardPick}
              canPick={canPick}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 text-center max-w-md">
                <div className="text-slate-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                {isCompleted && isViewingCurrent ? (
                  <>
                    <p className="text-slate-300 text-lg mb-2">Draft Complete!</p>
                    <p className="text-slate-400 text-sm">Navigate back through your picks to review the draft.</p>
                    <button 
                      onClick={() => navigation.navigateToPosition(1, 1)}
                      className="mt-4 text-blue-400 hover:text-blue-300 underline"
                    >
                      Start from Pick 1
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-slate-300 text-lg mb-2">No pack available for this position.</p>
                    {!canPick && humanDeck.length > 0 && (
                      <p className="text-slate-400 text-sm">
                        You already picked from this pack. 
                        {!isViewingCurrent && !isCompleted && (
                          <span className="block mt-2">
                            <button 
                              onClick={() => navigation.navigateToPosition(currentDraft.currentRound, currentDraft.currentPick)}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              Go to current pick (P{currentDraft.currentRound}P{currentDraft.currentPick})
                            </button>
                          </span>
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Debug component to show engine state */}
      <EngineDebug />
      
      {draftProgress && (
        <div className="bg-slate-800/50 backdrop-blur-sm border-t border-slate-700/50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-slate-700/50 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${draftProgress.progress * 100}%` }}
                />
              </div>
              <div className="text-slate-300 font-medium min-w-0 text-sm">
                Round {draftProgress.currentRound}, Pick {draftProgress.currentPick}
                {' '}({Math.round(draftProgress.progress * 100)}%)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Handle card pick (engine auto-advances, UI follows)
   */
  async function handleCardPick(cardId: string) {
    if (!canPick) return;
    
    try {
      // Pick card and process all picks atomically
      await draftActions.pickCard(cardId);
      
      // Bot picks are now processed inside pickCard
    } catch (pickError) {
      console.error('Failed to pick card:', pickError);
    }
  }
}

