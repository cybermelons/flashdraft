/**
 * Simple Draft Router - Route handling for draft interface
 * 
 * Handles URL parsing, draft loading, and position navigation.
 * Integrates with nanostores for reactive state management.
 */

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { 
  $currentDraftId, 
  $currentDraft, 
  $isLoading, 
  $error,
  $viewingRound,
  $viewingPick,
  draftActions 
} from '@/stores/draftStore';
import { parseDraftURL, type ParsedDraftURL } from '@/utils/navigation';

interface SimpleDraftRouterProps {
  children: (routeData: DraftRouteData) => React.ReactNode;
}

export interface DraftRouteData {
  draftId: string | null;
  round: number | null;
  pick: number | null;
  isLoading: boolean;
  error: string | null;
  isValidRoute: boolean;
  routeError?: string;
}

/**
 * Simple draft router that parses URLs and manages draft state
 */
export function SimpleDraftRouter({ children }: SimpleDraftRouterProps) {
  const currentDraftId = useStore($currentDraftId);
  const currentDraft = useStore($currentDraft);
  const isLoading = useStore($isLoading);
  const error = useStore($error);
  
  const [routeData, setRouteData] = useState<DraftRouteData>({
    draftId: null,
    round: null,
    pick: null,
    isLoading: false,
    error: null,
    isValidRoute: false,
  });

  // Parse URL and update route data  
  useEffect(() => {
    // Parse URL on mount
    const parsed = parseDraftURL(window.location.pathname);
    
    setRouteData({
      draftId: parsed.draftId,
      round: parsed.round,
      pick: parsed.pick,
      isLoading: false,
      error: null,
      isValidRoute: parsed.isValid,
      routeError: parsed.error,
    });
    
    // Load draft if needed
    if (parsed.isValid && parsed.draftId && parsed.draftId !== currentDraftId) {
      handleDraftLoad(parsed.draftId);
    }
    
    // Handle browser navigation (back/forward)
    const handlePopstate = () => {
      const parsed = parseDraftURL(window.location.pathname);
      
      setRouteData(prevData => ({
        ...prevData,
        draftId: parsed.draftId,
        round: parsed.round,
        pick: parsed.pick,
        isValidRoute: parsed.isValid,
        routeError: parsed.error,
      }));
      
      // Only update position on actual browser navigation
      if (parsed.isValid && parsed.draftId === currentDraftId && parsed.round && parsed.pick) {
        draftActions.navigateToPosition(parsed.round, parsed.pick);
      }
    };
    
    window.addEventListener('popstate', handlePopstate);
    
    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, [currentDraftId]); // Don't re-run on draft changes, only on draft ID changes
  
  // Update URL when viewing position changes
  const viewingRound = useStore($viewingRound);
  const viewingPick = useStore($viewingPick);
  
  useEffect(() => {
    if (currentDraftId && viewingRound && viewingPick) {
      const currentPath = window.location.pathname;
      const expectedPath = `/draft/${currentDraftId}/p${viewingRound}p${viewingPick}`;
      
      // Only update if path doesn't match
      if (currentPath !== expectedPath) {
        window.history.replaceState({}, '', expectedPath);
      }
    }
  }, [currentDraftId, viewingRound, viewingPick]);

  // Update loading and error state separately to avoid infinite loops
  useEffect(() => {
    setRouteData(prevData => ({
      ...prevData,
      isLoading,
      error,
    }));
  }, [isLoading, error]);

  /**
   * Load a draft and optionally navigate to position
   */
  const handleDraftLoad = async (draftId: string) => {
    try {
      await draftActions.loadDraft(draftId);
      // loadDraft now automatically initializes viewing position to current engine position
    } catch (loadError) {
      console.error('Failed to load draft:', loadError);
    }
  };


  return <>{children(routeData)}</>;
}

/**
 * Hook for draft navigation within components
 */
export function useDraftNavigation() {
  const currentDraftId = useStore($currentDraftId);
  
  return {
    /**
     * Navigate to a draft position and update URL (UI navigation only)
     */
    navigateToPosition: (round: number, pick: number) => {
      if (!currentDraftId) return;
      
      // Update UI viewing position (no engine operations)
      draftActions.navigateToPosition(round, pick);
      
      // Update URL to reflect new viewing position
      const url = `/draft/${currentDraftId}/p${round}p${pick}`;
      window.history.pushState({}, '', url);
    },
    
    /**
     * Navigate to draft overview
     */
    navigateToOverview: () => {
      if (!currentDraftId) return;
      
      const url = `/draft/${currentDraftId}`;
      // Use actual navigation for Astro SSR
      window.location.href = url;
    },
    
    /**
     * Navigate to draft list
     */
    navigateToDraftList: () => {
      // Use actual navigation for Astro SSR
      window.location.href = '/draft';
    },
    
    /**
     * Go back in history
     */
    goBack: () => {
      window.history.back();
    }
  };
}

/**
 * Hook for route data access
 */
export function useDraftRoute(): DraftRouteData {
  const currentDraftId = useStore($currentDraftId);
  const isLoading = useStore($isLoading);
  const error = useStore($error);
  
  const [routeData, setRouteData] = useState<DraftRouteData>({
    draftId: null,
    round: null,
    pick: null,
    isLoading,
    error,
    isValidRoute: false,
  });

  useEffect(() => {
    const parsed = parseDraftURL(window.location.pathname);
    
    setRouteData({
      draftId: parsed.draftId,
      round: parsed.round,
      pick: parsed.pick,
      isLoading,
      error,
      isValidRoute: parsed.isValid,
      routeError: parsed.error,
    });
  }, [currentDraftId, isLoading, error]);

  return routeData;
}