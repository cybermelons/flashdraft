/**
 * FlashDraft - Draft Persistence
 * 
 * Utilities for persisting and restoring draft state using localStorage.
 */

import type { DraftState, DraftPlayer } from '../../frontend/stores/draftStore.js';

const STORAGE_PREFIX = 'flashdraft_';
const CURRENT_DRAFT_KEY = `${STORAGE_PREFIX}current_draft`;
const DRAFT_LIST_KEY = `${STORAGE_PREFIX}draft_list`;
const DRAFT_DATA_PREFIX = `${STORAGE_PREFIX}draft_`;

export interface PersistedDraft {
  id: string;
  created_at: string;
  updated_at: string;
  set_code: string;
  round: number;
  pick: number;
  human_player_picks: number;
  completed: boolean;
  title?: string; // User-defined title
}

export interface PersistedDraftState extends Omit<DraftState, 'set_data'> {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generate a unique draft ID
 */
export function generateDraftId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}`;
}

/**
 * Save draft state to localStorage
 */
export function saveDraftState(state: DraftState, draftId?: string): string {
  try {
    const id = draftId || generateDraftId();
    const now = new Date().toISOString();
    
    const persistedState: PersistedDraftState = {
      ...state,
      id,
      created_at: draftId ? getExistingDraft(id)?.created_at || now : now,
      updated_at: now,
    };
    
    // Save the full draft state
    localStorage.setItem(`${DRAFT_DATA_PREFIX}${id}`, JSON.stringify(persistedState));
    
    // Update the current draft pointer
    localStorage.setItem(CURRENT_DRAFT_KEY, id);
    
    // Update the draft list
    updateDraftList(id, state);
    
    return id;
  } catch (error) {
    console.error('Failed to save draft state:', error);
    throw new Error('Failed to save draft');
  }
}

/**
 * Load draft state from localStorage
 */
export function loadDraftState(draftId: string): PersistedDraftState | null {
  try {
    const data = localStorage.getItem(`${DRAFT_DATA_PREFIX}${draftId}`);
    if (!data) return null;
    
    return JSON.parse(data) as PersistedDraftState;
  } catch (error) {
    console.error('Failed to load draft state:', error);
    return null;
  }
}

/**
 * Get the current active draft ID
 */
export function getCurrentDraftId(): string | null {
  return localStorage.getItem(CURRENT_DRAFT_KEY);
}

/**
 * Load the current active draft
 */
export function loadCurrentDraft(): PersistedDraftState | null {
  const currentId = getCurrentDraftId();
  if (!currentId) return null;
  
  return loadDraftState(currentId);
}

/**
 * Get list of all saved drafts
 */
export function getDraftList(): PersistedDraft[] {
  try {
    const data = localStorage.getItem(DRAFT_LIST_KEY);
    if (!data) return [];
    
    const list = JSON.parse(data) as PersistedDraft[];
    // Sort by most recent first
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch (error) {
    console.error('Failed to load draft list:', error);
    return [];
  }
}

/**
 * Update the draft list with current draft info
 */
function updateDraftList(draftId: string, state: DraftState): void {
  const list = getDraftList();
  const humanPlayer = state.players.find(p => p.is_human);
  
  const existingIndex = list.findIndex(d => d.id === draftId);
  const draftInfo: PersistedDraft = {
    id: draftId,
    created_at: existingIndex >= 0 ? list[existingIndex].created_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
    set_code: state.set_code,
    round: state.current_round,
    pick: state.current_pick,
    human_player_picks: humanPlayer?.total_picks || 0,
    completed: state.draft_completed,
    title: existingIndex >= 0 ? list[existingIndex].title : undefined,
  };
  
  if (existingIndex >= 0) {
    list[existingIndex] = draftInfo;
  } else {
    list.push(draftInfo);
  }
  
  localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(list));
}

/**
 * Delete a draft from storage
 */
export function deleteDraft(draftId: string): void {
  try {
    // Remove the draft data
    localStorage.removeItem(`${DRAFT_DATA_PREFIX}${draftId}`);
    
    // Update the draft list
    const list = getDraftList();
    const filteredList = list.filter(d => d.id !== draftId);
    localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(filteredList));
    
    // If this was the current draft, clear the current pointer
    if (getCurrentDraftId() === draftId) {
      localStorage.removeItem(CURRENT_DRAFT_KEY);
    }
  } catch (error) {
    console.error('Failed to delete draft:', error);
    throw new Error('Failed to delete draft');
  }
}

/**
 * Update draft title
 */
export function updateDraftTitle(draftId: string, title: string): void {
  const list = getDraftList();
  const existingIndex = list.findIndex(d => d.id === draftId);
  
  if (existingIndex >= 0) {
    list[existingIndex].title = title;
    list[existingIndex].updated_at = new Date().toISOString();
    localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(list));
  }
}

/**
 * Get existing draft metadata
 */
function getExistingDraft(draftId: string): PersistedDraft | undefined {
  const list = getDraftList();
  return list.find(d => d.id === draftId);
}

/**
 * Clear all draft data (for testing/cleanup)
 */
export function clearAllDrafts(): void {
  const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
  keys.forEach(key => localStorage.removeItem(key));
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { totalDrafts: number; currentDraftId: string | null; storageUsed: number } {
  const totalDrafts = getDraftList().length;
  const currentDraftId = getCurrentDraftId();
  
  // Calculate approximate storage used
  let storageUsed = 0;
  const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      storageUsed += key.length + value.length;
    }
  });
  
  return {
    totalDrafts,
    currentDraftId,
    storageUsed, // in characters
  };
}