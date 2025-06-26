/**
 * FlashDraft - Draft URL Management
 * 
 * Utilities for encoding and decoding draft state in URLs,
 * similar to 17lands permalink functionality.
 */

import type { DraftPlayer } from '../../frontend/stores/draftStore.js';

export interface DraftUrlState {
  set_code: string;
  round: number;
  pick: number;
  seat: number; // Human player seat (0-7)
  picks?: string[]; // Card IDs picked so far
  pack_seed?: string; // For reproducible pack generation
}

/**
 * Encode draft state into a URL-safe string
 */
export function encodeDraftState(state: DraftUrlState): string {
  const params = new URLSearchParams();
  
  params.set('set', state.set_code.toUpperCase());
  params.set('r', state.round.toString());
  params.set('p', state.pick.toString());
  params.set('s', state.seat.toString());
  
  if (state.picks && state.picks.length > 0) {
    // Compress picks using first 8 characters of each card ID
    const shortPicks = state.picks.map(id => id.substring(0, 8));
    params.set('picks', shortPicks.join(','));
  }
  
  if (state.pack_seed) {
    params.set('seed', state.pack_seed);
  }
  
  return params.toString();
}

/**
 * Decode draft state from URL parameters
 */
export function decodeDraftState(urlParams: string | URLSearchParams): DraftUrlState | null {
  try {
    const params = typeof urlParams === 'string' 
      ? new URLSearchParams(urlParams)
      : urlParams;
    
    const set_code = params.get('set');
    const round = params.get('r');
    const pick = params.get('p');
    const seat = params.get('s');
    
    if (!set_code || !round || !pick || !seat) {
      return null;
    }
    
    const state: DraftUrlState = {
      set_code: set_code.toUpperCase(),
      round: parseInt(round, 10),
      pick: parseInt(pick, 10),
      seat: parseInt(seat, 10),
    };
    
    // Validate ranges
    if (state.round < 1 || state.round > 3) return null;
    if (state.pick < 1 || state.pick > 15) return null;
    if (state.seat < 0 || state.seat > 7) return null;
    
    const picks = params.get('picks');
    if (picks) {
      state.picks = picks.split(',').filter(Boolean);
    }
    
    const seed = params.get('seed');
    if (seed) {
      state.pack_seed = seed;
    }
    
    return state;
  } catch (error) {
    console.warn('Failed to decode draft state from URL:', error);
    return null;
  }
}

/**
 * Generate a permalink URL for the current draft state
 */
export function generatePermalink(
  baseUrl: string,
  humanPlayer: DraftPlayer,
  currentRound: number,
  currentPick: number
): string {
  const state: DraftUrlState = {
    set_code: 'DTK', // TODO: Get from draft store
    round: currentRound,
    pick: currentPick,
    seat: humanPlayer.position,
    picks: humanPlayer.picked_cards.map(card => card.id),
  };
  
  const encoded = encodeDraftState(state);
  const url = new URL(baseUrl);
  url.search = encoded;
  
  return url.toString();
}

/**
 * Extract draft state from current browser URL
 */
export function getDraftStateFromUrl(): DraftUrlState | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return decodeDraftState(params);
}

/**
 * Update browser URL with current draft state (without navigation)
 */
export function updateUrlWithDraftState(state: DraftUrlState): void {
  if (typeof window === 'undefined') return;
  
  const encoded = encodeDraftState(state);
  const newUrl = `${window.location.pathname}?${encoded}`;
  
  // Update URL without triggering navigation
  window.history.replaceState({}, '', newUrl);
}

/**
 * Generate a shareable draft URL for social sharing
 */
export function createShareableUrl(
  humanPlayer: DraftPlayer,
  currentRound: number,
  currentPick: number,
  setCode: string
): string {
  const state: DraftUrlState = {
    set_code: setCode,
    round: currentRound,
    pick: currentPick,
    seat: humanPlayer.position,
    picks: humanPlayer.picked_cards.map(card => card.id),
  };
  
  // Use current domain or default to localhost for development
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}/draft`
    : 'http://localhost:4321/draft';
  
  const encoded = encodeDraftState(state);
  return `${baseUrl}?${encoded}`;
}

/**
 * Parse a draft URL and validate it
 */
export function validateDraftUrl(url: string): { valid: boolean; state?: DraftUrlState; error?: string } {
  try {
    const urlObj = new URL(url);
    const state = decodeDraftState(urlObj.searchParams);
    
    if (!state) {
      return { valid: false, error: 'Invalid or missing draft parameters' };
    }
    
    return { valid: true, state };
  } catch (error) {
    return { valid: false, error: 'Malformed URL' };
  }
}

/**
 * Generate a compact draft ID for short URLs (like bit.ly)
 */
export function generateDraftId(state: DraftUrlState): string {
  const data = `${state.set_code}-${state.round}-${state.pick}-${state.seat}`;
  const hash = hashString(data);
  return hash.substring(0, 8);
}

/**
 * Simple hash function for generating short IDs
 */
function hashString(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(36);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}