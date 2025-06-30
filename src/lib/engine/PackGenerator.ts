/**
 * Pack Generator - Deterministic MTG Booster Pack Creation
 * 
 * Generates reproducible booster packs using seeded randomization.
 * Follows MTG booster pack rarity distribution.
 */

import { SeededRandom } from './seededRandom';

export interface Card {
  id: string;
  name: string;
  setCode: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  manaCost?: string;
  type?: string;
  colors?: string[];
}

export interface SetData {
  setCode: string;
  name: string;
  cards: Card[];
}

export interface BoosterPack {
  id: string;
  cards: Card[];
  setCode: string;
}

export class PackGenerator {
  private rng: SeededRandom;
  private setData: SetData;

  constructor(setData: SetData, seed: string) {
    this.setData = setData;
    this.rng = new SeededRandom(`${seed}_${setData.setCode}`);
  }

  /**
   * Generate a single booster pack with standard rarity distribution
   */
  generatePack(packId: string): BoosterPack {
    const cards: Card[] = [];
    const cardsByRarity = this.groupCardsByRarity();

    // Standard booster pack composition:
    // 10-11 commons, 3-4 uncommons, 1 rare/mythic (1/8 chance of mythic)

    // Add commons (10-11 cards)
    const commonCount = this.rng.nextInt(10, 12);
    const commons = this.rng.sample(cardsByRarity.common, commonCount);
    cards.push(...commons);

    // Add uncommons (3-4 cards)
    const uncommonCount = this.rng.nextInt(3, 5);
    const uncommons = this.rng.sample(cardsByRarity.uncommon, uncommonCount);
    cards.push(...uncommons);

    // Add rare or mythic (1 card)
    const isMythic = this.rng.next() < 0.125; // 1/8 chance
    const rarePool = isMythic ? cardsByRarity.mythic : cardsByRarity.rare;
    
    if (rarePool.length > 0) {
      const rareCard = this.rng.choice(rarePool);
      cards.push(rareCard);
    }

    // Ensure we have exactly 15 cards (adjust with commons if needed)
    while (cards.length < 15 && cardsByRarity.common.length > 0) {
      const extraCommon = this.rng.choice(cardsByRarity.common);
      if (!cards.find(c => c.id === extraCommon.id)) {
        cards.push(extraCommon);
      }
    }

    // Shuffle the final pack
    const shuffledCards = this.rng.shuffle(cards);

    return {
      id: packId,
      cards: shuffledCards.slice(0, 15), // Ensure exactly 15 cards
      setCode: this.setData.setCode,
    };
  }

  /**
   * Generate multiple packs for draft
   */
  generatePacks(count: number, baseSeed: string): BoosterPack[] {
    const packs: BoosterPack[] = [];
    
    for (let i = 0; i < count; i++) {
      // Use different seed for each pack to ensure variety
      const packSeed = `${baseSeed}_pack_${i}`;
      this.rng.reset(packSeed);
      
      const pack = this.generatePack(`${baseSeed}_pack_${i}`);
      packs.push(pack);
    }
    
    return packs;
  }

  /**
   * Group cards by rarity for pack generation
   */
  private groupCardsByRarity(): Record<string, Card[]> {
    const groups: Record<string, Card[]> = {
      common: [],
      uncommon: [],
      rare: [],
      mythic: [],
    };

    for (const card of this.setData.cards) {
      if (groups[card.rarity]) {
        groups[card.rarity].push(card);
      }
    }

    return groups;
  }

  /**
   * Get pack generation statistics for debugging
   */
  getPackStats(pack: BoosterPack): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const card of pack.cards) {
      stats[card.rarity] = (stats[card.rarity] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Validate pack follows standard distribution
   */
  validatePack(pack: BoosterPack): boolean {
    const stats = this.getPackStats(pack);
    
    // Check basic constraints
    if (pack.cards.length !== 15) return false;
    if ((stats.common || 0) < 10 || (stats.common || 0) > 11) return false;
    if ((stats.uncommon || 0) < 3 || (stats.uncommon || 0) > 4) return false;
    if ((stats.rare || 0) + (stats.mythic || 0) !== 1) return false;
    
    return true;
  }
}