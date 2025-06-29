/**
 * React hook for DraftSession engine integration
 * 
 * Provides a clean interface between React components and the core draft engine.
 * Handles state management, persistence, error handling, and action dispatch.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DraftSession } from '../../engine/DraftSession';
import { LocalStoragePersistence, createLocalStoragePersistence } from '../../engine/serialization/DraftSerializer';
import type { DraftConfig, DraftAction, Card, Pack, Player, DraftStatus } from '../../engine/types/core';
import type { ActionResult } from '../../engine/types/errors';

// ============================================================================
// HOOK INTERFACES
// ============================================================================

export interface DraftEngineState {
  engine: DraftSession | null;
  loading: boolean;
  error: string | null;
  
  // Derived state from engine
  currentPack: Pack | null;
  playerCards: Card[];
  draftStatus: DraftStatus;
  currentRound: number;
  currentPick: number;
  players: Player[];
}

export interface DraftEngineActions {
  // Engine lifecycle
  createDraft: (config: DraftConfig) => Promise<DraftSession | null>;
  loadDraft: (draftId: string) => Promise<boolean>;
  saveDraft: () => Promise<boolean>;
  
  // Draft actions
  addPlayer: (playerId: string, name: string, isHuman: boolean, personality?: string) => boolean;
  addPlayerToEngine: (engine: DraftSession, playerId: string, name: string, isHuman: boolean, personality?: string) => DraftSession | null;
  startDraft: () => boolean;
  startDraftOnEngine: (engine: DraftSession) => DraftSession | null;
  makePick: (cardId: string) => boolean;
  
  // Utility
  canMakePick: (cardId: string) => boolean;
  getDraftId: () => string | null;
  clearError: () => void;
}

export interface UseDraftEngineReturn extends DraftEngineState, DraftEngineActions {}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useDraftEngine(initialDraftId?: string): UseDraftEngineReturn {
  // Core state
  const [engine, setEngine] = useState<DraftSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persistence layer
  const persistence = useMemo(() => createLocalStoragePersistence(), []);
  
  // Derived state from engine
  const derivedState = useMemo(() => {
    if (!engine) {
      return {
        currentPack: null,
        playerCards: [],
        draftStatus: 'setup' as DraftStatus,
        currentRound: 1,
        currentPick: 1,
        players: []
      };
    }

    const humanPlayerId = engine.state.config.humanPlayerId;
    
    return {
      currentPack: engine.getCurrentPack(humanPlayerId),
      playerCards: engine.getPlayerCards(humanPlayerId),
      draftStatus: engine.getDraftStatus(),
      currentRound: engine.state.currentRound,
      currentPick: engine.state.currentPick,
      players: engine.state.players
    };
  }, [engine]);

  // ============================================================================
  // ENGINE LIFECYCLE ACTIONS
  // ============================================================================

  const createDraft = useCallback(async (config: DraftConfig): Promise<DraftSession | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const newEngine = DraftSession.create(config);
      setEngine(newEngine);
      
      // Auto-save new draft
      const saveResult = await persistence.save(newEngine.state.id, newEngine.serialize());
      if (!saveResult) {
        setError('Failed to save new draft');
        return null;
      }
      
      return newEngine;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft');
      return null;
    } finally {
      setLoading(false);
    }
  }, [persistence]);

  const loadDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const savedData = await persistence.load(draftId);
      if (!savedData) {
        setError(`Draft ${draftId} not found`);
        return false;
      }
      
      const deserializeResult = DraftSession.deserialize(savedData);
      if (!deserializeResult.success) {
        setError(`Failed to load draft: ${deserializeResult.error.message}`);
        return false;
      }
      
      setEngine(deserializeResult.data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load draft');
      return false;
    } finally {
      setLoading(false);
    }
  }, [persistence]);

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!engine) {
      setError('No draft to save');
      return false;
    }
    
    try {
      const saveResult = await persistence.save(engine.state.id, engine.serialize());
      if (!saveResult) {
        setError('Failed to save draft');
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
      return false;
    }
  }, [engine, persistence]);

  // ============================================================================
  // DRAFT ACTIONS
  // ============================================================================

  const applyAction = useCallback((action: DraftAction): DraftSession | null => {
    if (!engine) {
      setError('No active draft');
      return null;
    }

    console.log('Applying action:', action.type, action);
    console.log('Current draft state:', {
      status: engine.state.status,
      playerCount: engine.state.players.length,
      players: engine.state.players.map(p => ({ id: p.id, name: p.name, isHuman: p.isHuman }))
    });

    const result = engine.applyAction(action);
    if (!result.success) {
      console.error('Action failed:', result.error);
      setError(result.error.message);
      return null;
    }

    console.log('Action applied successfully');
    setEngine(result.data);
    setError(null);
    
    // Auto-save after successful action
    persistence.save(result.data.state.id, result.data.serialize()).catch(err => {
      console.warn('Auto-save failed:', err);
    });
    
    return result.data; // Return the updated engine
  }, [engine, persistence]);

  const addPlayerToEngine = useCallback((engine: DraftSession, playerId: string, name: string, isHuman: boolean, personality?: string): DraftSession | null => {
    console.log('addPlayerToEngine called with:', { playerId, name, isHuman, personality });
    console.log('Engine state:', {
      status: engine.state.status,
      playerCount: engine.state.players.length,
      players: engine.state.players.map(p => ({ id: p.id, name: p.name, isHuman: p.isHuman }))
    });

    const action = {
      type: 'ADD_PLAYER' as const,
      playerId,
      name,
      isHuman,
      personality: personality as any
    };
    
    console.log('Applying action to engine:', action);
    const result = engine.applyAction(action);
    
    if (!result.success) {
      console.error('Action failed:', result.error);
      setError(result.error.message);
      return null;
    }

    console.log('Action applied successfully');
    const newEngine = result.data;
    setEngine(newEngine);
    
    // Auto-save after successful action
    persistence.save(newEngine.state.id, newEngine.serialize()).catch(err => {
      console.warn('Auto-save failed:', err);
    });
    
    return newEngine;
  }, [persistence]);

  const addPlayer = useCallback((playerId: string, name: string, isHuman: boolean, personality?: string): boolean => {
    console.log('addPlayer called with:', { playerId, name, isHuman, personality });
    console.log('Current engine state:', engine ? 'exists' : 'null');
    
    if (!engine) {
      console.error('addPlayer failed: No engine available');
      return false;
    }
    
    const result = addPlayerToEngine(engine, playerId, name, isHuman, personality);
    return result !== null;
  }, [addPlayerToEngine, engine]);

  const startDraftOnEngine = useCallback((engine: DraftSession): DraftSession | null => {
    console.log('startDraftOnEngine called');
    console.log('Engine state:', {
      status: engine.state.status,
      playerCount: engine.state.players.length
    });

    const action = { type: 'START_DRAFT' as const };
    
    console.log('Applying START_DRAFT action to engine:', action);
    const result = engine.applyAction(action);
    
    if (!result.success) {
      console.error('Start draft action failed:', result.error);
      setError(result.error.message);
      return null;
    }

    console.log('Start draft action applied successfully');
    const newEngine = result.data;
    setEngine(newEngine);
    
    // Auto-save after successful action
    persistence.save(newEngine.state.id, newEngine.serialize()).catch(err => {
      console.warn('Auto-save failed:', err);
    });
    
    return newEngine;
  }, [persistence]);

  const startDraft = useCallback((): boolean => {
    const result = applyAction({ type: 'START_DRAFT' });
    return result !== null;
  }, [applyAction]);

  const makePick = useCallback((cardId: string): boolean => {
    if (!engine) {
      setError('No active draft');
      return false;
    }

    console.log(`[DraftEngine] Human making pick: ${cardId}`);
    console.log(`[DraftEngine] Current state before pick:`, {
      round: engine.state.currentRound,
      pick: engine.state.currentPick,
      playerCount: engine.state.players.length,
      status: engine.state.status
    });

    const humanPlayerId = engine.state.config.humanPlayerId;
    const updatedEngine = applyAction({
      type: 'MAKE_PICK',
      playerId: humanPlayerId,
      cardId
    });

    console.log(`[DraftEngine] Pick result: ${updatedEngine ? 'SUCCESS' : 'FAILED'}`);
    if (updatedEngine) {
      console.log(`[DraftEngine] State after pick:`, {
        round: updatedEngine.state.currentRound,
        pick: updatedEngine.state.currentPick,
        status: updatedEngine.state.status
      });

      // Process bot picks after successful human pick using the UPDATED engine
      console.log(`[DraftEngine] Processing bot picks on updated engine...`);
      const botResult = updatedEngine.processAvailableBotPicks();
      if (botResult.success) {
        console.log(`[DraftEngine] Bot processing successful, final state:`, {
          round: botResult.data.state.currentRound,
          pick: botResult.data.state.currentPick,
          status: botResult.data.state.status
        });
        setEngine(botResult.data);
        
        // Auto-save after bot processing
        persistence.save(botResult.data.state.id, botResult.data.serialize()).catch(err => {
          console.warn('Auto-save after bot processing failed:', err);
        });
      } else {
        console.error(`[DraftEngine] Bot processing failed:`, botResult.error);
      }
    }

    return updatedEngine !== null;
  }, [engine, applyAction, persistence]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const canMakePick = useCallback((cardId: string): boolean => {
    if (!engine) return false;
    const humanPlayerId = engine.state.config.humanPlayerId;
    return engine.canMakePick(humanPlayerId, cardId);
  }, [engine]);

  const getDraftId = useCallback((): string | null => {
    return engine?.state.id || null;
  }, [engine]);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load initial draft if provided
  useEffect(() => {
    if (initialDraftId && !engine) {
      loadDraft(initialDraftId);
    }
  }, [initialDraftId, engine, loadDraft]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // State
    engine,
    loading,
    error,
    ...derivedState,
    
    // Actions
    createDraft,
    loadDraft,
    saveDraft,
    addPlayer,
    addPlayerToEngine,
    startDraft,
    startDraftOnEngine,
    makePick,
    canMakePick,
    getDraftId,
    clearError
  };
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Hook for managing draft list (saved drafts)
 */
