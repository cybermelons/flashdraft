/**
 * Advanced pack generation system for MTG draft simulation
 * 
 * Handles set-specific rules, rarity distributions, special slots,
 * and ensures realistic booster pack composition.
 */

import type { Card, Pack, MTGSetData } from '../types/core';

// ============================================================================
// PACK CONFIGURATION TYPES
// ============================================================================

export interface PackSlot {
  type: 'rarity' | 'special' | 'land';
  rarity?: string;
  count: number;
  probability?: number; // For conditional slots (e.g., mythic vs rare)
  special?: string; // Special slot type (e.g., 'foil', 'showcase')
}

export interface PackTemplate {
  name: string;
  totalCards: number;
  slots: PackSlot[];
  // Set-specific rules
  hasBasicLands?: boolean;
  foilRate?: number; // Chance per pack
  specialSlots?: Record<string, number>; // Additional slot types
}

export interface PackGenerationConfig {
  setCode: string;
  template: PackTemplate;
  seed?: string; // For deterministic pack generation
  avoidDuplicates?: boolean;
  balanceColors?: boolean;
}

// ============================================================================
// STANDARD PACK TEMPLATES
// ============================================================================

export const PACK_TEMPLATES: Record<string, PackTemplate> = {
  // Standard modern pack structure
  'standard': {
    name: 'Standard Booster',
    totalCards: 15,
    slots: [
      { type: 'rarity', rarity: 'rare_or_mythic', count: 1 },
      { type: 'rarity', rarity: 'uncommon', count: 3 },
      { type: 'rarity', rarity: 'common', count: 10 },
      { type: 'land', count: 1 }
    ],
    hasBasicLands: true,
    foilRate: 0.25
  },

  // Older set structure (pre-2020)
  'legacy': {
    name: 'Legacy Booster',
    totalCards: 15,
    slots: [
      { type: 'rarity', rarity: 'rare_or_mythic', count: 1 },
      { type: 'rarity', rarity: 'uncommon', count: 3 },
      { type: 'rarity', rarity: 'common', count: 11 }
    ],
    foilRate: 0.167
  },

  // Special sets with different structures
  'masters': {
    name: 'Masters Booster',
    totalCards: 15,
    slots: [
      { type: 'rarity', rarity: 'rare_or_mythic', count: 1 },
      { type: 'rarity', rarity: 'uncommon', count: 3 },
      { type: 'rarity', rarity: 'common', count: 11 }
    ],
    foilRate: 1.0 // Guaranteed foil
  }
};

// ============================================================================
// SET-SPECIFIC CONFIGURATIONS
// ============================================================================

export const SET_CONFIGS: Record<string, PackGenerationConfig> = {
  'FIN': {
    setCode: 'FIN',
    template: PACK_TEMPLATES.standard,
    balanceColors: true,
    avoidDuplicates: true
  },
  'DTK': {
    setCode: 'DTK',
    template: PACK_TEMPLATES.legacy,
    balanceColors: true,
    avoidDuplicates: true
  },
  'TEST': {
    setCode: 'TEST',
    template: PACK_TEMPLATES.legacy,
    balanceColors: false,
    avoidDuplicates: false
  }
};

// ============================================================================
// PACK GENERATOR CLASS
// ============================================================================

export class PackGenerator {
  private usedCards: Set<string> = new Set();
  private rng: () => number;

  constructor(private config: PackGenerationConfig) {
    // Initialize deterministic RNG if seed provided
    this.rng = config.seed ? this.createSeededRandom(config.seed) : Math.random;
  }

  generatePack(setData: MTGSetData, round: number, playerPosition: number): Pack {
    const packId = `pack-r${round}-p${playerPosition}-${this.generateId()}`;
    const template = this.config.template;
    
    // Always reset used cards for each individual pack to avoid duplicates within the pack
    this.usedCards.clear();

    const packCards: Card[] = [];
    const availableCards = this.categorizeCards(setData.cards || []);

    // Process each slot in the template
    for (const slot of template.slots) {
      const slotCards = this.generateSlotCards(slot, availableCards);
      packCards.push(...slotCards);
    }

    // Add foil if rolled
    if (template.foilRate && this.rng() < template.foilRate) {
      const foilCard = this.generateFoilCard(availableCards);
      if (foilCard) {
        // Replace a common with the foil
        const commonIndex = packCards.findIndex(card => 
          availableCards.commons.some(c => c.id === card.id)
        );
        if (commonIndex >= 0) {
          packCards[commonIndex] = foilCard;
        }
      }
    }

    // Shuffle pack for realistic feel
    this.shuffleArray(packCards);

    return {
      id: packId,
      cards: packCards,
      round,
      originalPlayerPosition: playerPosition
    };
  }

  generateMultiplePacks(setData: MTGSetData, count: number, round: number): Pack[] {
    const packs: Pack[] = [];
    
    // Reset for each batch to ensure variety
    this.usedCards.clear();
    
    for (let i = 0; i < count; i++) {
      packs.push(this.generatePack(setData, round, i));
    }
    
    return packs;
  }

  // ============================================================================
  // PRIVATE GENERATION METHODS
  // ============================================================================

  private generateSlotCards(slot: PackSlot, categorized: CategorizedCards): Card[] {
    switch (slot.type) {
      case 'rarity':
        return this.generateRaritySlot(slot, categorized);
      case 'land':
        return this.generateLandSlot(slot, categorized);
      case 'special':
        return this.generateSpecialSlot(slot, categorized);
      default:
        return [];
    }
  }

