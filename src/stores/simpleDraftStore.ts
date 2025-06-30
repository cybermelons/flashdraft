/**
 * Simple Draft Store - UI State Only
 * 
 * Holds only current draft state for UI consumption.
 * No business logic - just a clean interface to DraftService.
 * Uses nanostores for reactive UI updates.
 */

import { atom } from 'nanostores';
import { draftService } from '../services/DraftService';
import { hardNavigateTo, browserHistory } from '../utils/navigation';
import type { SeededDraftState } from '../shared/types/seededDraftState';

// ============================================================================
// PURE UI STATE
// ============================================================================

/**
 * Current draft state atom
 * Only holds the current state - no business logic
 */
export const draftStore = atom<SeededDraftState | null>(null);

/**
 * Loading state for async operations
 */
export const draftLoadingStore = atom<boolean>(false);

/**
 * Error state for failed operations
 */
export const draftErrorStore = atom<string | null>(null);

// ============================================================================
// SIMPLE UI ACTIONS
// ============================================================================

/**
 * UI actions that interface with DraftService
 * Each action calls service, updates store, and handles navigation
 */
export const draftActions = {
  /**
   * Create a new draft from set code
   * Automatically starts the draft after creation
   */
  createDraft: async (setCode: string) => {
    try {
      draftLoadingStore.set(true);
      draftErrorStore.set(null);
      
      // Create and immediately start the draft
      const createdState = await draftService.createDraft(setCode);
      const startedState = await draftService.startDraft(createdState.seed);
      draftStore.set(startedState);
      
      // Navigate to p1p1
      hardNavigateTo(startedState);
      
      return startedState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create draft';
      draftErrorStore.set(errorMessage);
      throw error;
    } finally {
      draftLoadingStore.set(false);
    }
  },

  /**
   * Start an existing draft
   */
  startDraft: async () => {
    try {
      draftLoadingStore.set(true);
      draftErrorStore.set(null);
      
      const currentDraft = draftStore.get();
      if (!currentDraft) {
        throw new Error('No draft to start');
      }
      
      const newState = await draftService.startDraft(currentDraft.seed);
      draftStore.set(newState);
      
      // Navigate to p1p1
      hardNavigateTo(newState);
      
      return newState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start draft';
      draftErrorStore.set(errorMessage);
      throw error;
    } finally {
      draftLoadingStore.set(false);
    }
  },

  /**
   * Make a human pick
   * This is the main user interaction
   */
  makeHumanPick: async (cardId: string) => {
    try {
      draftLoadingStore.set(true);
      draftErrorStore.set(null);
      
      const currentDraft = draftStore.get();
      if (!currentDraft) {
        throw new Error('No active draft');
      }
      
      console.log(`[makeHumanPick] Processing pick for card ${cardId} in current state`);
      const newState = await draftService.makeHumanPick(currentDraft, cardId);
      draftStore.set(newState);
      
      // Navigate to next position after state is updated
      // But only if draft is still active (not complete)
      if (newState.status === 'active') {
        hardNavigateTo(newState);
      } else if (newState.status === 'complete') {
        // For completed drafts, stay at the last valid position (p3p15)
        const completedUrl = `/draft/${newState.seed}/p3p15`;
        browserHistory.replaceUrl(completedUrl);
      }
      
      return newState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to make pick';
      draftErrorStore.set(errorMessage);
      throw error;
    } finally {
      draftLoadingStore.set(false);
    }
  },

  /**
   * Navigate to a specific position
   * Used for URL-based navigation and Previous/Next buttons
   */
  loadPosition: async (seed: string, round: number, pick: number) => {
    try {
      draftLoadingStore.set(true);
      draftErrorStore.set(null);
      
      console.log(`[draftActions] Loading position ${seed} p${round}p${pick}`);
      const state = await draftService.navigateToPosition(seed, round, pick);
      console.log(`[draftActions] Loaded state, human player pack has ${state.players.find(p => p.isHuman)?.currentPack?.cards.length} cards`);
      draftStore.set(state);
      
      // No URL update - URL already reflects the target position
      return state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load position';
      draftErrorStore.set(errorMessage);
      throw error;
    } finally {
      draftLoadingStore.set(false);
    }
  },

  /**
   * Get current state without modifications
   * Useful for reading current state
   */
  getCurrentState: async (seed: string) => {
    try {
      draftLoadingStore.set(true);
      draftErrorStore.set(null);
      
      const state = await draftService.getCurrentState(seed);
      draftStore.set(state);
      
      return state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get current state';
      draftErrorStore.set(errorMessage);
      throw error;
    } finally {
      draftLoadingStore.set(false);
    }
  },

  /**
   * Reset draft state
   * Clears current draft from UI
   */
  reset: () => {
    draftStore.set(null);
    draftErrorStore.set(null);
    draftLoadingStore.set(false);
  },

  /**
   * Clear error state
   */
  clearError: () => {
    draftErrorStore.set(null);
  }
};

// ============================================================================
// SELECTOR HELPERS
// ============================================================================

/**
 * Get current player (human player)
 */
export function getCurrentPlayer(state: SeededDraftState | null) {
  if (!state) return null;
  return state.players.find(p => p.isHuman) || null;
}

/**
 * Get current pack for human player
 */
export function getCurrentPack(state: SeededDraftState | null) {
  const player = getCurrentPlayer(state);
  return player?.currentPack || null;
}

/**
 * Check if draft is in progress
 */
export function isDraftActive(state: SeededDraftState | null) {
  return state?.status === 'active';
}

/**
 * Check if draft is complete
 */
export function isDraftComplete(state: SeededDraftState | null) {
  return state?.status === 'complete';
}

/**
 * Get draft position string (e.g., "p1p3")
 */
export function getDraftPosition(state: SeededDraftState | null) {
  if (!state) return null;
  return `p${state.round}p${state.pick}`;
}

/**
 * Check if Previous navigation is available
 */
export function canNavigatePrevious(state: SeededDraftState | null) {
  if (!state) return false;
  return !(state.round === 1 && state.pick === 1);
}

/**
 * Check if Next navigation is available
 */
export function canNavigateNext(state: SeededDraftState | null) {
  if (!state) return false;
  
  // Calculate total picks made by human player
  const humanPlayer = getCurrentPlayer(state);
  const totalPicksMade = humanPlayer?.pickedCards.length || 0;
  
  // Calculate current position
  const currentPosition = (state.round - 1) * 15 + state.pick;
  
  // Can navigate next if there are more picks made beyond current position
  return currentPosition < totalPicksMade;
}

// ============================================================================
// REACT INTEGRATION HELPERS
// ============================================================================

/**
 * React hook for draft state (to be used with @nanostores/react)
 * 
 * Usage:
 * import { useStore } from '@nanostores/react';
 * const draft = useStore(draftStore);
 */
export { draftStore as useDraftStore };

/**
 * React hook for loading state
 */
export { draftLoadingStore as useDraftLoadingStore };

/**
 * React hook for error state
 */
export { draftErrorStore as useDraftErrorStore };