/**
 * Apply Action - Pure State Transformation
 * 
 * Pure functions that apply actions to draft state.
 * Each function takes current state + action and returns new state.
 * No side effects, no async operations - just state transformation.
 */

import type { DraftAction } from './types/DraftActions';
import type { SeededDraftState, DraftPlayer, Pack } from '../shared/types/seededDraftState';
import { generateAllDraftPacks, createBotDecisionMakers, validatePackGeneration } from '../shared/utils/seededPackGenerator';
import { getPackDirection } from '../shared/types/seededDraftState';

/**
 * Main action applicator - routes to specific handlers
 * Note: Some actions require additional context (like loaded set data)
 */
export function applyAction(
  state: SeededDraftState, 
  action: DraftAction, 
  context?: { setData?: any }
): SeededDraftState {
  switch (action.type) {
    case 'CREATE_DRAFT':
      if (!context?.setData) {
        throw new Error('CREATE_DRAFT action requires setData in context');
      }
      return applyCreateDraft(state, action, context.setData);
    
    case 'START_DRAFT':
      return applyStartDraft(state);
    
    case 'HUMAN_PICK':
      return applyHumanPick(state, action);
    
    case 'BOT_PICK':
      return applyBotPick(state, action);
    
    case 'PASS_PACKS':
      return applyPassPacks(state);
    
    case 'ADVANCE_POSITION':
      return applyAdvancePosition(state);
    
    case 'START_ROUND':
      return applyStartRound(state, action);
    
    case 'COMPLETE_DRAFT':
      return applyCompleteDraft(state);
    
    default:
      // TypeScript exhaustiveness check
      const _never: never = action;
      throw new Error(`Unknown action type: ${(_never as any).type}`);
  }
}

/**
 * Create initial draft state from set code
 * Note: This function expects setData to be loaded by the service layer
 */
function applyCreateDraft(
  state: SeededDraftState, 
  action: { type: 'CREATE_DRAFT'; setCode: string },
  setData: any // Service layer provides loaded set data
): SeededDraftState {
  const { setCode } = action;
  
  // Generate all packs upfront (deterministic from seed)
  const allPacks = generateAllDraftPacks(state.seed, setData);
  
  // Validate deterministic generation in development
  if (process.env.NODE_ENV === 'development') {
    const isValid = validatePackGeneration(state.seed, setData);
    if (!isValid) {
      console.error('[applyCreateDraft] Pack generation is not deterministic!');
    } else {
      console.log('[applyCreateDraft] Pack generation validation passed');
    }
  }
  
  // Create 8 players (1 human + 7 bots)
  const players: DraftPlayer[] = [
    {
      id: 'human-1',
      name: 'You',
      position: 0,
      isHuman: true,
      currentPack: null,
      pickedCards: [],
    },
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `bot-${i + 1}`,
      name: `Bot ${i + 1}`,
      position: i + 1,
      isHuman: false,
      currentPack: null,
      pickedCards: [],
      personality: (['bronze', 'silver', 'gold', 'mythic'] as const)[i % 4],
    }))
  ];
  
  return {
    ...state,
    status: 'setup',
    round: 1,
    pick: 1,
    direction: 'clockwise',
    players,
    setCode,
    setData,
    allPacks,
    lastModified: Date.now()
  };
}

/**
 * Start draft by distributing initial packs
 */
function applyStartDraft(state: SeededDraftState): SeededDraftState {
  if (state.status !== 'setup') {
    throw new Error('Draft must be in setup status to start');
  }
  
  // Distribute round 1 packs to players
  const playersWithPacks = state.players.map((player, index) => ({
    ...player,
    currentPack: state.allPacks[0][index] // Round 0 (first round), pack for this player
  }));
  
  return {
    ...state,
    status: 'active',
    players: playersWithPacks,
    lastModified: Date.now()
  };
}

/**
 * Apply human pick - remove card from pack, add to picked cards
 */
