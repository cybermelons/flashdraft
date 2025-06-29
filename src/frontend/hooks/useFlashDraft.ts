/**
 * Combined hook for complete FlashDraft functionality
 * 
 * Provides a single interface for all draft-related functionality,
 * combining engine management, setup, routing, and lifecycle handling.
 */

import { useMemo, useCallback, useEffect } from 'react';
import { useDraftEngine } from './useDraftEngine';
import { useDraftSetup } from './useDraftSetup';
import { useDraftRouter } from './useDraftRouter';
import { useAutoSync } from './useStateSync';
import type { DraftConfig } from '../../engine/types/core';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UseFlashDraftOptions {
  initialDraftId?: string;
  autoLoadFromURL?: boolean;
  autoSave?: boolean;
  enableSync?: boolean;
  enableLegacyStoreSync?: boolean;
  legacyStore?: any;
}

export interface UseFlashDraftReturn {
  // Engine state
  engine: ReturnType<typeof useDraftEngine>['engine'];
  loading: boolean;
  error: string | null;
  
  // Draft state
  currentPack: ReturnType<typeof useDraftEngine>['currentPack'];
  playerCards: ReturnType<typeof useDraftEngine>['playerCards'];
  draftStatus: ReturnType<typeof useDraftEngine>['draftStatus'];
  currentRound: number;
  currentPick: number;
  players: ReturnType<typeof useDraftEngine>['players'];
  
  // Setup state
  setup: ReturnType<typeof useDraftSetup>;
  
  // Router state
  urlParams: ReturnType<typeof useDraftRouter>['urlParams'];
  isURLSynced: boolean;
  
  // Combined actions
  createAndStartDraft: () => Promise<boolean>;
  makePick: (cardId: string) => boolean;
  canMakePick: (cardId: string) => boolean;
  
  // Navigation
  navigateToDraft: (draftId: string, round?: number, pick?: number) => void;
  navigateToNewDraft: () => void;
  
  // Utilities
  getDraftId: () => string | null;
  clearAllErrors: () => void;
  
