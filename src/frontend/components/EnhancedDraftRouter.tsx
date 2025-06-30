/**
 * Enhanced Draft Router
 * 
 * A transitional router that can work with both the legacy Zustand system
 * and the new DraftSession engine, allowing for gradual migration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DraftEngineBridge, type DraftBridgeState } from './DraftEngineBridge';
import { useDraftStore } from '../../stores/draftStore';
import type { MTGSetData } from '../../shared/types/card';

// ============================================================================
// INTERFACES
// ============================================================================

export interface EnhancedDraftRouterProps {
  routeType: string;
  draftId?: string | null;
  round?: number | null;
  pick?: number | null;
  useEngine?: boolean; // Flag to enable engine mode
}

interface RouterState {
  loading: boolean;
  error: string | null;
  setData: MTGSetData | null;
  initialized: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnhancedDraftRouter({
  routeType,
  draftId,
  round,
  pick,
  useEngine = false
}: EnhancedDraftRouterProps) {
  const [state, setState] = useState<RouterState>({
    loading: true,
    error: null,
    setData: null,
    initialized: false
  });

  // Legacy store (still needed for transition)
  const legacyStore = useDraftStore();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const initializeRouter = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Handle different route types
      switch (routeType) {
        case 'overview':
          // No initialization needed for overview
          setState(prev => ({ ...prev, loading: false, initialized: true }));
          break;

        case 'draft':
        case 'position':
          if (draftId && draftId !== 'new') {
            await initializeDraftRoute();
          } else {
            await initializeNewDraftRoute();
          }
          break;

        default:
          setState(prev => ({ 
            ...prev, 
            error: 'Invalid route type', 
            loading: false 
          }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Initialization failed',
        loading: false
      }));
    }
  }, [routeType, draftId, round, pick]);

  const initializeDraftRoute = async () => {
    try {
      // For existing drafts, we need to load set data
      // This will be handled by the DraftEngineBridge for engine mode
      setState(prev => ({ ...prev, loading: false, initialized: true }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize draft route',
        loading: false
      }));
    }
  };

  const initializeNewDraftRoute = async () => {
    try {
      // For new drafts, we might need to preload set data
      setState(prev => ({ ...prev, loading: false, initialized: true }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize new draft route',
        loading: false
      }));
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    initializeRouter();
  }, [initializeRouter]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderLoadingState = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading draft...</p>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600 mb-6">{state.error}</p>
        <div className="space-x-4">
          <button
            onClick={() => window.location.href = '/draft'}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Overview
          </button>
          <button
            onClick={() => window.location.href = '/draft/new'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Start New Draft
          </button>
        </div>
      </div>
    </div>
  );

  const renderEngineMode = () => {
    // Load dynamic imports for components that use the new engine
    const DraftOverview = React.lazy(() => import('./DraftOverview'));
    const DraftInterface = React.lazy(() => import('./DraftInterface'));
    const DraftApp = React.lazy(() => import('./DraftApp'));

    return (
      <React.Suspense fallback={renderLoadingState()}>
        <DraftEngineBridge
          draftId={draftId || undefined}
          round={round || undefined}
          pick={pick || undefined}
          setData={state.setData || undefined}
          fallback={renderLoadingState()}
        >
          {(bridgeState: DraftBridgeState) => {
            // Route to appropriate component based on state
            switch (routeType) {
              case 'overview':
                return <DraftOverview />;

              case 'draft':
              case 'position':
                if (draftId === 'new' || bridgeState.needsSetup) {
                  return <DraftApp />;
                } else if (bridgeState.isDraftActive) {
                  return <DraftInterface />;
                } else {
                  // Redirect to setup if no active draft
                  window.location.href = '/draft/new';
                  return null;
                }

              default:
                return <DraftOverview />;
            }
          }}
        </DraftEngineBridge>
      </React.Suspense>
    );
  };

  const renderLegacyMode = () => {
    // Use existing legacy router logic
    const DraftOverview = React.lazy(() => import('./DraftOverview'));
    const DraftInterface = React.lazy(() => import('./DraftInterface'));
    const DraftApp = React.lazy(() => import('./DraftApp'));

    return (
      <React.Suspense fallback={renderLoadingState()}>
        {(() => {
          switch (routeType) {
            case 'overview':
              return <DraftOverview />;

            case 'draft':
            case 'position':
              if (draftId === 'new' || (!legacyStore.draft_started && !legacyStore.draft_id)) {
                return <DraftApp />;
              } else if (legacyStore.draft_started && legacyStore.draft_id) {
                return <DraftInterface />;
              } else {
                window.location.href = '/draft';
                return null;
              }

            default:
              return <DraftOverview />;
          }
        })()}
      </React.Suspense>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (state.loading) {
    return renderLoadingState();
  }

  if (state.error) {
    return renderErrorState();
  }

  // Choose rendering mode based on useEngine flag
  if (useEngine) {
    return renderEngineMode();
  } else {
    return renderLegacyMode();
  }
}

// ============================================================================
// MIGRATION HELPER COMPONENT
// ============================================================================

/**
 * Progressive enhancement wrapper that can gradually enable engine features
 */
export function ProgressiveDraftRouter(props: EnhancedDraftRouterProps) {
  // Check if engine should be enabled based on feature flags, URL params, etc.
  const shouldUseEngine = checkEngineFeatureFlag();
  
  return (
    <EnhancedDraftRouter
      {...props}
      useEngine={shouldUseEngine}
    />
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function checkEngineFeatureFlag(): boolean {
  // Check various sources for engine enablement
  
  // 1. URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('engine') === 'true') {
    return true;
  }
  if (urlParams.get('engine') === 'false') {
    return false;
  }
  
  // 2. localStorage setting
  const localStorageSetting = localStorage.getItem('flashdraft_use_engine');
  if (localStorageSetting === 'true') {
    return true;
  }
  if (localStorageSetting === 'false') {
    return false;
  }
  
  // 3. Environment variable or build-time flag
  if (typeof window !== 'undefined' && (window as any).__FLASHDRAFT_USE_ENGINE__) {
    return true;
  }
  
  // 4. Default: use legacy for now, engine later
  return false;
}

/**
 * Development helper to toggle engine mode
 */
export function toggleEngineMode() {
  const current = checkEngineFeatureFlag();
  localStorage.setItem('flashdraft_use_engine', (!current).toString());
  window.location.reload();
}

// Export legacy router as default for backwards compatibility
export default EnhancedDraftRouter;