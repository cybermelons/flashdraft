/**
 * FlashDraft - Advanced Pack Generation System
 * 
 * Generates realistic booster packs based on actual MTG set data
 * and rarity distributions for accurate draft simulation.
 */

import type { MTGCard, MTGSetData, DraftCard, MTGRarity } from '../types/cards';
import { groupCardsByRarity, toDraftCard } from './cardUtils';

export interface PackSlot {
  rarity: MTGRarity;
  count: number;
  foil_chance?: number;
  special_conditions?: string[];
}

export interface SetBoosterConfig {
  set_code: string;
  set_name: string;
  total_cards_per_pack: number;
  slots: PackSlot[];
  special_sheets?: {
    name: string;
    cards: MTGCard[];
    chance: number; // 0-1 probability
    replaces_slot?: MTGRarity;
  }[];
  land_slot?: {
    basic_lands: MTGCard[];
    chance: number;
  };
}

export interface GeneratedPack {
  id: string;
  set_code: string;
  cards: DraftCard[];
  pack_number: number;
  pick_number: number;
  generated_at: number;
  metadata: {
    foil_count: number;
    rare_count: number;
    mythic_count: number;
    special_cards: string[];
  };
}

class PackGenerator {
  private rarityPools: Map<string, Record<MTGRarity, MTGCard[]>> = new Map();
  private setConfigs: Map<string, SetBoosterConfig> = new Map();

  /**
   * Initialize pack generator with set data
   */
  initialize(setData: MTGSetData): void {
    const setCode = setData.set_info.code.toLowerCase();
    
    // Filter draftable cards only
    const draftableCards = setData.cards.filter(card => card.booster);
    
    // Group by rarity
    const rarityGroups = groupCardsByRarity(draftableCards);
    this.rarityPools.set(setCode, rarityGroups);
    
    // Create default booster configuration
    const config = this.createDefaultBoosterConfig(setData, rarityGroups);
    this.setConfigs.set(setCode, config);
  }

  /**
   * Create default booster configuration based on set analysis
   */
  private createDefaultBoosterConfig(
    setData: MTGSetData, 
    rarityGroups: Record<MTGRarity, MTGCard[]>
  ): SetBoosterConfig {
    // Analyze set to determine pack structure
    const totalCards = Object.values(rarityGroups).reduce(
      (sum, cards) => sum + cards.length, 0
    );
    
    // Default 15-card booster structure
    let slots: PackSlot[] = [
      { rarity: 'common', count: 10 },
      { rarity: 'uncommon', count: 3 },
      { rarity: 'rare', count: 1 }, // Will be upgraded to mythic 1/8 of the time
    ];

    // Add land slot if we have basic lands
    const landCards = setData.cards.filter(card => 
      card.type_line.includes('Basic Land') && card.booster
    );
    
    if (landCards.length > 0) {
      slots[0].count = 9; // Reduce commons by 1
      // Land slot will be handled separately
    }

    // Adjust for sets with special rarities
    if (rarityGroups.special.length > 0) {
      slots.push({
        rarity: 'special',
        count: 0, // Will be added via special sheets
      });
    }

    return {
      set_code: setData.set_info.code.toUpperCase(),
      set_name: setData.set_info.name,
      total_cards_per_pack: 15,
      slots,
      land_slot: landCards.length > 0 ? {
        basic_lands: landCards,
        chance: 1.0
      } : undefined
    };
  }

  /**
   * Generate a realistic booster pack
   */
  generatePack(
    setCode: string,
    packId: string,
    packNumber: number = 1,
    pickNumber: number = 1
  ): GeneratedPack {
    const normalizedSetCode = setCode.toLowerCase();
    const rarityGroups = this.rarityPools.get(normalizedSetCode);
    const config = this.setConfigs.get(normalizedSetCode);

    if (!rarityGroups || !config) {
      throw new Error(`Pack generator not initialized for set ${setCode}`);
    }

    const pack: MTGCard[] = [];
    const metadata = {
      foil_count: 0,
      rare_count: 0,
      mythic_count: 0,
      special_cards: [] as string[]
    };

    // Generate cards according to slot configuration
    for (const slot of config.slots) {
      for (let i = 0; i < slot.count; i++) {
        let selectedRarity = slot.rarity;
        
        // Special case: rare slot with mythic upgrade chance
        if (slot.rarity === 'rare' && Math.random() < 0.125) {
          selectedRarity = 'mythic';
          metadata.mythic_count++;
        } else if (slot.rarity === 'rare') {
          metadata.rare_count++;
        }

        const pool = rarityGroups[selectedRarity];
        if (pool && pool.length > 0) {
          // Avoid duplicates in the same pack
          const availableCards = pool.filter(card => 
            !pack.some(existing => existing.id === card.id)
          );
          
          if (availableCards.length > 0) {
            const randomCard = availableCards[
              Math.floor(Math.random() * availableCards.length)
            ];
            pack.push(randomCard);
          }
        }
      }
    }

    // Add land slot if configured
    if (config.land_slot && Math.random() < config.land_slot.chance) {
      const landPool = config.land_slot.basic_lands;
      if (landPool.length > 0) {
        const randomLand = landPool[
          Math.floor(Math.random() * landPool.length)
        ];
        pack.push(randomLand);
      }
    }

    // Handle special sheets (foils, special treatments, etc.)
    if (config.special_sheets) {
      for (const sheet of config.special_sheets) {
        if (Math.random() < sheet.chance && sheet.cards.length > 0) {
          const specialCard = sheet.cards[
            Math.floor(Math.random() * sheet.cards.length)
          ];
          
          if (sheet.replaces_slot) {
            // Replace a card of the specified rarity
            const replaceIndex = pack.findIndex(card => card.rarity === sheet.replaces_slot);
            if (replaceIndex !== -1) {
              pack[replaceIndex] = specialCard;
            } else {
              pack.push(specialCard);
            }
          } else {
            pack.push(specialCard);
          }
          
          metadata.special_cards.push(sheet.name);
          if (sheet.name.includes('foil')) {
            metadata.foil_count++;
          }
        }
      }
    }

    // Shuffle the pack to randomize card order
    for (let i = pack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pack[i], pack[j]] = [pack[j], pack[i]];
    }

