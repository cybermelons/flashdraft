/**
 * Hard Navigation Utilities
 * 
 * Browser-based navigation that creates proper history entries.
 * Each draft position gets its own URL for bookmarking and back/forward support.
 */

import type { SeededDraftState } from '../shared/types/seededDraftState';

/**
 * Hard navigate to a draft position
 * Creates a new browser history entry for proper back/forward support
 */
export function hardNavigateTo(state: SeededDraftState): void {
  if (typeof window === 'undefined') return; // Server-side safety
  
  const url = `/draft/${state.seed}/p${state.round}p${state.pick}`;
  
  // Use window.location.href for hard navigation
  // This creates a new browser history entry
  window.location.href = url;
}

/**
 * Navigate to previous position
 * Creates proper link URL for previous pick
 */
export function getPreviousPositionUrl(state: SeededDraftState | null): string | null {
  if (!state) return null;
  
  // Can't go before p1p1
  if (state.round === 1 && state.pick === 1) {
    return null;
  }
  
  let prevRound = state.round;
  let prevPick = state.pick - 1;
  
  // Handle round boundaries
  if (prevPick < 1) {
    prevRound = Math.max(1, state.round - 1);
    prevPick = 15; // Last pick of previous round
  }
  
  return `/draft/${state.seed}/p${prevRound}p${prevPick}`;
}

/**
 * Navigate to next position
 * Creates proper link URL for next pick
 */
export function getNextPositionUrl(state: SeededDraftState | null): string | null {
  if (!state) return null;
  
  // Calculate if next position exists
  const humanPlayer = state.players.find(p => p.isHuman);
  const totalPicksMade = humanPlayer?.pickedCards.length || 0;
  const currentPosition = (state.round - 1) * 15 + state.pick;
  
  // Can't go beyond picks that have been made
  if (currentPosition >= totalPicksMade) {
    return null;
  }
  
  let nextRound = state.round;
  let nextPick = state.pick + 1;
  
  // Handle round boundaries
  if (nextPick > 15) {
    nextRound = Math.min(3, state.round + 1);
    nextPick = 1; // First pick of next round
  }
  
  return `/draft/${state.seed}/p${nextRound}p${nextPick}`;
}

/**
 * Parse draft URL to extract route parameters
 * Handles URLs like: /draft/abc123/p1p3
 */
export interface DraftRouteParams {
  seed: string;
  round: number;
  pick: number;
}

export function parseDraftUrl(pathname: string): DraftRouteParams | null {
  // Match pattern: /draft/{seed}/p{round}p{pick}
  const match = pathname.match(/^\/draft\/([^\/]+)\/p(\d+)p(\d+)$/);
  
  if (!match) return null;
  
  const [, seed, roundStr, pickStr] = match;
  const round = parseInt(roundStr);
  const pick = parseInt(pickStr);
  
  // Validate round and pick bounds
  if (round < 1 || round > 3 || pick < 1 || pick > 15) {
    return null;
  }
  
  return { seed, round, pick };
}

/**
 * Check if current URL is a draft position URL
 */
export function isDraftPositionUrl(pathname: string): boolean {
  return parseDraftUrl(pathname) !== null;
}

/**
 * Create draft position URL
 */
export function createDraftPositionUrl(seed: string, round: number, pick: number): string {
  return `/draft/${seed}/p${round}p${pick}`;
}

/**
 * Navigation link props for React components
 * Provides href and onClick handlers for proper navigation
 */
export interface NavigationLinkProps {
  href: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

/**
 * Get Previous button props
 */
export function getPreviousLinkProps(state: SeededDraftState | null): NavigationLinkProps | null {
  const href = getPreviousPositionUrl(state);
  
  if (!href) return null;
  
  return {
    href,
    onClick: (e: React.MouseEvent) => {
      // Let browser handle navigation naturally
      // This creates proper history entry
    }
  };
}

/**
 * Get Next button props
 */
export function getNextLinkProps(state: SeededDraftState | null): NavigationLinkProps | null {
  const href = getNextPositionUrl(state);
  
  if (!href) return null;
  
  return {
    href,
    onClick: (e: React.MouseEvent) => {
      // Let browser handle navigation naturally
      // This creates proper history entry
    }
  };
}

/**
 * Browser history utilities
 */
export const browserHistory = {
  /**
   * Replace current URL without navigation
   * Useful for updating URL after state changes
   */
  replaceUrl: (url: string) => {
    if (typeof window === 'undefined') return;
    window.history.replaceState({}, '', url);
  },
  
  /**
   * Push new URL to history
   * Creates new history entry
   */
  pushUrl: (url: string) => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', url);
  },
  
  /**
   * Get current pathname
   */
  getCurrentPath: (): string => {
    if (typeof window === 'undefined') return '';
    return window.location.pathname;
  }
};

/**
 * Utility for components to handle draft navigation
 * Provides both imperative and declarative navigation options
 */
export const draftNavigation = {
  hardNavigateTo,
  getPreviousPositionUrl,
  getNextPositionUrl,
  parseDraftUrl,
  isDraftPositionUrl,
  createDraftPositionUrl,
  getPreviousLinkProps,
  getNextLinkProps,
  browserHistory
};