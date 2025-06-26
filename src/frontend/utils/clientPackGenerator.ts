/**
 * FlashDraft - Client-Safe Pack Generation
 * 
 * Client-side pack generation utilities without Node.js dependencies.
 */

import type { MTGCard, MTGSetData, DraftCard, MTGRarity } from '../../shared/types/card.js';

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

// Client-safe utility functions
const groupCardsByRarity = (cards: MTGCard[]): Record<MTGRarity, MTGCard[]> => {
  const groups: Record<MTGRarity, MTGCard[]> = {
    common: [],
    uncommon: [],
    rare: [],
    mythic: [],
    special: [],
    bonus: []
  };
  
  cards.forEach(card => {
    if (groups[card.rarity]) {
      groups[card.rarity].push(card);
    }
  });
  
  return groups;
};

const toDraftCard = (card: MTGCard): DraftCard => {
  return {
    ...card,
    pick_priority: calculateBasicPickPriority(card),
    synergy_tags: generateSynergyTags(card)
  };
};

const calculateBasicPickPriority = (card: MTGCard): number => {
  let priority = 0;
  
  switch (card.rarity) {
    case 'mythic': priority += 100; break;
    case 'rare': priority += 80; break;
    case 'uncommon': priority += 40; break;
    case 'common': priority += 20; break;
  }
  
  if (card.type_line.includes('Creature')) {
    priority += 10;
  }
  
  const text = card.oracle_text?.toLowerCase() || '';
  if (text.includes('destroy') || text.includes('exile')) {
    priority += 15;
  }
  
  return priority;
};

const generateSynergyTags = (card: MTGCard): string[] => {
  const tags: string[] = [];
  const text = card.oracle_text?.toLowerCase() || '';
  const types = card.type_line.split('—')[0].trim().split(' ');
  
  tags.push(...types.map(type => type.toLowerCase()));
  
  if (card.color_identity) {
    card.color_identity.forEach(color => {
      tags.push(`color-${color.toLowerCase()}`);
    });
  }
  
  if (text.includes('flying')) tags.push('flying');
  if (text.includes('trample')) tags.push('trample');
  if (text.includes('lifelink')) tags.push('lifelink');
  
  return tags;
};

class ClientPackGenerator {
  private rarityPools: Map<string, Record<MTGRarity, MTGCard[]>> = new Map();
  private setConfigs: Map<string, SetBoosterConfig> = new Map();

  initialize(setData: MTGSetData): void {
    const setCode = setData.set_info.code.toLowerCase();
    
    const draftableCards = setData.cards.filter(card => card.booster);
    const rarityGroups = groupCardsByRarity(draftableCards);
    this.rarityPools.set(setCode, rarityGroups);
    
    const config: SetBoosterConfig = {
      set_code: setData.set_info.code.toUpperCase(),
      set_name: setData.set_info.name,
      total_cards_per_pack: 15,
      slots: [
        { rarity: 'common', count: 10 },
        { rarity: 'uncommon', count: 3 },
        { rarity: 'rare', count: 1 },
      ]
    };
    
    this.setConfigs.set(setCode, config);
  }

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

    for (const slot of config.slots) {
      for (let i = 0; i < slot.count; i++) {
        let selectedRarity = slot.rarity;
        
        if (slot.rarity === 'rare' && Math.random() < 0.125) {
          selectedRarity = 'mythic';
          metadata.mythic_count++;
        } else if (slot.rarity === 'rare') {
          metadata.rare_count++;
        }

        const pool = rarityGroups[selectedRarity];
        if (pool && pool.length > 0) {
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

    // Shuffle the pack
    for (let i = pack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pack[i], pack[j]] = [pack[j], pack[i]];
    }

    const draftCards = pack.map(toDraftCard);

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
}

export const clientPackGenerator = new ClientPackGenerator();

export function generateBoosterPack(
  setCode: string,
  packId?: string,
  packNumber: number = 1
): GeneratedPack {
  const id = packId || `${setCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return clientPackGenerator.generatePack(setCode, id, packNumber);
}

export function generateDraftSession(
  setCode: string,
  playersCount: number = 8,
  packsPerPlayer: number = 3
): GeneratedPack[][] {
  return clientPackGenerator.generateDraftPacks(setCode, playersCount, packsPerPlayer);
}