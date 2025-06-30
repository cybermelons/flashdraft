/**
 * Pack Generator Tests - Verify MTG booster pack generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PackGenerator, type SetData, type Card } from './PackGenerator';

// Create realistic mock set data
const createMockSetData = (): SetData => ({
  setCode: 'TST',
  name: 'Test Set',
  cards: [
    // Commons (101 cards for variety)
    ...Array.from({ length: 101 }, (_, i) => ({
      id: `common-${i}`,
      name: `Common Card ${i}`,
      setCode: 'TST',
      rarity: 'common' as const,
      manaCost: `{${(i % 7) + 1}}`,
      type: i % 3 === 0 ? 'Creature' : i % 3 === 1 ? 'Instant' : 'Sorcery',
      colors: [['W', 'U', 'B', 'R', 'G'][i % 5]]
    })),
    // Uncommons (80 cards)
    ...Array.from({ length: 80 }, (_, i) => ({
      id: `uncommon-${i}`,
      name: `Uncommon Card ${i}`,
      setCode: 'TST',
      rarity: 'uncommon' as const,
      manaCost: `{${(i % 5) + 2}}`,
      type: i % 4 === 0 ? 'Creature' : i % 4 === 1 ? 'Enchantment' : i % 4 === 2 ? 'Artifact' : 'Instant',
      colors: [['W', 'U', 'B', 'R', 'G'][i % 5]]
    })),
    // Rares (53 cards)
    ...Array.from({ length: 53 }, (_, i) => ({
      id: `rare-${i}`,
      name: `Rare Card ${i}`,
      setCode: 'TST',
      rarity: 'rare' as const,
      manaCost: `{${(i % 4) + 3}}`,
      type: i % 2 === 0 ? 'Creature' : 'Enchantment',
      colors: i % 10 === 0 ? ['W', 'U'] : [['W', 'U', 'B', 'R', 'G'][i % 5]]
    })),
    // Mythics (15 cards)
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `mythic-${i}`,
      name: `Mythic Card ${i}`,
      setCode: 'TST',
      rarity: 'mythic' as const,
      manaCost: `{${(i % 3) + 5}}`,
      type: 'Legendary Creature',
      colors: ['B', 'R']
    }))
  ]
});

describe('PackGenerator', () => {
  let mockSetData: SetData;
  let generator: PackGenerator;

  beforeEach(() => {
    mockSetData = createMockSetData();
    generator = new PackGenerator(mockSetData, 'test-seed');
  });

  describe('Pack Generation', () => {
    it('should generate pack with exactly 15 cards', () => {
      const pack = generator.generatePack('pack-1');
      expect(pack.cards).toHaveLength(15);
    });

    it('should include correct rarity distribution', () => {
      // Generate many packs to test distribution
      const packs = Array.from({ length: 100 }, (_, i) => 
        generator.generatePack(`pack-${i}`)
      );

      packs.forEach((pack, index) => {
        const stats = generator.getPackStats(pack);
        
        // Commons: 10-11
        expect(stats.common, `Pack ${index} should have 10-11 commons`).toBeGreaterThanOrEqual(10);
        expect(stats.common, `Pack ${index} should have 10-11 commons`).toBeLessThanOrEqual(11);
        
        // Uncommons: 3-4
        expect(stats.uncommon, `Pack ${index} should have 3-4 uncommons`).toBeGreaterThanOrEqual(3);
        expect(stats.uncommon, `Pack ${index} should have 3-4 uncommons`).toBeLessThanOrEqual(4);
        
        // Rare or Mythic: exactly 1
        const rareAndMythic = (stats.rare || 0) + (stats.mythic || 0);
        expect(rareAndMythic, `Pack ${index} should have exactly 1 rare/mythic, got ${JSON.stringify(stats)}`).toBe(1);
      });
    });

    it('should have approximately 1/8 mythic rate', () => {
      const packCount = 800;
      const packs = Array.from({ length: packCount }, (_, i) => 
        generator.generatePack(`pack-${i}`)
      );

      const mythicCount = packs.filter(pack => {
        const stats = generator.getPackStats(pack);
        return stats.mythic === 1;
      }).length;

      // Expect roughly 12.5% mythics (±5%)
      const mythicRate = mythicCount / packCount;
      expect(mythicRate).toBeGreaterThan(0.075); // 7.5%
      expect(mythicRate).toBeLessThan(0.175); // 17.5%
    });

    it('should not duplicate cards within a pack', () => {
      const pack = generator.generatePack('pack-1');
      const cardIds = pack.cards.map(c => c.id);
      const uniqueIds = new Set(cardIds);
      
      expect(uniqueIds.size).toBe(cardIds.length);
    });

    it('should set correct pack metadata', () => {
      const pack = generator.generatePack('pack-123');
      
      expect(pack.id).toBe('pack-123');
      expect(pack.setCode).toBe('TST');
    });
  });

  describe('Determinism', () => {
    it('should generate identical packs with same seed', () => {
      const gen1 = new PackGenerator(mockSetData, 'same-seed');
      const gen2 = new PackGenerator(mockSetData, 'same-seed');

      const pack1 = gen1.generatePack('pack-1');
      const pack2 = gen2.generatePack('pack-1');

      expect(pack1.cards.map(c => c.id)).toEqual(pack2.cards.map(c => c.id));
    });

    it('should generate different packs with different seeds', () => {
      const gen1 = new PackGenerator(mockSetData, 'seed-1');
      const gen2 = new PackGenerator(mockSetData, 'seed-2');

      const pack1 = gen1.generatePack('pack-1');
      const pack2 = gen2.generatePack('pack-1');

      expect(pack1.cards.map(c => c.id)).not.toEqual(pack2.cards.map(c => c.id));
    });

    it('should generate different packs with same generator', () => {
      const pack1 = generator.generatePack('pack-1');
      const pack2 = generator.generatePack('pack-2');

      // Packs should be different (extremely unlikely to be same)
      expect(pack1.cards.map(c => c.id)).not.toEqual(pack2.cards.map(c => c.id));
    });
  });

  describe('Multiple Pack Generation', () => {
    it('should generate requested number of packs', () => {
      const packs = generator.generatePacks(8, 'draft-1');
      expect(packs).toHaveLength(8);
    });

    it('should generate unique packs', () => {
      const packs = generator.generatePacks(8, 'draft-1');
      
      // Each pack should have unique ID
      const packIds = packs.map(p => p.id);
      expect(new Set(packIds).size).toBe(8);
      
      // Packs should have different cards (statistically)
      const firstCards = packs.map(p => p.cards[0].id);
      expect(new Set(firstCards).size).toBeGreaterThan(1);
    });

    it('should use different seeds for each pack', () => {
      const packs = generator.generatePacks(3, 'base-seed');
      
      expect(packs[0].id).toBe('base-seed_pack_0');
      expect(packs[1].id).toBe('base-seed_pack_1');
      expect(packs[2].id).toBe('base-seed_pack_2');
    });
  });

  describe('Pack Validation', () => {
    it('should validate correct pack', () => {
      const pack = generator.generatePack('pack-1');
      expect(generator.validatePack(pack)).toBe(true);
    });

    it('should reject pack with wrong card count', () => {
      const pack = generator.generatePack('pack-1');
      pack.cards.pop(); // Remove one card
      expect(generator.validatePack(pack)).toBe(false);
    });

    it('should reject pack with wrong common count', () => {
      const pack = generator.generatePack('pack-1');
      // Replace all commons with uncommons
      pack.cards = pack.cards.map(card => 
        card.rarity === 'common' ? { ...card, rarity: 'uncommon' as const } : card
      );
      expect(generator.validatePack(pack)).toBe(false);
    });

    it('should reject pack with multiple rares/mythics', () => {
      const pack = generator.generatePack('pack-1');
      // Add extra rare
      pack.cards[0] = { ...pack.cards[0], rarity: 'rare' };
      pack.cards[1] = { ...pack.cards[1], rarity: 'rare' };
      expect(generator.validatePack(pack)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle set with no mythics', () => {
      const noMythicSet: SetData = {
        setCode: 'NOM',
        name: 'No Mythics',
        cards: [
          ...Array.from({ length: 101 }, (_, i) => ({
            id: `common-${i}`,
            name: `Common ${i}`,
            setCode: 'NOM',
            rarity: 'common' as const
          })),
          ...Array.from({ length: 40 }, (_, i) => ({
            id: `uncommon-${i}`,
            name: `Uncommon ${i}`,
            setCode: 'NOM',
            rarity: 'uncommon' as const
          })),
          ...Array.from({ length: 20 }, (_, i) => ({
            id: `rare-${i}`,
            name: `Rare ${i}`,
            setCode: 'NOM',
            rarity: 'rare' as const
          }))
        ]
      };

      const gen = new PackGenerator(noMythicSet, 'no-mythic-seed');
      const pack = gen.generatePack('pack-1');
      const stats = gen.getPackStats(pack);
      
      expect(stats.rare).toBe(1);
      expect(stats.mythic).toBeUndefined();
    });

    it('should handle small card pools', () => {
      const smallSet: SetData = {
        setCode: 'SML',
        name: 'Small Set',
        cards: [
          // Minimum viable set
          ...Array.from({ length: 15 }, (_, i) => ({
            id: `common-${i}`,
            name: `Common ${i}`,
            setCode: 'SML',
            rarity: 'common' as const
          })),
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `uncommon-${i}`,
            name: `Uncommon ${i}`,
            setCode: 'SML',
            rarity: 'uncommon' as const
          })),
          ...Array.from({ length: 3 }, (_, i) => ({
            id: `rare-${i}`,
            name: `Rare ${i}`,
            setCode: 'SML',
            rarity: 'rare' as const
          }))
        ]
      };

      const gen = new PackGenerator(smallSet, 'small-seed');
      const pack = gen.generatePack('pack-1');
      
      expect(pack.cards).toHaveLength(15);
      expect(generator.validatePack(pack)).toBe(true);
    });
  });

  describe('Pack Statistics', () => {
    it('should calculate correct statistics', () => {
      const pack = generator.generatePack('pack-1');
      const stats = generator.getPackStats(pack);
      
      const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(15);
      
      // Check all cards are accounted for
      const actualRarities = pack.cards.reduce((acc, card) => {
        acc[card.rarity] = (acc[card.rarity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(stats).toEqual(actualRarities);
    });
  });
});