  // Status checks
  isReady: boolean;
  needsSetup: boolean;
  isDraftActive: boolean;
  isDraftComplete: boolean;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useFlashDraft(options: UseFlashDraftOptions = {}): UseFlashDraftReturn {
  const {
    initialDraftId,
    autoLoadFromURL = true,
    autoSave = true,
    enableSync = true,
    enableLegacyStoreSync = false,
    legacyStore
  } = options;

  // Initialize all sub-hooks
  const draftEngine = useDraftEngine(initialDraftId);
  const setup = useDraftSetup();
  const router = useDraftRouter(draftEngine);

  // Initialize state synchronization
  const stateSync = useAutoSync(draftEngine.engine, {
    enableURLSync: enableSync,
    enableStorageSync: enableSync && autoSave,
    enableBroadcastSync: enableSync,
    enableExternalStoreSync: enableLegacyStoreSync,
    externalStore: legacyStore,
    enableDebugSync: process.env.NODE_ENV === 'development'
  });

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const isReady = useMemo(() => {
    return !draftEngine.loading && !setup.loadingSet && setup.isConfigValid;
  }, [draftEngine.loading, setup.loadingSet, setup.isConfigValid]);

  const needsSetup = useMemo(() => {
    return !draftEngine.engine && router.urlParams?.draftId === undefined;
  }, [draftEngine.engine, router.urlParams]);

  const isDraftActive = useMemo(() => {
    return draftEngine.draftStatus === 'active';
  }, [draftEngine.draftStatus]);

  const isDraftComplete = useMemo(() => {
    return draftEngine.draftStatus === 'complete';
  }, [draftEngine.draftStatus]);

  // Combined loading state
  const loading = useMemo(() => {
    return draftEngine.loading || setup.loadingSet;
  }, [draftEngine.loading, setup.loadingSet]);

  // Combined error state
  const error = useMemo(() => {
    return draftEngine.error || setup.setError || router.navigationError;
  }, [draftEngine.error, setup.setError, router.navigationError]);

  // ============================================================================
  // COMBINED ACTIONS
  // ============================================================================

  const createAndStartDraft = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Starting draft creation...');
      
      // Create draft config from setup
      console.log('Creating draft config from setup...');
      const config = setup.createDraftConfig();
      if (!config) {
        console.error('Failed to create draft config');
        console.log('Setup state:', { 
          isConfigValid: setup.isConfigValid, 
          validationErrors: setup.validationErrors,
          setData: !!setup.setData,
          config: setup.config 
        });
        return false;
      }
      console.log('Draft config created successfully');

      // Create the draft
      console.log('Creating draft engine...');
      const created = await draftEngine.createDraft(config);
      if (!created) {
        console.error('Failed to create draft in engine');
        return false;
      }
      console.log('Draft engine created successfully');

      // Add human player
      console.log('Adding human player...');
      const humanAdded = draftEngine.addPlayer('human-1', 'You', true);
      if (!humanAdded) {
        console.error('Failed to add human player');
        return false;
      }
      console.log('Human player added successfully');

      // Add bot players
      console.log('Adding bot players...');
      for (let i = 0; i < setup.config.botPersonalities.length; i++) {
        const botId = `bot-${i + 1}`;
        const botName = `Bot ${i + 1}`;
        const personality = setup.config.botPersonalities[i];
        
        console.log(`Adding bot ${i + 1} with personality ${personality}...`);
        const botAdded = draftEngine.addPlayer(botId, botName, false, personality);
        if (!botAdded) {
          console.error(`Failed to add bot player ${i + 1}`);
          return false;
        }
      }
      console.log('All bot players added successfully');

      // Start the draft
      console.log('Starting draft...');
      const started = draftEngine.startDraft();
      if (!started) {
        console.error('Failed to start draft');
        return false;
      }
      console.log('Draft started successfully');

      // Navigate to draft URL
      if (draftEngine.engine) {
        const draftId = draftEngine.engine.state.id;
        console.log(`Navigating to draft ${draftId}...`);
        router.navigateToDraft(draftId, 1, 1);
      }

      console.log('Draft creation completed successfully');
      return true;
    } catch (err) {
      console.error('Failed to create and start draft:', err);
      return false;
    }
  }, [setup, draftEngine, router]);

  const clearAllErrors = useCallback(() => {
    draftEngine.clearError();
    // Setup errors clear automatically when conditions change
    // Router errors clear automatically on successful navigation
  }, [draftEngine]);

  // ============================================================================
  // AUTO-LOADING FROM URL
  // ============================================================================

  useEffect(() => {
    if (autoLoadFromURL && router.urlParams?.draftId && !draftEngine.engine) {
      draftEngine.loadDraft(router.urlParams.draftId);
    }
  }, [autoLoadFromURL, router.urlParams?.draftId, draftEngine.engine, draftEngine.loadDraft]);

  // ============================================================================
  // AUTO-SYNC URL WITH ENGINE
  // ============================================================================

  useEffect(() => {
    if (draftEngine.engine && router.urlParams) {
      const engineState = draftEngine.engine.state;
      const urlParams = router.urlParams;
      
      // Update URL if engine state has advanced beyond URL state
      if (
        urlParams.draftId === engineState.id &&
        (urlParams.round < engineState.currentRound ||
         (urlParams.round === engineState.currentRound && urlParams.pick < engineState.currentPick))
      ) {
        router.navigateToDraft(engineState.id, engineState.currentRound, engineState.currentPick);
      }
    }
  }, [draftEngine.engine?.state.currentRound, draftEngine.engine?.state.currentPick, router]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // Engine state
    engine: draftEngine.engine,
    loading,
    error,
    
    // Draft state
    currentPack: draftEngine.currentPack,
    playerCards: draftEngine.playerCards,
    draftStatus: draftEngine.draftStatus,
    currentRound: draftEngine.currentRound,
    currentPick: draftEngine.currentPick,
    players: draftEngine.players,
    
    // Setup
    setup,
    
    // Router
    urlParams: router.urlParams,
    isURLSynced: router.isURLSynced,
    
    // Combined actions
    createAndStartDraft,
    makePick: draftEngine.makePick,
    canMakePick: draftEngine.canMakePick,
    
    // Navigation
    navigateToDraft: router.navigateToDraft,
    navigateToNewDraft: router.navigateToNewDraft,
    
    // Utilities
    getDraftId: draftEngine.getDraftId,
    clearAllErrors,
    
    // Status checks
    isReady,
    needsSetup,
    isDraftActive,
    isDraftComplete
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Hook for handling draft URLs and loading existing drafts
 */
export function useDraftFromURL() {
  const flashDraft = useFlashDraft({ autoLoadFromURL: true });
  
  return {
    ...flashDraft,
    isLoadingFromURL: flashDraft.loading && !flashDraft.engine && !!flashDraft.urlParams?.draftId,
    urlDraftId: flashDraft.urlParams?.draftId || null
  };
}