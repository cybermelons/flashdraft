/**
 * Seeded Draft State Types
 * 
 * New draft engine using deterministic seeds and delta storage.
 */

import type { DraftDelta, StoredDraftData } from './draftDelta';

export interface DraftCard {
  id: string;
  name: string;
  manaCost: string;
  imageUrl: string;
  rarity: string;
  colors: string[];
  cmc: number;
  instanceId: string;
}

export interface Pack {
  id: string;
  cards: DraftCard[];
}

export interface DraftPlayer {
  id: string;
  name: string;
  position: number; // 0-7
  isHuman: boolean;
  currentPack: Pack | null;
  pickedCards: DraftCard[];
  personality?: 'bronze' | 'silver' | 'gold' | 'mythic';
}

export interface MTGSetData {
  set_code?: string;
  name?: string;
  cards: any[];
  set_info?: {
    code: string;
    name: string;
  };
}

/**
 * Main draft state using seed-based approach
 */
export interface SeededDraftState {
  // Core identification
  id: string;              // Same as seed
  seed: string;            // Deterministic seed for replay
  
  // Current state
  status: 'setup' | 'active' | 'complete';
  round: 1 | 2 | 3;
  pick: number;            // 1-15 per round
  direction: 'clockwise' | 'counterclockwise';
  
  // Players and packs (computed from seed + deltas)
  players: DraftPlayer[];
  humanPlayerId: string;
  
  // Set data (for pack generation)
  setData: MTGSetData;
  
  // Pre-generated packs (all 24 packs created upfront)
  allPacks: Pack[][]; // [round][player]
  
  // Delta history
  deltas: DraftDelta[];
  
  // Metadata
  createdAt: number;
  lastModified: number;
}

/**
 * Draft creation parameters
 */
export interface CreateSeededDraftParams {
  seed?: string;           // Optional seed (will generate if not provided)
  setData: MTGSetData;
  humanPlayerId?: string;
}

/**
 * Draft replay parameters
 */
export interface ReplayDraftParams {
  seed: string;
  setData: MTGSetData;
  deltas: DraftDelta[];
  targetPosition?: number; // Replay up to specific position
}

/**
 * Draft navigation result
 */
export interface DraftNavigationResult {
  success: boolean;
  state?: SeededDraftState;
  error?: string;
}

/**
 * Draft statistics (computed from deltas)
 */
export interface DraftStatistics {
  totalPicks: number;
  averagePickTime: number;
  colorDistribution: Record<string, number>;
  rarityDistribution: Record<string, number>;
  botPerformance: Record<string, {
    averagePickTime: number;
    colorPreferences: Record<string, number>;
  }>;
}

/**
 * Convert seeded draft state to storage format
 */
export function draftToStorageFormat(draft: SeededDraftState): StoredDraftData {
  return {
    id: draft.id,
    seed: draft.seed,
    set_code: draft.setData.set_code || draft.setData.set_info?.code || 'UNKNOWN',
    set_name: draft.setData.name || draft.setData.set_info?.name || 'Unknown Set',
    created_at: draft.createdAt,
    player_count: draft.players.length,
    round_count: 3,
    deltas: draft.deltas.map(delta => ({
      event_type: delta.event_type,
      pack_number: delta.pack_number,
      pick_number: delta.pick_number,
      pick: delta.pick,
      player_id: delta.player_id,
      timestamp: delta.timestamp,
      pick_time_ms: delta.pick_time_ms
    })),
    status: draft.status,
    current_pick: draft.deltas.length
  };
}

/**
 * Calculate draft position from round and pick
 */
export function calculateDraftPosition(round: number, pick: number): number {
  return (round - 1) * 15 + pick;
}

/**
 * Calculate round and pick from draft position
 */
export function calculateRoundAndPick(position: number): { round: number; pick: number } {
  const round = Math.floor((position - 1) / 15) + 1;
  const pick = ((position - 1) % 15) + 1;
  return { round, pick };
}

/**
 * Get pack passing direction for a round
 */
export function getPackDirection(round: number): 'clockwise' | 'counterclockwise' {
  return round === 2 ? 'counterclockwise' : 'clockwise';
}

/**
 * Calculate next player position for pack passing
 */
export function getNextPlayerPosition(
  currentPosition: number, 
  direction: 'clockwise' | 'counterclockwise',
  playerCount: number = 8
): number {
  if (direction === 'clockwise') {
    return (currentPosition + 1) % playerCount;
  } else {
    return (currentPosition - 1 + playerCount) % playerCount;
  }
}

/**
 * Calculate previous player position for pack passing
 */
export function getPreviousPlayerPosition(
  currentPosition: number,
  direction: 'clockwise' | 'counterclockwise', 
  playerCount: number = 8
): number {
  if (direction === 'clockwise') {
    return (currentPosition - 1 + playerCount) % playerCount;
  } else {
    return (currentPosition + 1) % playerCount;
  }
}

/**
 * Validate seeded draft state
 */
export function isValidSeededDraftState(state: any): state is SeededDraftState {
  return (
    typeof state === 'object' &&
    typeof state.id === 'string' &&
    typeof state.seed === 'string' &&
    typeof state.status === 'string' &&
    ['setup', 'active', 'complete'].includes(state.status) &&
    typeof state.round === 'number' &&
    state.round >= 1 && state.round <= 3 &&
    typeof state.pick === 'number' &&
    state.pick >= 1 && state.pick <= 15 &&
    Array.isArray(state.players) &&
    state.players.length === 8 &&
    Array.isArray(state.deltas) &&
    typeof state.createdAt === 'number'
  );
}