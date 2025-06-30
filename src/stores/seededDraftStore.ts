/**
 * Seeded Draft Store - Bridge between Nanostores and Seeded Engine
 * 
 * This provides a nanostore interface for the UI while using the optimized
 * seeded storage system underneath for persistence.
 */

import { atom } from 'nanostores';
import type { SeededDraftState, MTGSetData } from '../shared/types/seededDraftState';
import type { DraftDelta } from '../shared/types/draftDelta';
import { 
  createSeededDraft, 
  startSeededDraft, 
  replayDraftToPosition,
  applyDelta,
  navigateToPosition 
} from '../shared/utils/draftReplayEngine';
import { 
  saveSeededDraft, 
  loadSeededDraftWithSetData,
  getDraftMetadataList,
  draftExists,
  deleteSeededDraft 
} from '../shared/utils/seededDraftStorage';
import { createDraftDelta } from '../shared/types/draftDelta';

// ============================================================================
// NANOSTORES
// ============================================================================

export const seededDraftStore = atom<SeededDraftState | null>(null);

// ============================================================================
// STORE ACTIONS
// ============================================================================

export const seededDraftActions = {
  /**
   * Create a new seeded draft
   */
  create: (setData: MTGSetData, seed?: string) => {
    const setCode = setData.set_code || setData.set_info?.code || 'UNKNOWN';
    console.log('[SeededDraftStore] Creating seeded draft with set:', setCode, 'Cards:', setData.cards?.length || 0);
    
    const newDraft = createSeededDraft({ seed, setData });
    seededDraftStore.set(newDraft);
    saveSeededDraft(newDraft);
    
    return newDraft;
  },

  /**
   * Start the draft by distributing initial packs
   */
  start: () => {
    const current = seededDraftStore.get();
    if (!current) throw new Error('No draft to start');
    
    const setCode = current.setData.set_code || current.setData.set_info?.code || 'UNKNOWN';
    console.log('[SeededDraftStore] Starting seeded draft with set:', setCode);
    
    const started = startSeededDraft(current);
    seededDraftStore.set(started);
    saveSeededDraft(started);
    
    // Update URL to p1p1 when draft starts
    updateDraftUrl(started);
    
    return started;
  },

  /**
   * Process a human pick
   */
  pick: (cardId: string) => {
    const current = seededDraftStore.get();
    if (!current) throw new Error('No active draft');
    if (current.status !== 'active') throw new Error('Draft must be active to make picks');
    
    // Create delta for the human pick
    const delta = createDraftDelta(
      'pick',
      current.round,
      current.pick,
      current.deltas.length + 1,
      cardId,
      current.humanPlayerId
    );
    
    // Apply the delta to get updated state
    const updated = applyDelta(current, delta);
    seededDraftStore.set(updated);
    saveSeededDraft(updated);
    
    // Update URL after human pick
    updateDraftUrl(updated);
    
    return updated;
  },

  /**
   * Load an existing seeded draft
   */
  load: async (draftId: string, setData: MTGSetData) => {
    console.log(`[SeededDraftStore] Loading seeded draft: ${draftId}`);
    
    const draft = await loadSeededDraftWithSetData(draftId, setData);
    if (draft) {
      seededDraftStore.set(draft);
      return draft;
    }
    return null;
  },

  /**
   * Navigate to a specific position in the draft
   */
  navigateToPosition: async (draftId: string, targetRound: number, targetPick: number, setData?: MTGSetData) => {
    console.log(`[SeededDraftStore] Navigating to position p${targetRound}p${targetPick} for draft ${draftId}`);
    
    // First try to get from current store
    let currentDraft = seededDraftStore.get();
    let draft: SeededDraftState | null = null;
    
    if (currentDraft && currentDraft.seed === draftId) {
      console.log(`[SeededDraftStore] Using draft from store`);
      draft = currentDraft;
    } else if (setData) {
      // Try to load from storage first
      console.log(`[SeededDraftStore] Trying to load draft from storage`);
      draft = await loadSeededDraftWithSetData(draftId, setData);
      
      if (!draft) {
        // Draft doesn't exist - create it fresh from the seed!
        // This is the magic of deterministic drafts - we can always recreate them
        console.log(`[SeededDraftStore] Draft not found, creating fresh draft from seed ${draftId}`);
        draft = createSeededDraft({ seed: draftId, setData });
        // Don't start it here - let replayDraftToPosition handle the start
        
        // Save the setup draft for future use
        saveSeededDraft(draft);
      }
    } else {
      console.error(`[SeededDraftStore] No setData provided and draft not in store`);
      return { success: false, error: 'Set data required to load draft' };
    }
    
    // Use the replay engine to navigate to the position
    console.log(`[SeededDraftStore] Navigating with deltas:`, draft.deltas.length);
    const result = navigateToPosition(draft.seed, draft.setData, draft.deltas, targetRound, targetPick);
    
    if (result.success && result.state) {
      console.log(`[SeededDraftStore] Successfully navigated to position p${targetRound}p${targetPick}`);
      seededDraftStore.set(result.state);
      return { success: true };
    }
    
    console.error(`[SeededDraftStore] Failed to navigate: ${result.error}`);
    return { success: false, error: result.error };
  },

  /**
   * Reset the store
   */
  reset: () => {
    seededDraftStore.set(null);
  },

  /**
   * Get list of all saved drafts
   */
  listDrafts: () => {
    return getDraftMetadataList();
  },

  /**
   * Check if a draft exists
   */
  exists: (seed: string) => {
    return draftExists(seed);
  },

  /**
   * Delete a draft
   */
  delete: (seed: string) => {
    const success = deleteSeededDraft(seed);
    
    // If this was the current draft, reset the store
    const current = seededDraftStore.get();
    if (current && current.seed === seed) {
      seededDraftStore.set(null);
    }
    
    return success;
  },

  /**
   * Get current draft state
   */
  get: () => {
    return seededDraftStore.get();
  },

  /**
   * Subscribe to draft state changes
   */
  subscribe: (callback: (draft: SeededDraftState | null) => void) => {
    return seededDraftStore.subscribe(callback);
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update browser URL to match current draft position
 */
function updateDraftUrl(draft: SeededDraftState) {
  if (typeof window === 'undefined' || !window.history) return;
  
  const newUrl = `/draft/${draft.seed}/p${draft.round}p${draft.pick}`;
  window.history.replaceState({}, '', newUrl);
}


// ============================================================================
// EXPORTS
// ============================================================================

export default seededDraftActions;