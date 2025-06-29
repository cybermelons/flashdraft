/**
 * React hook for draft URL routing and navigation
 * 
 * Integrates the DraftSession engine with browser navigation and URL state.
 * Handles URL parsing, state synchronization, and navigation updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDraftEngine } from './useDraftEngine';
import type { DraftStatus } from '../../engine/types/core';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DraftURLParams {
  draftId: string;
  round: number;
  pick: number;
}

export interface RouterState {
  urlParams: DraftURLParams | null;
  isURLSynced: boolean;
  navigationError: string | null;
}

export interface UseDraftRouterReturn extends RouterState {
  // Navigation actions
  navigateToDraft: (draftId: string, round?: number, pick?: number) => void;
  navigateToNewDraft: () => void;
  syncURLWithEngine: () => void;
  
  // URL utilities
  parseDraftURL: (pathname?: string) => DraftURLParams | null;
  buildDraftURL: (draftId: string, round: number, pick: number) => string;
  
  // State checks
  shouldRedirect: boolean;
  targetURL: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DRAFT_URL_PATTERN = /^\/draft\/([^\/]+)(?:\/p(\d+)p(\d+))?$/;
const NEW_DRAFT_PATH = '/draft/new';

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useDraftRouter(draftEngine?: ReturnType<typeof useDraftEngine>): UseDraftRouterReturn {
  // State
  const [urlParams, setURLParams] = useState<DraftURLParams | null>(null);
  const [isURLSynced, setIsURLSynced] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  // ============================================================================
  // URL PARSING AND BUILDING
  // ============================================================================

  const parseDraftURL = useCallback((pathname?: string): DraftURLParams | null => {
    const path = pathname || window.location.pathname;
    const match = path.match(DRAFT_URL_PATTERN);
    
    if (!match) return null;
    
    const draftId = match[1];
    const round = match[2] ? parseInt(match[2], 10) : 1;
    const pick = match[3] ? parseInt(match[3], 10) : 1;
    
    // Validate parsed values
    if (draftId === 'new' || round < 1 || round > 3 || pick < 1 || pick > 15) {
      return null;
    }
    
    return { draftId, round, pick };
  }, []);

  const buildDraftURL = useCallback((draftId: string, round: number, pick: number): string => {
    return `/draft/${draftId}/p${round}p${pick}`;
  }, []);

  // ============================================================================
  // NAVIGATION ACTIONS
  // ============================================================================

  const navigateToDraft = useCallback((draftId: string, round = 1, pick = 1) => {
    try {
      const url = buildDraftURL(draftId, round, pick);
      window.history.pushState(null, '', url);
      setURLParams({ draftId, round, pick });
      setNavigationError(null);
    } catch (err) {
      setNavigationError(err instanceof Error ? err.message : 'Navigation failed');
    }
  }, [buildDraftURL]);

  const navigateToNewDraft = useCallback(() => {
    try {
      window.history.pushState(null, '', NEW_DRAFT_PATH);
      setURLParams(null);
      setNavigationError(null);
    } catch (err) {
      setNavigationError(err instanceof Error ? err.message : 'Navigation failed');
    }
  }, []);

  const syncURLWithEngine = useCallback(() => {
    if (!draftEngine?.engine) {
      setIsURLSynced(false);
      return;
    }

    const engineState = draftEngine.engine.state;
    const currentURL = window.location.pathname;
    const expectedURL = buildDraftURL(
      engineState.id,
      engineState.currentRound,
      engineState.currentPick
    );

    if (currentURL !== expectedURL) {
      navigateToDraft(
        engineState.id,
        engineState.currentRound,
        engineState.currentPick
      );
    }

    setIsURLSynced(true);
  }, [draftEngine?.engine, buildDraftURL, navigateToDraft]);

  // ============================================================================
  // STATE CHECKS AND DERIVED VALUES
  // ============================================================================

  const shouldRedirect = useCallback((): boolean => {
    if (!draftEngine?.engine || !urlParams) return false;
    
    const engineState = draftEngine.engine.state;
    
    // Check if URL is out of sync with engine state
    return (
      urlParams.draftId === engineState.id &&
      (urlParams.round !== engineState.currentRound ||
       urlParams.pick !== engineState.currentPick)
    );
  }, [draftEngine?.engine, urlParams]);

  const targetURL = useCallback((): string | null => {
    if (!shouldRedirect() || !draftEngine?.engine) return null;
    
    const engineState = draftEngine.engine.state;
    return buildDraftURL(
      engineState.id,
      engineState.currentRound,
      engineState.currentPick
    );
  }, [shouldRedirect, draftEngine?.engine, buildDraftURL]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Parse URL on mount and location changes
  useEffect(() => {
    const handleLocationChange = () => {
      const params = parseDraftURL();
      setURLParams(params);
      setIsURLSynced(false);
    };

    // Initial parse
    handleLocationChange();

    // Listen for popstate (back/forward button)
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [parseDraftURL]);

  // Auto-sync URL when engine state changes
  useEffect(() => {
    if (draftEngine?.engine && !isURLSynced) {
      const engineState = draftEngine.engine.state;
      
      // Only auto-sync if we're on a draft page for the same draft
      if (urlParams?.draftId === engineState.id) {
        syncURLWithEngine();
      }
    }
  }, [draftEngine?.engine, urlParams, isURLSynced, syncURLWithEngine]);

  // Handle redirects when URL is out of sync
  useEffect(() => {
    if (shouldRedirect()) {
      const target = targetURL();
      if (target) {
        window.history.replaceState(null, '', target);
        setURLParams(parseDraftURL(target));
      }
    }
  }, [shouldRedirect, targetURL, parseDraftURL]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // State
    urlParams,
    isURLSynced,
    navigationError,
    
    // Actions
    navigateToDraft,
    navigateToNewDraft,
    syncURLWithEngine,
    
    // Utilities
    parseDraftURL,
    buildDraftURL,
    
    // Checks
    shouldRedirect: shouldRedirect(),
    targetURL: targetURL()
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for handling draft lifecycle navigation
 */