  private generateRaritySlot(slot: PackSlot, categorized: CategorizedCards): Card[] {
    if (!slot.rarity) return [];

    const cards: Card[] = [];
    let availableCards: Card[] = [];

    // Handle special rare/mythic slot
    if (slot.rarity === 'rare_or_mythic') {
      // 1 in 8 chance for mythic, 7 in 8 for rare
      if (this.rng() < 0.125 && categorized.mythics.length > 0) {
        availableCards = categorized.mythics;
      } else {
        availableCards = categorized.rares;
      }
    } else {
      // Standard rarity slot
      switch (slot.rarity) {
        case 'mythic':
          availableCards = categorized.mythics;
          break;
        case 'rare':
          availableCards = categorized.rares;
          break;
        case 'uncommon':
          availableCards = categorized.uncommons;
          break;
        case 'common':
          availableCards = categorized.commons;
          break;
      }
    }

    // Generate required number of cards
    for (let i = 0; i < slot.count && availableCards.length > 0; i++) {
      const card = this.selectCard(availableCards);
      if (card) {
        cards.push(card);
        this.markCardUsed(card);
      }
    }

    return cards;
  }

  private generateLandSlot(slot: PackSlot, categorized: CategorizedCards): Card[] {
    const cards: Card[] = [];
    
    // Prefer basic lands if available
    let availableCards = categorized.basicLands;
    if (availableCards.length === 0) {
      availableCards = categorized.lands;
    }

    for (let i = 0; i < slot.count && availableCards.length > 0; i++) {
      const card = this.selectCard(availableCards);
      if (card) {
        cards.push(card);
        this.markCardUsed(card);
      }
    }

    return cards;
  }

  private generateSpecialSlot(slot: PackSlot, categorized: CategorizedCards): Card[] {
    // Handle special slots like showcase cards, etc.
    // For now, return empty - can be extended for specific sets
    return [];
  }

  private generateFoilCard(categorized: CategorizedCards): Card | null {
    // Foil can be any rarity, weighted towards lower rarities
    const allCards = [
      ...categorized.commons,
      ...categorized.uncommons,
      ...categorized.rares,
      ...categorized.mythics
    ];

    if (allCards.length === 0) return null;

    // Weight selection towards commons/uncommons for foils
    const weights = allCards.map(card => {
      switch (card.rarity) {
        case 'common': return 10;
        case 'uncommon': return 3;
        case 'rare': return 1;
        case 'mythic': return 0.5;
        default: return 1;
      }
    });

    return this.selectWeightedCard(allCards, weights);
  }

  // ============================================================================
  // CARD SELECTION METHODS
  // ============================================================================

  private selectCard(cards: Card[]): Card | null {
    if (cards.length === 0) return null;

    const availableCards = this.config.avoidDuplicates 
      ? cards.filter(card => !this.usedCards.has(card.id))
      : cards;

    if (availableCards.length === 0) {
      // If we run out of unused cards, allow duplicates
      return cards[Math.floor(this.rng() * cards.length)];
    }

    return availableCards[Math.floor(this.rng() * availableCards.length)];
  }

  private selectWeightedCard(cards: Card[], weights: number[]): Card | null {
    if (cards.length === 0 || weights.length !== cards.length) return null;

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = this.rng() * totalWeight;

    for (let i = 0; i < cards.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return cards[i];
      }
    }

    return cards[cards.length - 1]; // Fallback
  }

  private markCardUsed(card: Card): void {
    if (this.config.avoidDuplicates) {
      this.usedCards.add(card.id);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private categorizeCards(cards: Card[]): CategorizedCards {
    const categorized: CategorizedCards = {
      commons: [],
      uncommons: [],
      rares: [],
      mythics: [],
      lands: [],
      basicLands: []
    };

    for (const card of cards) {
      // Skip cards not in boosters
      if (!card.booster) continue;

      // Categorize by rarity
      switch (card.rarity) {
        case 'common':
          categorized.commons.push(card);
          break;
        case 'uncommon':
          categorized.uncommons.push(card);
          break;
        case 'rare':
          categorized.rares.push(card);
          break;
        case 'mythic':
          categorized.mythics.push(card);
          break;
      }

      // Categorize lands
      if (card.type_line.toLowerCase().includes('land')) {
        categorized.lands.push(card);
        
        // Check if basic land
        if (card.type_line.toLowerCase().includes('basic')) {
          categorized.basicLands.push(card);
        }
      }
    }

    return categorized;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private createSeededRandom(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Make sure we have a non-zero seed
    if (hash === 0) hash = 1;
    
    return () => {
      hash = ((hash * 9301) + 49297) % 233280;
      const result = hash / 233280;
      return Math.abs(result); // Ensure positive result
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

interface CategorizedCards {
  commons: Card[];
  uncommons: Card[];
  rares: Card[];
  mythics: Card[];
  lands: Card[];
  basicLands: Card[];
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createPackGenerator(setCode: string, seed?: string): PackGenerator {
  const config = SET_CONFIGS[setCode] || SET_CONFIGS['TEST'];
  
  return new PackGenerator({
    ...config,
    seed
  });
}

export function generatePacksForDraft(
  setData: MTGSetData, 
  playerCount: number, 
  rounds: number = 3,
  seed?: string
): Pack[][] {
  const generator = createPackGenerator(setData.set_code, seed);
  const allPacks: Pack[][] = [];

  for (let round = 1; round <= rounds; round++) {
    const roundPacks = generator.generateMultiplePacks(setData, playerCount, round);
    allPacks.push(roundPacks);
  }

  return allPacks;
}