function applyHumanPick(state: SeededDraftState, action: { type: 'HUMAN_PICK'; cardId: string }): SeededDraftState {
  const { cardId } = action;
  
  const humanPlayer = state.players.find(p => p.isHuman);
  if (!humanPlayer || !humanPlayer.currentPack) {
    throw new Error('Human player has no pack to pick from');
  }
  
  const card = humanPlayer.currentPack.cards.find(c => c.id === cardId);
  if (!card) {
    console.error(`[applyHumanPick] Card ${cardId} not found in pack. Available cards:`, 
      humanPlayer.currentPack.cards.map(c => c.id));
    throw new Error(`Card ${cardId} not found in human player's pack`);
  }
  
  const updatedPlayers = state.players.map(player => {
    if (player.isHuman) {
      return {
        ...player,
        pickedCards: [...player.pickedCards, card],
        currentPack: {
          ...player.currentPack!,
          cards: player.currentPack!.cards.filter(c => c.id !== cardId)
        }
      };
    }
    return player;
  });
  
  return {
    ...state,
    players: updatedPlayers,
    lastModified: Date.now()
  };
}

/**
 * Apply bot pick - deterministic bot decision
 */
function applyBotPick(state: SeededDraftState, action: { type: 'BOT_PICK'; playerId: string; cardId: string }): SeededDraftState {
  const { playerId, cardId } = action;
  
  const botPlayer = state.players.find(p => p.id === playerId);
  if (!botPlayer || !botPlayer.currentPack) {
    throw new Error(`Bot ${playerId} has no pack to pick from`);
  }
  
  const card = botPlayer.currentPack.cards.find(c => c.id === cardId);
  if (!card) {
    throw new Error(`Card ${cardId} not found in bot ${playerId}'s pack`);
  }
  
  const updatedPlayers = state.players.map(player => {
    if (player.id === playerId) {
      return {
        ...player,
        pickedCards: [...player.pickedCards, card],
        currentPack: {
          ...player.currentPack!,
          cards: player.currentPack!.cards.filter(c => c.id !== cardId)
        }
      };
    }
    return player;
  });
  
  return {
    ...state,
    players: updatedPlayers,
    lastModified: Date.now()
  };
}

/**
 * Pass packs to next players
 */
function applyPassPacks(state: SeededDraftState): SeededDraftState {
  const { direction, players } = state;
  const playerCount = players.length;
  
  const playersWithPassedPacks = players.map((player, index) => {
    // Calculate which player's pack this player should receive
    let sourceIndex: number;
    if (direction === 'clockwise') {
      sourceIndex = (index - 1 + playerCount) % playerCount;
    } else {
      sourceIndex = (index + 1) % playerCount;
    }
    
    const sourcePack = players[sourceIndex].currentPack;
    
    return {
      ...player,
      currentPack: sourcePack && sourcePack.cards.length > 0 ? sourcePack : null,
    };
  });
  
  return {
    ...state,
    players: playersWithPassedPacks,
    lastModified: Date.now()
  };
}

/**
 * Start a new round with fresh packs
 */
function applyStartRound(state: SeededDraftState, action: { type: 'START_ROUND'; round: number }): SeededDraftState {
  const { round } = action;
  const newDirection = getPackDirection(round);
  
  // Distribute packs for the new round
  const roundIndex = round - 1; // Convert to 0-indexed
  const playersWithNewPacks = state.players.map((player, index) => ({
    ...player,
    currentPack: state.allPacks[roundIndex][index]
  }));
  
  return {
    ...state,
    round: round as 1 | 2 | 3,
    pick: 1,
    direction: newDirection,
    players: playersWithNewPacks,
    lastModified: Date.now()
  };
}

/**
 * Advance to next position (pick number)
 */
function applyAdvancePosition(state: SeededDraftState): SeededDraftState {
  return {
    ...state,
    pick: state.pick + 1,
    lastModified: Date.now()
  };
}

/**
 * Complete the draft
 */
function applyCompleteDraft(state: SeededDraftState): SeededDraftState {
  return {
    ...state,
    status: 'complete',
    lastModified: Date.now()
  };
}