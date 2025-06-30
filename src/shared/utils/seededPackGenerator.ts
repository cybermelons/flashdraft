/**
 * Seeded Pack Generator
 * 
 * Generates deterministic MTG booster packs using SeededRandom.
 * Same seed always produces same pack contents and bot decisions.
 */

import { SeededRandom } from './seededRandom';
import type { MTGCard } from '../types/card';

/**
 * Generate a unique identifier string
 */
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

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
 * Generate all packs for a complete draft
 * Creates 24 packs (8 players × 3 rounds) deterministically
 */
export function generateAllDraftPacks(seed: string, setData: MTGSetData): Pack[][] {
  const rng = new SeededRandom(seed);
  const playerCount = 8;
  const roundCount = 3;
  
  const allPacks: Pack[][] = [];
  
  // Generate packs for each round
  for (let round = 0; round < roundCount; round++) {
    const roundPacks: Pack[] = [];
    
    for (let player = 0; player < playerCount; player++) {
      const packId = `${seed}_r${round + 1}_p${player + 1}`;
      const pack = generateSinglePack(rng, setData, packId, round + 1);
      roundPacks.push(pack);
    }
    
    allPacks.push(roundPacks);
  }
  
  return allPacks;
}

/**
 * Generate a single 15-card booster pack
 */
function generateSinglePack(
  rng: SeededRandom, 
  setData: MTGSetData, 
  packId: string,
  round: number
): Pack {
  const cards = setData.cards || [];
  
  // Filter cards by rarity and booster eligibility
  const commons = cards.filter(c => c.rarity === 'common' && c.booster !== false);
  const uncommons = cards.filter(c => c.rarity === 'uncommon' && c.booster !== false);
  const rares = cards.filter(c => c.rarity === 'rare' && c.booster !== false);
  const mythics = cards.filter(c => c.rarity === 'mythic' && c.booster !== false);
  
  const packCards: DraftCard[] = [];
  const usedCardIds = new Set<string>();
  
  // Helper to pick unique card
  const pickUniqueCard = (pool: any[], context: string): DraftCard | null => {
    const available = pool.filter(c => !usedCardIds.has(c.id));
    if (available.length === 0) return null;
    
    const card = rng.choice(available);
    usedCardIds.add(card.id);
    return toDraftCard(card, context, packId);
  };
  
  // 1 rare/mythic (12.5% chance for mythic if mythics exist)
  const shouldBeMythic = mythics.length > 0 && rng.next() < 0.125;
  const rarePool = shouldBeMythic ? mythics : rares;
  const rareCard = pickUniqueCard(rarePool, 'rare');
  if (rareCard) packCards.push(rareCard);
  
  // 3 uncommons
  for (let i = 0; i < 3; i++) {
    const uncommon = pickUniqueCard(uncommons, 'uncommon');
    if (uncommon) packCards.push(uncommon);
  }
  
  // 11 commons (or fill to 15 if we're short)
  const remainingSlots = 15 - packCards.length;
  for (let i = 0; i < remainingSlots; i++) {
    const common = pickUniqueCard(commons, 'common');
    if (common) packCards.push(common);
  }
  
  // Shuffle the pack to randomize card order
  const shuffledCards = rng.shuffle(packCards);
  
  return {
    id: packId,
    cards: shuffledCards
  };
}

/**
 * Convert MTG card to draft card format with instance ID
 */
function toDraftCard(card: any, context: string, packId: string): DraftCard {
  // Create unique instance ID that's deterministic for the same card in same pack
  const instanceId = `${packId}_${context}_${card.id}`;
  
  return {
    id: card.id,
    name: card.name,
    manaCost: card.mana_cost || '',
    imageUrl: card.image_uris?.normal || 
             card.image_uris?.small || 
             `https://cards.scryfall.io/normal/front/${card.id.slice(0, 1)}/${card.id.slice(1, 2)}/${card.id}.jpg`,
    rarity: card.rarity,
    colors: card.colors || [],
    cmc: card.cmc || 0,
    instanceId
  };
}

/**
 * Create a deterministic bot decision maker
 */
export class SeededBotDecisionMaker {
  private rng: SeededRandom;
  private botId: string;
  
  constructor(seed: string, botId: string) {
    // Each bot gets its own derived seed for independent decisions
    this.rng = new SeededRandom(seed).derive(`bot_${botId}`);
    this.botId = botId;
  }
  
  /**
   * Make a pick from available cards
   * For now, use simple random selection
   * TODO: Implement actual draft AI logic here
   */
  makePick(availableCards: DraftCard[]): DraftCard {
    if (availableCards.length === 0) {
      throw new Error(`Bot ${this.botId} has no cards to pick from`);
    }
    
    // Simple strategy: pick randomly
    // Future: implement proper draft AI with card evaluation
    return this.rng.choice(availableCards);
  }
  
  /**
   * Reset bot to initial state
   */
  reset(): void {
    this.rng.reset();
  }
}

/**
 * Create all bot decision makers for a draft
 */
export function createBotDecisionMakers(seed: string): SeededBotDecisionMaker[] {
  const bots: SeededBotDecisionMaker[] = [];
  
  for (let i = 1; i <= 7; i++) {
    bots.push(new SeededBotDecisionMaker(seed, `bot${i}`));
  }
  
  return bots;
}

/**
 * Validate that pack generation is deterministic
 */
export function validatePackGeneration(seed: string, setData: MTGSetData): boolean {
  const packs1 = generateAllDraftPacks(seed, setData);
  const packs2 = generateAllDraftPacks(seed, setData);
  
  // Compare pack structures
  if (packs1.length !== packs2.length) return false;
  
  for (let round = 0; round < packs1.length; round++) {
    if (packs1[round].length !== packs2[round].length) return false;
    
    for (let pack = 0; pack < packs1[round].length; pack++) {
      const pack1 = packs1[round][pack];
      const pack2 = packs2[round][pack];
      
      if (pack1.id !== pack2.id) return false;
      if (pack1.cards.length !== pack2.cards.length) return false;
      
      for (let card = 0; card < pack1.cards.length; card++) {
        if (pack1.cards[card].id !== pack2.cards[card].id) return false;
        if (pack1.cards[card].instanceId !== pack2.cards[card].instanceId) return false;
      }
    }
  }
  
  return true;
}