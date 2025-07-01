/**
 * Pack Generator - Deterministic MTG Booster Pack Creation
 * 
 * Generates reproducible booster packs using seeded randomization.
 * Follows MTG booster pack rarity distribution.
 */

import { SeededRandom } from './SeededRandom';

export interface CardImageUris {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  art_crop?: string;
  border_crop?: string;
}

export interface CardFace {
  object: 'card_face';
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_indicator?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  artist?: string;
  artist_id?: string;
  illustration_id?: string;
  image_uris?: CardImageUris;
}

export interface Card {
  id: string;
  name: string;
  setCode: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  manaCost?: string;
  type?: string;
  colors?: string[];
  collector_number?: string;
  // Image support
  image_uris?: CardImageUris;
  // Dual-sided card support
  layout?: string;
  card_faces?: CardFace[];
  // Additional fields
  oracle_text?: string;
  power?: string;
  toughness?: string;
  cmc?: number;
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
    // Total must be exactly 15 cards

    // Add uncommons (3-4 cards)
    const uncommonCount = this.rng.nextInt(3, 5);
    const uncommons = this.rng.sample(cardsByRarity.uncommon, uncommonCount);
    cards.push(...uncommons);

    // Add commons to fill remaining slots (leaving 1 slot for rare/mythic)
    const remainingSlots = 14 - uncommonCount; // 15 total - uncommons - 1 rare = commons needed
    const commons = this.rng.sample(cardsByRarity.common, remainingSlots);
    cards.push(...commons);

    // Add rare or mythic (1 card)
    const isMythic = this.rng.next() < 0.125; // 1/8 chance
    let rarePool = isMythic && cardsByRarity.mythic.length > 0 
      ? cardsByRarity.mythic 
      : cardsByRarity.rare;
    
    // If no rares available, use mythics; if no mythics, use rares
    if (rarePool.length === 0) {
      rarePool = cardsByRarity.rare.length > 0 ? cardsByRarity.rare : cardsByRarity.mythic;
    }
    
    if (rarePool.length === 0) {
      console.warn('No rare or mythic cards available for pack generation!', {
        packId,
        rareCount: cardsByRarity.rare.length,
        mythicCount: cardsByRarity.mythic.length,
        totalCards: this.setData.cards.length
      });
    } else {
      const rareCard = this.rng.choice(rarePool);
      cards.push(rareCard);
    }

    // Shuffle the final pack
    const shuffledCards = this.rng.shuffle(cards);

    return {
      id: packId,
      cards: shuffledCards, // Should be exactly 15 cards
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
   * Filter out cards that shouldn't appear in packs
   */
  private filterDraftableCards(cards: Card[]): Card[] {
    return cards.filter(card => {
      // Filter out meld back faces (collector numbers ending in 'b')
      if (card.layout === 'meld' && /\d+b$/.test(card.collector_number || '')) {
        return false;
      }
      
      // All other cards are draftable
      return true;
    });
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

    // Filter out non-draftable cards first
    const draftableCards = this.filterDraftableCards(this.setData.cards);

    for (const card of draftableCards) {
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
