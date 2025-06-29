/**
 * Draft State Machine - Pure Functions with Nanostores
 * 
 * Treats MTG draft as a deterministic state machine.
 * No React dependencies - just pure state transitions.
 */

import { atom } from 'nanostores';
// Types defined locally for now
interface MTGSetData {
  set_code: string;
  name: string;
  cards: any[];
}

// ============================================================================
// CORE TYPES
// ============================================================================

export interface DraftCard {
  id: string;
  name: string;
  manaCost: string;
  imageUrl: string;
  rarity: string;
  colors: string[];
  cmc: number;
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

export interface DraftState {
  id: string;
  status: 'setup' | 'active' | 'complete';
  round: 1 | 2 | 3;
  pick: number; // 1-15 per round
  direction: 'clockwise' | 'counterclockwise';
  players: DraftPlayer[];
  humanPlayerId: string;
  setData: MTGSetData;
  createdAt: number;
}

// ============================================================================
// NANOSTORES
// ============================================================================

export const draftStore = atom<DraftState | null>(null);

// ============================================================================
// PURE STATE MACHINE FUNCTIONS
// ============================================================================

/**
 * Create a new draft state
 */
export function createDraft(setData: MTGSetData, humanPlayerId: string = 'human-1'): DraftState {
  const draftId = generateId();
  
  // Create 8 players (1 human + 7 bots)
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
    id: draftId,
    status: 'setup',
    round: 1,
    pick: 1,
    direction: 'clockwise',
    players,
    humanPlayerId,
    setData,
    createdAt: Date.now(),
  };
}

/**
 * Start the draft by generating and distributing packs
 */
export function startDraft(state: DraftState): DraftState {
  if (state.status !== 'setup') {
    throw new Error('Draft must be in setup status to start');
  }

  // Generate 8 packs for round 1
  const round1Packs = generatePacks(state.setData, 8);
  
  // Distribute packs to players
  const playersWithPacks = state.players.map((player, index) => ({
    ...player,
    currentPack: round1Packs[index] || null,
  }));

  return {
    ...state,
    status: 'active',
    players: playersWithPacks,
  };
}

/**
 * Core state transition: Process a human pick
 * This is the main state machine function
 */
export function processPick(state: DraftState, playerId: string, cardId: string): DraftState {
  if (state.status !== 'active') {
    throw new Error('Draft must be active to make picks');
  }

  // 1. Apply human pick (Pick N)
  const stateAfterHumanPick = applyPlayerPick(state, playerId, cardId);
  
  // 2. Process all bots for the SAME pick number (Pick N)
  const stateAfterBotPicks = processAllBotsForCurrentPick(stateAfterHumanPick, state.pick);
  
  // 3. Pass all packs (everyone has now made Pick N)
  const stateAfterPackPassing = passAllPacks(stateAfterBotPicks);
  
  // 4. Increment pick counter ONCE (Pick N → Pick N+1)
  const newState = {
    ...stateAfterPackPassing,
    pick: state.pick + 1
  };
  
  // 5. Check for round/draft completion
  return checkForCompletion(newState);
}

/**
 * Apply a single player's pick
 */
function applyPlayerPick(state: DraftState, playerId: string, cardId: string): DraftState {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.currentPack) {
    throw new Error(`Player ${playerId} has no pack to pick from`);
  }

  const card = player.currentPack.cards.find(c => c.id === cardId);
  if (!card) {
    throw new Error(`Card ${cardId} not found in player's pack`);
  }

  const updatedPlayers = state.players.map(p => {
    if (p.id === playerId) {
      return {
        ...p,
        pickedCards: [...p.pickedCards, card],
        currentPack: {
          ...p.currentPack!,
          cards: p.currentPack!.cards.filter(c => c.id !== cardId)
        }
      };
    }
    return p;
  });

  return {
    ...state,
    players: updatedPlayers,
  };
}

/**
 * Process all bots for the current pick number
 * All bots make their Pick N simultaneously with the human
 */
function processAllBotsForCurrentPick(state: DraftState, pickNumber: number): DraftState {
  console.log(`[DraftEngine] Processing all bots for Pick ${pickNumber}`);
  
  let currentState = state;
  
  // Each bot makes exactly one pick for this pick number
  for (const player of state.players) {
    if (!player.isHuman && player.currentPack && player.currentPack.cards.length > 0) {
      const botChoice = makeBotChoice(player.currentPack);
      console.log(`[DraftEngine] Bot ${player.id} picks ${botChoice.name} for Pick ${pickNumber}`);
      currentState = applyPlayerPick(currentState, player.id, botChoice.id);
    }
  }
  
  return currentState;
}

/**
 * Pass all packs to next players
 */
function passAllPacks(state: DraftState): DraftState {
  const { direction, players } = state;
  const playerCount = players.length;
  
  console.log(`[DraftEngine] Passing packs ${direction} for Pick ${state.pick}`);
  
  const playersWithPassedPacks = players.map((player, index) => {
    // Calculate which player's pack this player should receive
    let sourceIndex: number;
    if (direction === 'clockwise') {
      sourceIndex = (index - 1 + playerCount) % playerCount;
    } else {
      sourceIndex = (index + 1) % playerCount;
    }
    
    const sourcePack = players[sourceIndex].currentPack;
    const packSize = sourcePack?.cards.length || 0;
    
    if (player.isHuman) {
      console.log(`[DraftEngine] Human receives pack from position ${sourceIndex} with ${packSize} cards`);
    }
    
    return {
      ...player,
      currentPack: sourcePack && sourcePack.cards.length > 0 ? sourcePack : null,
    };
  });

  return {
    ...state,
    players: playersWithPassedPacks,
  };
}

