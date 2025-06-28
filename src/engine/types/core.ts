/**
 * Core types for the Draft Session Engine
 * 
 * Pure TypeScript types with no UI dependencies.
 * These define the structure of a draft session.
 */

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

export interface DraftSession {
  // Immutable state
  readonly state: DraftState;
  
  // Query methods (pure, no side effects)
  getCurrentPack(playerId: string): Pack | null;
  getPlayerCards(playerId: string): Card[];
  getAvailableActions(playerId: string): DraftAction[];
  canMakePick(playerId: string, cardId: string): boolean;
  getDraftStatus(): DraftStatus;
  
  // Action methods (return new session instance)
  applyAction(action: DraftAction): ActionResult<DraftSession>;
  
  // Serialization
  serialize(): string;
}

export interface DraftState {
  id: string;
  config: DraftConfig;
  players: Player[];
  packs: Pack[][]; // [round][packIndex] - all 3 rounds pre-generated
  currentRound: number; // 1, 2, or 3
  currentPick: number; // 1-15
  direction: 'clockwise' | 'counterclockwise';
  status: DraftStatus;
  history: DraftAction[]; // All actions taken
  createdAt: number;
  updatedAt: number;
}

export interface DraftConfig {
  setCode: string;
  setData: MTGSetData;
  playerCount: number;
  humanPlayerId: string;
  botPersonalities: BotPersonality[];
}

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  position: number; // 0-7 seat position
  pickedCards: Card[];
  personality?: BotPersonality; // For bot players
  currentPack?: Pack | null; // Pack currently being drafted
}

export interface Pack {
  id: string;
  cards: Card[];
  round: number;
  originalPlayerPosition: number;
}

// ============================================================================
// ACTION SYSTEM
// ============================================================================

export type DraftAction = 
  | { type: 'ADD_PLAYER'; playerId: string; name: string; isHuman: boolean; personality?: BotPersonality }
  | { type: 'START_DRAFT' }
  | { type: 'MAKE_PICK'; playerId: string; cardId: string }
  | { type: 'TIME_OUT_PICK'; playerId: string } // Auto-pick for timer
  | { type: 'UNDO_LAST_ACTION' }; // For development/testing

// Re-export error types from errors module
export type { ActionResult, DraftError } from './errors';

// ============================================================================
// DRAFT STATUS & METADATA
// ============================================================================

export type DraftStatus = 'setup' | 'active' | 'complete';

export interface DraftContext {
  round: number;
  pick: number;
  packPosition: number;
  direction: 'clockwise' | 'counterclockwise';
  totalPlayers: number;
}

// ============================================================================
// BOT INTEGRATION
// ============================================================================

export type BotPersonality = 'bronze' | 'silver' | 'gold' | 'mythic';

export interface DraftBot {
  selectCard(
    availableCards: Card[],
    pickedCards: Card[],
    draftContext: DraftContext,
    personality: BotPersonality
  ): Card;
}

// ============================================================================
// CARD TYPES (imported from existing system)
// ============================================================================

// Re-export existing card types for the engine
export type { MTGCard as Card, MTGSetData, DraftCard } from '../../shared/types/card';

// ============================================================================
// SERIALIZATION
// ============================================================================

export interface SerializedDraft {
  id: string; // Original draft ID
  config: DraftConfig;
  history: DraftAction[];
  timestamp: number;
  version: string; // For migration compatibility
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface DraftProgress {
  totalPicks: number;
  completedPicks: number;
  currentRound: number;
  currentPick: number;
  percentComplete: number;
}

export interface PackPassingInfo {
  fromPlayer: number;
  toPlayer: number;
  round: number;
  pick: number;
}