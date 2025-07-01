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
  $draftProgress,
  $canPick,
  $isLoading,
  $error,
  $isViewingCurrent,
  $currentPosition,
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
  const isViewingCurrent = useStore($isViewingCurrent);
  const currentPosition = useStore($currentPosition);
  
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <p className="text-slate-300 text-xl">Loading draft...</p>
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

  // No draft loaded
  if (!currentDraft) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 text-center max-w-md">
          <div className="text-slate-400 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Draft Loaded</h2>
          <p className="text-slate-300 mb-6">Select a draft to continue or create a new one.</p>
          <button 
            onClick={() => navigation.navigateToDraftList()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <DraftHeader />
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-sm rounded-3xl p-12 border border-green-500/20 text-center">
              <div className="text-green-400 mb-6">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Draft Complete!</h2>
              <p className="text-xl text-slate-300 mb-8">You've successfully drafted your {humanDeck.length}-card deck.</p>
              
              <div className="bg-slate-800/50 rounded-2xl p-6 mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Your Deck ({humanDeck.length} cards)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                  {humanDeck.map(cardId => (
                    <div key={cardId} className="bg-slate-700/50 rounded-lg p-2 text-xs text-slate-300 border border-slate-600/50">
                      {cardId}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => navigation.navigateToPosition(1, 1)}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Review Draft
                </button>
                <button 
                  onClick={() => navigation.navigateToDraftList()}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Back to Drafts
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active draft interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <DraftHeader />
      
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 p-6">
          {currentPack ? (
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
                <p className="text-slate-300 text-lg mb-2">No pack available for this position.</p>
                {!canPick && humanDeck.length > 0 && (
                  <p className="text-slate-400 text-sm">
                    You already picked from this pack. 
                    {!isViewingCurrent && (
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
              </div>
            </div>
          )}
        </main>
        
        <DraftSidebar />
      </div>
      
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