export function useDraftLifecycle() {
  const router = useDraftRouter();
  
  const handleDraftCreated = useCallback((draftId: string) => {
    router.navigateToDraft(draftId, 1, 1);
  }, [router]);
  
  const handleDraftStarted = useCallback((draftId: string) => {
    router.navigateToDraft(draftId, 1, 1);
  }, [router]);
  
  const handlePickMade = useCallback((draftId: string, round: number, pick: number) => {
    router.navigateToDraft(draftId, round, pick);
  }, [router]);
  
  const handleDraftCompleted = useCallback((draftId: string) => {
    // Stay on current URL but could navigate to deck view
    router.navigateToDraft(draftId, 3, 15);
  }, [router]);
  
  return {
    handleDraftCreated,
    handleDraftStarted,
    handlePickMade,
    handleDraftCompleted
  };
}

/**
 * Hook for integrating draft engine with router
 */
export function useDraftEngineRouter(initialDraftId?: string) {
  const draftEngine = useDraftEngine(initialDraftId);
  const router = useDraftRouter(draftEngine);
  const lifecycle = useDraftLifecycle();
  
  // Auto-sync navigation with engine state changes
  useEffect(() => {
    if (draftEngine.engine) {
      const state = draftEngine.engine.state;
      
      // Handle navigation based on draft status
      switch (state.status) {
        case 'setup':
          // Stay on current URL during setup
          break;
          
        case 'active':
          lifecycle.handlePickMade(state.id, state.currentRound, state.currentPick);
          break;
          
        case 'complete':
          lifecycle.handleDraftCompleted(state.id);
          break;
      }
    }
  }, [draftEngine.engine?.state.status, draftEngine.engine?.state.currentRound, draftEngine.engine?.state.currentPick, lifecycle]);
  
  return {
    ...draftEngine,
    ...router,
    lifecycle
  };
}