    // Convert to draft cards with pack context
    const draftCards = pack.map(card => toDraftCard(card, `pack-${packId}`));

    return {
      id: packId,
      set_code: config.set_code,
      cards: draftCards,
      pack_number: packNumber,
      pick_number: pickNumber,
      generated_at: Date.now(),
      metadata
    };
  }

  /**
   * Generate multiple packs for draft simulation
   */
  generateDraftPacks(
    setCode: string,
    playersCount: number = 8,
    packsPerPlayer: number = 3
  ): GeneratedPack[][] {
    const playerPacks: GeneratedPack[][] = [];

    for (let player = 0; player < playersCount; player++) {
      const packs: GeneratedPack[] = [];
      
      for (let packNum = 1; packNum <= packsPerPlayer; packNum++) {
        const packId = `${setCode}-p${player + 1}-pack${packNum}-${Date.now()}`;
        const pack = this.generatePack(setCode, packId, packNum, 1);
        packs.push(pack);
      }
      
      playerPacks.push(packs);
    }

    return playerPacks;
  }

  /**
   * Analyze pack distribution for testing
   */
  analyzePackDistribution(
    setCode: string, 
    sampleSize: number = 100
  ): {
    average_rarity_counts: Record<MTGRarity, number>;
    variance: Record<MTGRarity, number>;
    pack_size_distribution: Record<number, number>;
    special_rate: number;
  } {
    const rarityCounts: Record<MTGRarity, number[]> = {
      common: [],
      uncommon: [],
      rare: [],
      mythic: [],
      special: [],
      bonus: []
    };
    
    const packSizes: number[] = [];
    let specialPacks = 0;

    // Generate sample packs
    for (let i = 0; i < sampleSize; i++) {
      const pack = this.generatePack(setCode, `test-${i}`, 1, 1);
      packSizes.push(pack.cards.length);
      
      if (pack.metadata.special_cards.length > 0) {
        specialPacks++;
      }

      // Count by rarity
      for (const rarity of Object.keys(rarityCounts) as MTGRarity[]) {
        const count = pack.cards.filter(card => card.rarity === rarity).length;
        rarityCounts[rarity].push(count);
      }
    }

    // Calculate averages and variance
    const averages: Record<MTGRarity, number> = {} as any;
    const variances: Record<MTGRarity, number> = {} as any;

    for (const [rarity, counts] of Object.entries(rarityCounts)) {
      const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
      
      averages[rarity as MTGRarity] = avg;
      variances[rarity as MTGRarity] = variance;
    }

    // Pack size distribution
    const sizeDistribution: Record<number, number> = {};
    packSizes.forEach(size => {
      sizeDistribution[size] = (sizeDistribution[size] || 0) + 1;
    });

    return {
      average_rarity_counts: averages,
      variance: variances,
      pack_size_distribution: sizeDistribution,
      special_rate: specialPacks / sampleSize
    };
  }

  /**
   * Get configuration for a set
   */
  getSetConfig(setCode: string): SetBoosterConfig | undefined {
    return this.setConfigs.get(setCode.toLowerCase());
  }

  /**
   * Update configuration for a set
   */
  updateSetConfig(setCode: string, config: Partial<SetBoosterConfig>): void {
    const existing = this.setConfigs.get(setCode.toLowerCase());
    if (existing) {
      this.setConfigs.set(setCode.toLowerCase(), { ...existing, ...config });
    }
  }

  /**
   * Get available sets
   */
  getAvailableSets(): string[] {
    return Array.from(this.setConfigs.keys()).map(code => code.toUpperCase());
  }
}

// Export singleton instance
export const packGenerator = new PackGenerator();

// Convenience functions
export async function initializePackGenerator(setData: MTGSetData): Promise<void> {
  packGenerator.initialize(setData);
}

export function generateBoosterPack(
  setCode: string,
  packId?: string,
  packNumber: number = 1
): GeneratedPack {
  const id = packId || `${setCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return packGenerator.generatePack(setCode, id, packNumber);
}

export function generateDraftSession(
  setCode: string,
  playersCount: number = 8,
  packsPerPlayer: number = 3
): GeneratedPack[][] {
  return packGenerator.generateDraftPacks(setCode, playersCount, packsPerPlayer);
}

export function analyzeSetPackDistribution(
  setCode: string,
  sampleSize: number = 100
) {
  return packGenerator.analyzePackDistribution(setCode, sampleSize);
}
