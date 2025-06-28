/**
 * Draft Engine Bridge Component
 * 
 * Bridges the new DraftSession engine with the existing application structure.
 * Provides a compatibility layer during the transition from Zustand to engine-based architecture.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useFlashDraft } from '../hooks/useFlashDraft';
import { DraftSession } from '../../engine/DraftSession';
import type { DraftConfig, MTGSetData } from '../../engine/types/core';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DraftEngineBridgeProps {
  children: (bridgeState: DraftBridgeState) => React.ReactNode;
  draftId?: string;
  round?: number;
  pick?: number;
  setData?: MTGSetData;
  fallback?: React.ReactNode;
}

export interface DraftBridgeState {
  // Engine state
  engine: DraftSession | null;
  isEngineReady: boolean;
  
  // Draft state (compatible with existing components)
  isDraftActive: boolean;
  currentPack: any[] | null;
  playerCards: any[];
  currentRound: number;
  currentPick: number;
  players: any[];
  
  // Actions (compatible with existing interface)
  makePick: (cardId: string) => boolean;
  canMakePick: (cardId: string) => boolean;
  
  // Setup actions
  createNewDraft: (setCode: string, setData: MTGSetData) => Promise<boolean>;
  loadExistingDraft: (draftId: string) => Promise<boolean>;
  
  // Status
  loading: boolean;
  error: string | null;
  needsSetup: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DraftEngineBridge({ 
  children, 
  draftId, 
  round, 
  pick, 
  setData,
  fallback 
}: DraftEngineBridgeProps) {
  const flashDraft = useFlashDraft({ autoLoadFromURL: false });
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ============================================================================
  // INITIALIZATION LOGIC
  // ============================================================================

  const initializeBridge = useCallback(async () => {
    try {
      setBridgeError(null);
      
      if (draftId && draftId !== 'new') {
        // Load existing draft
        const loaded = await flashDraft.loadDraft(draftId);
        if (!loaded) {
          setBridgeError(`Failed to load draft ${draftId}`);
          return;
        }
        
        // Navigate to specific position if provided
        if (round && pick && flashDraft.engine) {
          const currentState = flashDraft.engine.state;
          if (round !== currentState.currentRound || pick !== currentState.currentPick) {
            // This would need engine support for navigation to specific positions
            console.log(`Would navigate to round ${round}, pick ${pick}`);
          }
        }
      }
      
      setIsInitialized(true);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : 'Initialization failed');
    }
  }, [draftId, round, pick, flashDraft]);

  // ============================================================================
  // BRIDGE ACTIONS
  // ============================================================================

  const createNewDraft = useCallback(async (setCode: string, setData: MTGSetData): Promise<boolean> => {
    try {
      setBridgeError(null);
      
      // Update setup config
      flashDraft.setup.updateConfig({ setCode });
      
      // Create draft config
      const config = flashDraft.setup.createDraftConfig();
      if (!config) {
        setBridgeError('Failed to create draft configuration');
        return false;
      }
      
      // Use setData if provided, otherwise use from setup
      const finalConfig: DraftConfig = {
        ...config,
        setData: setData || config.setData
      };
      
      // Create and start the draft
      const success = await flashDraft.createAndStartDraft();
      if (!success) {
        setBridgeError('Failed to create draft');
        return false;
      }
      
      return true;
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : 'Failed to create draft');
      return false;
    }
  }, [flashDraft]);

  const loadExistingDraft = useCallback(async (targetDraftId: string): Promise<boolean> => {
    try {
      setBridgeError(null);
      const success = await flashDraft.loadDraft(targetDraftId);
      if (!success) {
        setBridgeError(`Failed to load draft ${targetDraftId}`);
      }
      return success;
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : 'Failed to load draft');
      return false;
    }
  }, [flashDraft]);

  // ============================================================================
  // COMPATIBILITY LAYER
  // ============================================================================

  // Transform engine state to match existing component expectations
  const bridgeState: DraftBridgeState = {
    // Engine state
    engine: flashDraft.engine,
    isEngineReady: !!flashDraft.engine && isInitialized,
    
    // Draft state (transformed for compatibility)
    isDraftActive: flashDraft.isDraftActive,
    currentPack: flashDraft.currentPack?.cards || null,
    playerCards: flashDraft.playerCards,
    currentRound: flashDraft.currentRound,
    currentPick: flashDraft.currentPick,
    players: flashDraft.players,
    
    // Actions
    makePick: flashDraft.makePick,
    canMakePick: flashDraft.canMakePick,
    
    // Setup actions
    createNewDraft,
    loadExistingDraft,
    
    // Status
    loading: flashDraft.loading || !isInitialized,
    error: bridgeError || flashDraft.error,
    needsSetup: flashDraft.needsSetup
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize bridge when props change
  useEffect(() => {
    if (!isInitialized) {
      initializeBridge();
    }
  }, [initializeBridge, isInitialized]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (bridgeState.loading && fallback) {
    return <>{fallback}</>;
  }

  return <>{children(bridgeState)}</>;
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

/**
 * Bridge for draft interface components
 */
export function DraftInterfaceBridge({ 
  children, 
  draftId 
}: { 
  children: (state: DraftBridgeState) => React.ReactNode;
  draftId: string;
}) {
  return (
    <DraftEngineBridge
      draftId={draftId}
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading draft...</p>
          </div>
        </div>
      }
    >
      {children}
    </DraftEngineBridge>
  );
}

/**
 * Bridge for new draft setup
 */
export function DraftSetupBridge({ 
  children,
  setData
}: { 
  children: (state: DraftBridgeState) => React.ReactNode;
  setData?: MTGSetData;
}) {
  return (
    <DraftEngineBridge
      setData={setData}
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Setting up draft...</p>
          </div>
        </div>
      }
    >
      {children}
    </DraftEngineBridge>
  );
}

// ============================================================================
// HOOKS FOR LEGACY COMPATIBILITY
// ============================================================================

/**
 * Hook that provides engine state in a format compatible with existing components
 */
export function useLegacyDraftState() {
  const flashDraft = useFlashDraft();
  
  return {
    // Legacy state format
    draft_id: flashDraft.engine?.state.id || null,
    draft_started: flashDraft.isDraftActive,
    set_code: flashDraft.engine?.state.config.setCode || null,
    current_round: flashDraft.currentRound,
    current_pick: flashDraft.currentPick,
    
    // Legacy pack format
    current_pack: flashDraft.currentPack?.cards || [],
    picked_cards: flashDraft.playerCards,
    
    // Legacy actions (adapted)
    makePick: flashDraft.makePick,
    
    // New engine reference
    engine: flashDraft.engine
  };
}

/**
 * Migration helper to gradually transition components
 */
export function useEngineTransition(enableEngine = false) {
  const legacyState = useLegacyDraftState();
  const flashDraft = useFlashDraft();
  
  if (enableEngine) {
    return {
      ...flashDraft,
      // Provide legacy compatibility
      legacy: legacyState
    };
  }
  
  return {
    // Return legacy format
    ...legacyState,
    // Provide engine access for gradual migration
    engine: flashDraft
  };
}