/**
 * Check for round/draft completion after pick increment
 */
function checkForCompletion(state: DraftState): DraftState {
  // Check if round is complete (pick 16 means we've done picks 1-15)
  if (state.pick > 15) {
    // Round complete - advance to next round
    if (state.round >= 3) {
      // Draft complete
      console.log(`[DraftEngine] Draft complete after Round ${state.round}`);
      return {
        ...state,
        status: 'complete',
      };
    } else {
      // Start next round
      console.log(`[DraftEngine] Round ${state.round} complete, starting Round ${state.round + 1}`);
      return startNextRound(state);
    }
  }
  
  // Continue current round
  console.log(`[DraftEngine] Round ${state.round}, Pick ${state.pick} ready`);
  return state;
}

/**
 * Start the next round
 */
function startNextRound(state: DraftState): DraftState {
  const nextRound = (state.round + 1) as 1 | 2 | 3;
  const newDirection = nextRound === 2 ? 'counterclockwise' : 'clockwise';
  
  // Generate new packs for the round
  const newPacks = generatePacks(state.setData, state.players.length);
  
  const playersWithNewPacks = state.players.map((player, index) => ({
    ...player,
    currentPack: newPacks[index] || null,
  }));

  return {
    ...state,
    round: nextRound,
    pick: 1,
    direction: newDirection,
    players: playersWithNewPacks,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple bot decision making
 */
function makeBotChoice(pack: Pack): DraftCard {
  // For now, just pick the first card (can be improved with AI later)
  return pack.cards[0];
}

/**
 * Generate booster packs
 */
function generatePacks(setData: MTGSetData, count: number): Pack[] {
  const packs: Pack[] = [];
  
  for (let i = 0; i < count; i++) {
    const packCards = generateSinglePack(setData);
    packs.push({
      id: `pack-${i}-${Date.now()}`,
      cards: packCards,
    });
  }
  
  return packs;
}

/**
 * Generate a single 15-card booster pack (avoiding duplicates)
 */
function generateSinglePack(setData: MTGSetData): DraftCard[] {
  const cards = setData.cards || [];
  console.log(`[PackGen] Generating pack from ${cards.length} total cards in set ${setData.set_code}`);
  
  // Categorize cards by rarity
  const commons = cards.filter(c => c.rarity === 'common' && c.booster);
  const uncommons = cards.filter(c => c.rarity === 'uncommon' && c.booster);
  const rares = cards.filter(c => c.rarity === 'rare' && c.booster);
  const mythics = cards.filter(c => c.rarity === 'mythic' && c.booster);
  
  console.log(`[PackGen] Card distribution - Commons: ${commons.length}, Uncommons: ${uncommons.length}, Rares: ${rares.length}, Mythics: ${mythics.length}`);
  
  const packCards: DraftCard[] = [];
  const usedCardIds = new Set<string>();
  
  // Helper to pick unique card
  const pickUniqueCard = (pool: any[]) => {
    const available = pool.filter(c => !usedCardIds.has(c.id));
    if (available.length === 0) return null;
    const card = available[Math.floor(Math.random() * available.length)];
    usedCardIds.add(card.id);
    return card;
  };
  
  // 1 rare/mythic (1/8 chance for mythic)
  const rarePool = Math.random() < 0.125 && mythics.length > 0 ? mythics : rares;
  const rareCard = pickUniqueCard(rarePool);
  if (rareCard) packCards.push(toDraftCard(rareCard));
  
  // 3 uncommons
  for (let i = 0; i < 3; i++) {
    const card = pickUniqueCard(uncommons);
    if (card) packCards.push(toDraftCard(card));
  }
  
  // 11 commons
  for (let i = 0; i < 11; i++) {
    const card = pickUniqueCard(commons);
    if (card) packCards.push(toDraftCard(card));
  }
  
  return packCards;
}

/**
 * Convert MTG card to draft card format
 */
function toDraftCard(card: any): DraftCard {
  return {
    id: card.id,
    name: card.name,
    manaCost: card.mana_cost || '',
    imageUrl: card.image_uris?.normal || `https://cards.scryfall.io/normal/front/${card.id.slice(0, 1)}/${card.id.slice(1, 2)}/${card.id}.jpg`,
    rarity: card.rarity,
    colors: card.colors || [],
    cmc: card.cmc || 0,
  };
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

export const draftActions = {
  create: (setData: MTGSetData) => {
    console.log('[DraftStore] Creating draft with set:', setData.set_code, 'Cards:', setData.cards?.length || 0);
    const newDraft = createDraft(setData);
    draftStore.set(newDraft);
    return newDraft;
  },
  
  start: () => {
    const current = draftStore.get();
    if (!current) throw new Error('No draft to start');
    
    console.log('[DraftStore] Starting draft with set:', current.setData.set_code);
    const started = startDraft(current);
    draftStore.set(started);
    return started;
  },
  
  pick: (cardId: string) => {
    const current = draftStore.get();
    if (!current) throw new Error('No active draft');
    
    const updated = processPick(current, current.humanPlayerId, cardId);
    draftStore.set(updated);
    return updated;
  },
  
  reset: () => {
    draftStore.set(null);
  },
};