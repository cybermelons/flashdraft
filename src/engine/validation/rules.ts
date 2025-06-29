/**
 * Validation rules for draft actions and state
 * 
 * Pure functions that validate draft operations without side effects.
 */

import type { DraftState, DraftAction, Player, Pack, Card } from '../types/core';
import type { DraftError, ActionResult } from '../types/errors';
import { DraftErrors } from '../types/errors';

// ============================================================================
// CORE VALIDATION FUNCTIONS
// ============================================================================

export function validateMakePick(
  state: DraftState, 
  playerId: string, 
  cardId: string
): ActionResult<void> {
  // 1. Draft must be active
  if (state.status !== 'active') {
    return {
      success: false,
      error: DraftErrors.draftNotActive(state.status)
    };
  }

  // 2. Player must exist
  const player = getPlayer(state, playerId);
  if (!player) {
    return {
      success: false,
      error: DraftErrors.playerNotFound(playerId)
    };
  }

  // 3. Player must have a current pack
  const pack = getCurrentPackForPlayer(state, playerId);
  if (!pack) {
    return {
      success: false,
      error: DraftErrors.noPackAvailable(playerId, state.currentRound)
    };
  }

  // 4. Card must be in player's current pack
  const cardExists = pack.cards.some(card => card.id === cardId);
  if (!cardExists) {
    const availableCardIds = pack.cards.map(card => card.id);
    return {
      success: false,
      error: DraftErrors.cardNotAvailable(cardId, availableCardIds)
    };
  }

  // 5. For human players, must be their turn
  if (player.isHuman && !isPlayerTurn(state, playerId)) {
    const expectedPlayer = getExpectedPlayer(state);
    return {
      success: false,
      error: DraftErrors.wrongPlayerTurn(playerId, expectedPlayer?.id || 'unknown')
    };
  }

  return { success: true, data: undefined };
}

export function validateStartDraft(state: DraftState): ActionResult<void> {
  // 1. Draft must be in setup status
  if (state.status !== 'setup') {
    return {
      success: false,
      error: {
        type: 'DRAFT_ALREADY_STARTED',
        message: `Draft cannot be started. Current status: ${state.status}`
      }
    };
  }

  // 2. Must have at least 2 players
  if (state.players.length < 2) {
    return {
      success: false,
      error: {
        type: 'INVALID_PLAYER_COUNT',
        message: 'Need at least 2 players to start draft',
        count: state.players.length,
        min: 2,
        max: 8
      }
    };
  }

  // 3. Must have exactly one human player
  const humanPlayers = state.players.filter(p => p.isHuman);
  if (humanPlayers.length !== 1) {
    return {
      success: false,
      error: {
        type: 'INVALID_PLAYER_COUNT',
        message: `Must have exactly 1 human player, found ${humanPlayers.length}`,
        count: humanPlayers.length,
        min: 1,
        max: 1
      }
    };
  }

  // 4. All players must have valid positions (0 to playerCount-1)
  const positions = state.players.map(p => p.position).sort();
  const expectedPositions = Array.from({ length: state.players.length }, (_, i) => i);
  if (!arraysEqual(positions, expectedPositions)) {
    return {
      success: false,
      error: {
        type: 'INVALID_DRAFT_STATE',
        message: 'Players do not have valid position assignments',
        details: `Expected positions ${expectedPositions.join(',')}, got ${positions.join(',')}`
      }
    };
  }

  return { success: true, data: undefined };
}

export function validateAddPlayer(
  state: DraftState, 
  playerId: string, 
  name: string, 
  isHuman: boolean
): ActionResult<void> {
  // 1. Draft must be in setup
  if (state.status !== 'setup') {
    return {
      success: false,
      error: {
        type: 'DRAFT_ALREADY_STARTED',
        message: 'Cannot add players after draft has started'
      }
    };
  }

  // 2. Player ID must not already exist
  if (getPlayer(state, playerId)) {
    return {
      success: false,
      error: {
        type: 'PLAYER_ALREADY_EXISTS',
        message: `Player ${playerId} already exists in draft`,
        playerId
      }
    };
  }

  // 3. Cannot exceed max players
  if (state.players.length >= 8) {
    return {
      success: false,
      error: {
        type: 'INVALID_PLAYER_COUNT',
        message: 'Cannot add more than 8 players',
        count: state.players.length + 1,
        min: 2,
        max: 8
      }
    };
  }

  // 4. If adding human player, ensure no other human exists
  if (isHuman && state.players.some(p => p.isHuman)) {
    return {
      success: false,
      error: {
        type: 'INVALID_PLAYER_COUNT',
        message: 'Only one human player allowed per draft',
        count: state.players.filter(p => p.isHuman).length + 1,
        min: 1,
        max: 1
      }
    };
  }

  return { success: true, data: undefined };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getPlayer(state: DraftState, playerId: string): Player | null {
  return state.players.find(p => p.id === playerId) || null;
}

export function getCurrentPackForPlayer(state: DraftState, playerId: string): Pack | null {
  const player = getPlayer(state, playerId);
  if (!player) return null;

  // Use player's currentPack if available
  if (player.currentPack) {
    return player.currentPack;
  }

  // Fallback to position-based lookup
  const roundIndex = state.currentRound - 1;
  if (roundIndex < 0 || roundIndex >= state.packs.length) return null;

  const packsThisRound = state.packs[roundIndex];
  if (!packsThisRound || player.position >= packsThisRound.length) return null;

  return packsThisRound[player.position] || null;
}

export function isPlayerTurn(state: DraftState, playerId: string): boolean {
  const player = getPlayer(state, playerId);
  if (!player) return false;

  // In draft, it's always the human's turn when they have a pack with cards
  if (player.isHuman) {
    const pack = getCurrentPackForPlayer(state, playerId);
    return pack !== null && pack.cards.length > 0;
  }

  // Bots pick automatically, so not really "their turn" in UI sense
  return false;
}

export function getExpectedPlayer(state: DraftState): Player | null {
  // In our draft system, it's always the human player's turn when they have cards
  const humanPlayer = state.players.find(p => p.isHuman);
  if (!humanPlayer) return null;

  const pack = getCurrentPackForPlayer(state, humanPlayer.id);
  if (pack && pack.cards.length > 0) {
    return humanPlayer;
  }

  return null;
}

export function getPlayersNeedingPicks(state: DraftState): Player[] {
  // Simple check: does this player have a pack with cards?
  return state.players.filter(player => {
    const pack = player.currentPack;
    return pack !== null && pack.cards.length > 0;
  });
}

export function getBotPlayersNeedingPicks(state: DraftState): Player[] {
  return getPlayersNeedingPicks(state).filter(p => !p.isHuman);
}

export function isDraftComplete(state: DraftState): boolean {
  // Draft is complete when we've finished 3 rounds and no packs have cards
  if (state.currentRound > 3) return true;
  
  // Check if any pack in any round still has cards
  for (const round of state.packs) {
    for (const pack of round) {
      if (pack.cards.length > 0) return false;
    }
  }
  
  return true;
}

export function shouldPassPacks(state: DraftState): boolean {
  // Pass packs when all players have picked (no one has cards in their pack)
  const playersWithCards = getPlayersNeedingPicks(state);
  return playersWithCards.length === 0;
}

export function shouldAdvanceRound(state: DraftState): boolean {
  // Advance round when current round packs are empty
  if (state.currentRound > 3) return false;
  
  const roundIndex = state.currentRound - 1;
  const currentRoundPacks = state.packs[roundIndex] || [];
  
  return currentRoundPacks.every(pack => pack.cards.length === 0);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}