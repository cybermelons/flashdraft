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
    const updateRoute = () => {
      const parsed = parseDraftURL(window.location.pathname);
      
      setRouteData(prevData => ({
        ...prevData,
        draftId: parsed.draftId,
        round: parsed.round,
        pick: parsed.pick,
        isValidRoute: parsed.isValid,
        routeError: parsed.error,
      }));
      
      // If we have a valid draft ID that's different from current, load it
      if (parsed.isValid && parsed.draftId && parsed.draftId !== currentDraftId) {
        handleDraftLoad(parsed.draftId, parsed.round, parsed.pick);
      }
      
      // If we have a position and the current draft is loaded, navigate to position
      if (parsed.isValid && parsed.draftId === currentDraftId && 
          parsed.round && parsed.pick && currentDraft) {
        handlePositionNavigation(parsed.round, parsed.pick);
      }
    };

    // Initial route parsing
    updateRoute();
    
    // Listen for browser navigation (back/forward)
    const handlePopstate = () => {
      updateRoute();
    };
    
    window.addEventListener('popstate', handlePopstate);
    
    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, [currentDraftId, currentDraft]);

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
  const handleDraftLoad = async (draftId: string, round?: number | null, pick?: number | null) => {
    try {
      await draftActions.loadDraft(draftId);
      
      // After loading, navigate to position if specified
      if (round && pick) {
        await draftActions.navigateToPosition(round, pick);
      }
    } catch (loadError) {
      console.error('Failed to load draft:', loadError);
    }
  };

  /**
   * Navigate to a specific position in the current draft
   */
  const handlePositionNavigation = async (round: number, pick: number) => {
    if (!currentDraft) return;
    
    // Only navigate if we're not already at this position
    if (currentDraft.currentRound !== round || currentDraft.currentPick !== pick) {
      try {
        await draftActions.navigateToPosition(round, pick);
      } catch (navError) {
        console.error('Failed to navigate to position:', navError);
      }
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
     * Navigate to a draft position and update URL
     */
    navigateToPosition: async (round: number, pick: number) => {
      if (!currentDraftId) return;
      
      const url = `/draft/${currentDraftId}/p${round}p${pick}`;
      window.history.pushState({}, '', url);
      
      await draftActions.navigateToPosition(round, pick);
    },
    
    /**
     * Navigate to draft overview
     */
    navigateToOverview: () => {
      if (!currentDraftId) return;
      
      const url = `/draft/${currentDraftId}`;
      window.history.pushState({}, '', url);
    },
    
    /**
     * Navigate to draft list
     */
    navigateToDraftList: () => {
      window.history.pushState({}, '', '/draft');
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