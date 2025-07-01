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
import { urlManager } from '@/utils/urlManager';

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
      isLoading: parsed.isValid && parsed.draftId && parsed.draftId !== currentDraftId,
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
      
      // Load different draft if needed
      if (parsed.isValid && parsed.draftId && parsed.draftId !== currentDraftId) {
        handleDraftLoad(parsed.draftId);
      }
      // Position updates are now handled by URL-based computed stores
    };
    
    window.addEventListener('popstate', handlePopstate);
    
    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, [currentDraftId]); // Don't re-run on draft changes, only on draft ID changes
  
  // Don't automatically update URL - let navigation be explicit
  // URL updates should only happen through:
  // 1. User navigation (useDraftNavigation hook)
  // 2. Draft progression (in draftStore after picks)

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
      urlManager.navigateToPosition(currentDraftId, round, pick);
    },
    
    /**
     * Navigate to draft overview
     */
    navigateToOverview: () => {
      if (!currentDraftId) return;
      urlManager.navigateToOverview(currentDraftId);
    },
    
    /**
     * Navigate to draft list
     */
    navigateToDraftList: () => {
      urlManager.navigateToDraftList();
    },
    
    /**
     * Go back in history
     */
    goBack: () => {
      urlManager.goBack();
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