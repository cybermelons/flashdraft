/**
 * Draft Replay Engine
 * 
 * Reconstructs draft states from seed and deltas.
 * This is the core of the deterministic draft system.
 */

import { generateAllDraftPacks, createBotDecisionMakers } from './seededPackGenerator';
import type { 
  SeededDraftState, 
  DraftPlayer, 
  Pack, 
  MTGSetData,
  CreateSeededDraftParams,
  ReplayDraftParams,
  DraftNavigationResult
} from '../types/seededDraftState';
import type { DraftDelta } from '../types/draftDelta';
import { 
  calculateDraftPosition, 
  calculateRoundAndPick, 
  getPackDirection,
  getNextPlayerPosition 
} from '../types/seededDraftState';
import { generateSeed } from './seededRandom';

/**
 * Create a new seeded draft
 */
export function createSeededDraft(params: CreateSeededDraftParams): SeededDraftState {
  const seed = params.seed || generateSeed();
  const humanPlayerId = params.humanPlayerId || 'human-1';
  
  // Generate all packs upfront using the seed
  const allPacks = generateAllDraftPacks(seed, params.setData);
  
  // Create players
  const players: DraftPlayer[] = [
    {
      id: humanPlayerId,
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
    id: seed,
    seed,
    status: 'setup',
    round: 1,
    pick: 1,
    direction: 'clockwise',
    players,
    humanPlayerId,
    setData: params.setData,
    allPacks,
    deltas: [],
    createdAt: Date.now(),
    lastModified: Date.now()
  };
}

/**
 * Start a draft by distributing initial packs
 */
export function startSeededDraft(draft: SeededDraftState): SeededDraftState {
  if (draft.status !== 'setup') {
    throw new Error('Draft must be in setup status to start');
  }
  
  // Distribute round 1 packs to players
  const playersWithPacks = draft.players.map((player, index) => ({
    ...player,
    currentPack: draft.allPacks[0][index] // Round 0 (first round), pack for this player
  }));
  
  return {
    ...draft,
    status: 'active',
    players: playersWithPacks,
    lastModified: Date.now()
  };
}

/**
 * Replay a draft to a specific position
 */
export function replayDraftToPosition(params: ReplayDraftParams): SeededDraftState {
  console.log(`[ReplayEngine] Replaying to position ${params.targetPosition}, total deltas: ${params.deltas.length}`);
  
  // Start with fresh draft
  let draft = createSeededDraft({
    seed: params.seed,
    setData: params.setData
  });
  
  // Start the draft
  draft = startSeededDraft(draft);
  console.log(`[ReplayEngine] After start - human picks: ${draft.players.find(p => p.isHuman)?.pickedCards.length}`);
  
  // Apply deltas up to target position
  const targetPosition = params.targetPosition || params.deltas.length;
  const deltasToApply = params.deltas.slice(0, targetPosition);
  
  console.log(`[ReplayEngine] Applying ${deltasToApply.length} deltas`);
  for (const delta of deltasToApply) {
    console.log(`[ReplayEngine] Applying delta:`, delta);
    draft = applyDelta(draft, delta);
  }
  
  console.log(`[ReplayEngine] Final state - human picks: ${draft.players.find(p => p.isHuman)?.pickedCards.length}`);
  return draft;
}

/**
 * Apply a single delta to a draft state
 */
export function applyDelta(draft: SeededDraftState, delta: DraftDelta): SeededDraftState {
  if (delta.event_type !== 'pick') {
    // For now, only handle pick events
    return draft;
  }
  
  // Find the player making the pick
  const playerIndex = draft.players.findIndex(p => p.id === delta.player_id);
  if (playerIndex === -1) {
    throw new Error(`Player ${delta.player_id} not found`);
  }
  
  const player = draft.players[playerIndex];
  if (!player.currentPack) {
    throw new Error(`Player ${delta.player_id} has no pack to pick from`);
  }
  
  // Find the picked card
  const cardIndex = player.currentPack.cards.findIndex(c => c.id === delta.pick);
  if (cardIndex === -1) {
    throw new Error(`Card ${delta.pick} not found in player's pack`);
  }
  
  const pickedCard = player.currentPack.cards[cardIndex];
  
  // Update player state - remove card from pack and add to picked cards
  const updatedPlayers = draft.players.map((p, index) => {
    if (index === playerIndex) {
      return {
        ...p,
        pickedCards: [...p.pickedCards, pickedCard],
        currentPack: {
          ...p.currentPack!,
          cards: p.currentPack!.cards.filter((_, i) => i !== cardIndex)
        }
      };
    }
    return p;
  });
  
  // Add delta to history
  const updatedDeltas = [...draft.deltas, delta];
  
  // Calculate next position after the pick
  const nextPick = delta.pick_number + 1;
  const nextRound = nextPick > 15 ? (delta.pack_number + 1) as 1 | 2 | 3 : delta.pack_number as 1 | 2 | 3;
  const actualNextPick = nextPick > 15 ? 1 : nextPick;
  
  // Update draft state with new position info
  let updatedDraft: SeededDraftState = {
    ...draft,
    round: nextRound,
    pick: actualNextPick,
    direction: getPackDirection(nextRound),
    players: updatedPlayers,
    deltas: updatedDeltas,
    lastModified: Date.now()
  };
  
  // Process bot picks for this pick number (all players pick simultaneously)
  updatedDraft = processBotPicks(updatedDraft, delta.pick_number);
  
  // Pass packs after each pick (this simulates the pack passing in MTG)
  updatedDraft = passPacks(updatedDraft);
  
  // If we've moved to a new round, distribute new packs
  if (nextRound > delta.pack_number && nextRound <= 3) {
    updatedDraft = startNewRound(updatedDraft, nextRound);
  }
  
  // Check for round/draft completion
  updatedDraft = checkCompletion(updatedDraft);
  
  return updatedDraft;
}

/**
 * Pass packs to next players
 */
function passPacks(draft: SeededDraftState): SeededDraftState {
  const { direction, players } = draft;
  
  const playersWithPassedPacks = players.map((player, index) => {
    // Calculate which player's pack this player should receive
    const sourceIndex = getNextPlayerPosition(index, direction, players.length);
    const sourcePack = players[sourceIndex].currentPack;
    
    return {
      ...player,
      currentPack: sourcePack && sourcePack.cards.length > 0 ? sourcePack : null
    };
  });
  
  return {
    ...draft,
    players: playersWithPassedPacks
  };
}

/**
 * Check for round/draft completion and advance if needed
 */
function checkCompletion(draft: SeededDraftState): SeededDraftState {
  // Check if all players have empty packs (round complete)
  const allPacksEmpty = draft.players.every(p => !p.currentPack || p.currentPack.cards.length === 0);
  
  if (allPacksEmpty) {
    if (draft.round >= 3) {
      // Draft complete
      return {
        ...draft,
        status: 'complete'
      };
    } else {
      // Start next round
      return startNextRound(draft);
    }
  }
  
  return draft;
}

/**
 * Process bot picks for the current pick number
 * All bots make their picks simultaneously with the human
 */
function processBotPicks(draft: SeededDraftState, pickNumber: number): SeededDraftState {
  const botDecisionMakers = createBotDecisionMakers(draft.seed);
  
  let updatedDraft = draft;
  
  // Process each bot's pick
  for (const player of draft.players) {
    if (!player.isHuman && player.currentPack && player.currentPack.cards.length > 0) {
      // Get bot's decision maker (position 1-7 maps to array index 0-6)
      const botIndex = player.position - 1;
      const botDecisionMaker = botDecisionMakers[botIndex];
      
      if (!botDecisionMaker) {
        console.error(`No bot decision maker found for position ${player.position}`);
        continue;
      }
      
      // Make bot choice (deterministic based on seed)
      const choice = botDecisionMaker.makePick(player.currentPack.cards);
      
      // Create delta for bot pick
      const botDelta = {
        event_type: 'pick' as const,
        pack_number: draft.round,
        pick_number: pickNumber,
        pick: choice.id,
        player_id: player.id,
        timestamp: Date.now(),
        pick_time_ms: 1000 // Bots pick instantly
      };
      
      // Apply bot pick (but don't recurse into bot processing again)
      updatedDraft = applyBotPick(updatedDraft, botDelta);
    }
  }
  
  return updatedDraft;
}

/**
 * Apply a bot pick without triggering additional bot processing
 */
function applyBotPick(draft: SeededDraftState, delta: DraftDelta): SeededDraftState {
  const playerIndex = draft.players.findIndex(p => p.id === delta.player_id);
  if (playerIndex === -1) return draft;
  
  const player = draft.players[playerIndex];
  if (!player.currentPack) return draft;
  
  const cardIndex = player.currentPack.cards.findIndex(c => c.id === delta.pick);
  if (cardIndex === -1) return draft;
  
  const pickedCard = player.currentPack.cards[cardIndex];
  
  // Update only this player's state
  const updatedPlayers = draft.players.map((p, index) => {
    if (index === playerIndex) {
      return {
        ...p,
        pickedCards: [...p.pickedCards, pickedCard],
        currentPack: {
          ...p.currentPack!,
          cards: p.currentPack!.cards.filter((_, i) => i !== cardIndex)
        }
      };
    }
    return p;
  });
  
  return {
    ...draft,
    players: updatedPlayers,
    deltas: [...draft.deltas, delta],
    lastModified: Date.now()
  };
}

/**
 * Start the next round with new packs
 */
function startNextRound(draft: SeededDraftState): SeededDraftState {
  const nextRound = (draft.round + 1) as 1 | 2 | 3;
  const newDirection = getPackDirection(nextRound);
  
  // Distribute packs for the new round
  const playersWithNewPacks = draft.players.map((player, index) => ({
    ...player,
    currentPack: draft.allPacks[nextRound - 1][index] // Round index is 0-based
  }));
  
  return {
    ...draft,
    round: nextRound,
    pick: 1,
    direction: newDirection,
    players: playersWithNewPacks
  };
}

/**
 * Navigate to a specific draft position
 */
export function navigateToPosition(
  seed: string,
  setData: MTGSetData,
  deltas: DraftDelta[],
  targetRound: number,
  targetPick: number
): DraftNavigationResult {
  try {
    // Validate position
    if (targetRound < 1 || targetRound > 3 || targetPick < 1 || targetPick > 15) {
      return {
        success: false,
        error: `Invalid position: Round ${targetRound}, Pick ${targetPick}`
      };
    }
    
    const targetPosition = calculateDraftPosition(targetRound, targetPick);
    const maxPosition = deltas.length + 1; // +1 because we can view the next pick to make
    
    if (targetPosition > maxPosition) {
      return {
        success: false,
        error: `Position not yet reached in draft`
      };
    }
    
    // Replay to target position
    const state = replayDraftToPosition({
      seed,
      setData,
      deltas,
      targetPosition: targetPosition - 1 // -1 because deltas are 0-indexed
    });
    
    return {
      success: true,
      state
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get the current pack for a player at a specific position
 */
export function getCurrentPackForPlayer(
  draft: SeededDraftState,
  playerId: string
): Pack | null {
  const player = draft.players.find(p => p.id === playerId);
  return player?.currentPack || null;
}

/**
 * Validate that a replay produces consistent results
 */
export function validateReplay(
  seed: string,
  setData: MTGSetData,
  deltas: DraftDelta[]
): boolean {
  try {
    const replay1 = replayDraftToPosition({ seed, setData, deltas });
    const replay2 = replayDraftToPosition({ seed, setData, deltas });
    
    // Compare key state elements
    return (
      replay1.id === replay2.id &&
      replay1.round === replay2.round &&
      replay1.pick === replay2.pick &&
      replay1.deltas.length === replay2.deltas.length &&
      replay1.players.every((p1, i) => {
        const p2 = replay2.players[i];
        return (
          p1.id === p2.id &&
          p1.pickedCards.length === p2.pickedCards.length &&
          p1.pickedCards.every((c1, j) => c1.id === p2.pickedCards[j].id)
        );
      })
    );
  } catch (error) {
    return false;
  }
}