export function useDraftList() {
  const [drafts, setDrafts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const persistence = useMemo(() => createLocalStoragePersistence(), []);

  const loadDraftList = useCallback(async () => {
    setLoading(true);
    try {
      const draftList = await persistence.list();
      setDrafts(draftList);
    } catch (err) {
      console.error('Failed to load draft list:', err);
    } finally {
      setLoading(false);
    }
  }, [persistence]);

  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      const result = await persistence.delete(draftId);
      if (result) {
        await loadDraftList(); // Refresh list
      }
      return result;
    } catch (err) {
      console.error('Failed to delete draft:', err);
      return false;
    }
  }, [persistence, loadDraftList]);

  useEffect(() => {
    loadDraftList();
  }, [loadDraftList]);

  return {
    drafts,
    loading,
    loadDraftList,
    deleteDraft
  };
}

/**
 * Hook for draft URL management and navigation
 */
export function useDraftNavigation() {
  const updateURL = useCallback((draftId: string, round: number, pick: number) => {
    const url = `/draft/${draftId}/p${round}p${pick}`;
    window.history.pushState(null, '', url);
  }, []);

  const parseDraftURL = useCallback((pathname: string) => {
    const match = pathname.match(/^\/draft\/([^\/]+)\/p(\d+)p(\d+)$/);
    if (!match) return null;
    
    return {
      draftId: match[1],
      round: parseInt(match[2], 10),
      pick: parseInt(match[3], 10)
    };
  }, []);

  return {
    updateURL,
    parseDraftURL
  };
}