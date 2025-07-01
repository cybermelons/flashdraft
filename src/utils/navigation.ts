/**
 * Navigation Utilities - URL parsing and draft position handling
 * 
 * Handles URL structure: /draft/{draftId}/p{round}p{pick}
 * Provides utilities for navigation, position parsing, and URL generation.
 */

export interface DraftPosition {
  round: number;
  pick: number;
}

export interface DraftRoute {
  draftId: string;
  position?: DraftPosition;
}

export interface ParsedDraftURL {
  draftId: string | null;
  round: number | null;
  pick: number | null;
  isValid: boolean;
  error?: string;
}

/**
 * Parse draft URL path to extract draft ID and position
 */
export function parseDraftURL(pathname: string): ParsedDraftURL {
  // Remove leading/trailing slashes and split
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
  
  // Basic validation: should start with 'draft'
  if (segments[0] !== 'draft') {
    return {
      draftId: null,
      round: null,
      pick: null,
      isValid: false,
      error: 'URL does not start with /draft',
    };
  }
  
  // Extract draft ID
  const draftId = segments[1];
  if (!draftId) {
    return {
      draftId: null,
      round: null,
      pick: null,
      isValid: false,
      error: 'No draft ID provided',
    };
  }
  
  // Check for position (optional)
  const positionSegment = segments[2];
  
  if (!positionSegment) {
    // Just draft ID, no position
    return {
      draftId,
      round: null,
      pick: null,
      isValid: true,
    };
  }
  
  // Parse position format: p{round}p{pick}
  const positionMatch = positionSegment.match(/^p(\d+)p(\d+)$/);
  if (!positionMatch) {
    return {
      draftId,
      round: null,
      pick: null,
      isValid: false,
      error: `Invalid position format: ${positionSegment}. Expected p{round}p{pick}`,
    };
  }
  
  const round = parseInt(positionMatch[1], 10);
  const pick = parseInt(positionMatch[2], 10);
  
  // Validate round and pick ranges
  if (round < 1 || round > 3) {
    return {
      draftId,
      round,
      pick,
      isValid: false,
      error: `Invalid round: ${round}. Must be 1-3`,
    };
  }
  
  if (pick < 1 || pick > 15) {
    return {
      draftId,
      round,
      pick,
      isValid: false,
      error: `Invalid pick: ${pick}. Must be 1-15`,
    };
  }
  
  return {
    draftId,
    round,
    pick,
    isValid: true,
  };
}

/**
 * Generate draft URL from draft ID and optional position
 */
export function generateDraftURL(draftId: string, position?: DraftPosition): string {
  let url = `/draft/${draftId}`;
  
  if (position) {
    url += `/p${position.round}p${position.pick}`;
  }
  
  return url;
}

/**
 * Get next position in draft sequence
 */
export function getNextPosition(round: number, pick: number): DraftPosition | null {
  // Last pick of round 3
  if (round === 3 && pick === 15) {
    return null; // Draft complete
  }
  
  // Last pick of round, move to next round
  if (pick === 15) {
    return { round: round + 1, pick: 1 };
  }
  
  // Next pick in same round
  return { round, pick: pick + 1 };
}

/**
 * Get previous position in draft sequence
 */
export function getPreviousPosition(round: number, pick: number): DraftPosition | null {
  // First pick of round 1
  if (round === 1 && pick === 1) {
    return null; // Start of draft
  }
  
  // First pick of round, move to previous round's last pick
  if (pick === 1) {
    return { round: round - 1, pick: 15 };
  }
  
  // Previous pick in same round
  return { round, pick: pick - 1 };
}

/**
 * Calculate total picks completed
 */
export function getTotalPicks(round: number, pick: number): number {
  return (round - 1) * 15 + pick;
}

/**
 * Calculate progress percentage (0-100)
 */
export function getProgressPercentage(round: number, pick: number): number {
  const totalPicks = getTotalPicks(round, pick);
  const maxPicks = 45; // 3 rounds × 15 picks
  return Math.min(100, (totalPicks / maxPicks) * 100);
}

/**
 * Check if position is valid
 */
export function isValidPosition(round: number, pick: number): boolean {
  return round >= 1 && round <= 3 && pick >= 1 && pick <= 15;
}

/**
 * Get all valid positions for a draft
 */
export function getAllPositions(): DraftPosition[] {
  const positions: DraftPosition[] = [];
  
  for (let round = 1; round <= 3; round++) {
    for (let pick = 1; pick <= 15; pick++) {
      positions.push({ round, pick });
    }
  }
  
  return positions;
}

/**
 * Find position by total pick number
 */
export function getPositionByPickNumber(pickNumber: number): DraftPosition | null {
  if (pickNumber < 1 || pickNumber > 45) {
    return null;
  }
  
  const round = Math.ceil(pickNumber / 15);
  const pick = pickNumber - (round - 1) * 15;
  
  return { round, pick };
}

/**
 * Navigation helper for components
 */
export class DraftNavigator {
  constructor(private draftId: string) {}
  
  /**
   * Generate URL for current draft
   */
  toPosition(position?: DraftPosition): string {
    return generateDraftURL(this.draftId, position);
  }
  
  /**
   * Generate URL for specific round/pick
   */
  toRoundPick(round: number, pick: number): string {
    return this.toPosition({ round, pick });
  }
  
  /**
   * Generate URL for next position
   */
  toNext(currentRound: number, currentPick: number): string | null {
    const next = getNextPosition(currentRound, currentPick);
    return next ? this.toPosition(next) : null;
  }
  
  /**
   * Generate URL for previous position
   */
  toPrevious(currentRound: number, currentPick: number): string | null {
    const previous = getPreviousPosition(currentRound, currentPick);
    return previous ? this.toPosition(previous) : null;
  }
  
  /**
   * Generate URL for draft overview (no position)
   */
  toOverview(): string {
    return this.toPosition();
  }
}

/**
 * Browser navigation utilities
 */
export const browserNavigation = {
  /**
   * Navigate to draft position with history push
   */
  goToPosition(draftId: string, position?: DraftPosition): void {
    const url = generateDraftURL(draftId, position);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', url);
    }
  },
  
  /**
   * Replace current URL with draft position
   */
  replacePosition(draftId: string, position?: DraftPosition): void {
    const url = generateDraftURL(draftId, position);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', url);
    }
  },
  
  /**
   * Go back in browser history
   */
  goBack(): void {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  },
  
  /**
   * Go forward in browser history
   */
  goForward(): void {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  },
  
  /**
   * Get current URL path
   */
  getCurrentPath(): string {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  },
  
  /**
   * Parse current URL
   */
  parseCurrentURL(): ParsedDraftURL {
    return parseDraftURL(this.getCurrentPath());
  }
};