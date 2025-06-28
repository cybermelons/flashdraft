/**
 * Tests for enhanced pack generation system
 */

import { PackGenerator, createPackGenerator, generatePacksForDraft, PACK_TEMPLATES } from '../generators/PackGenerator';
import type { MTGSetData } from '../types/core';

// Mock set data for testing
const createMockSetData = (setCode: string): MTGSetData => ({
  set_code: setCode,
  name: `Test Set ${setCode}`,
  cards: [
    // Mythics
    {
      id: 'mythic-1',
      name: 'Mythic Dragon',
      set: setCode,
      rarity: 'mythic',
      type_line: 'Legendary Creature — Dragon',
      mana_cost: '{7}{R}{R}',
      cmc: 9,
      colors: ['R'],
      color_identity: ['R'],
      oracle_text: 'Flying, trample',
      power: '8',
      toughness: '8',
      collector_number: '1',
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    },
    {
      id: 'mythic-2',
      name: 'Mythic Angel',
      set: setCode,
      rarity: 'mythic',
      type_line: 'Legendary Creature — Angel',
      mana_cost: '{6}{W}{W}',
      cmc: 8,
      colors: ['W'],
      color_identity: ['W'],
      oracle_text: 'Flying, vigilance',
      power: '6',
      toughness: '6',
      collector_number: '2',
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    },
    // Rares
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `rare-${i + 1}`,
      name: `Rare Card ${i + 1}`,
      set: setCode,
      rarity: 'rare',
      type_line: 'Creature — Beast',
      mana_cost: '{4}',
      cmc: 4,
      colors: [],
      color_identity: [],
      oracle_text: 'A test rare creature.',
      power: '4',
      toughness: '4',
      collector_number: `${i + 10}`,
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    })),
    // Uncommons
    ...Array.from({ length: 30 }, (_, i) => ({
      id: `uncommon-${i + 1}`,
      name: `Uncommon Card ${i + 1}`,
      set: setCode,
      rarity: 'uncommon',
      type_line: 'Creature — Human',
      mana_cost: '{2}',
      cmc: 2,
      colors: [],
      color_identity: [],
      oracle_text: 'A test uncommon creature.',
      power: '2',
      toughness: '2',
      collector_number: `${i + 30}`,
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    })),
    // Commons
    ...Array.from({ length: 60 }, (_, i) => ({
      id: `common-${i + 1}`,
      name: `Common Card ${i + 1}`,
      set: setCode,
      rarity: 'common',
      type_line: 'Creature — Human',
      mana_cost: '{1}',
      cmc: 1,
      colors: [],
      color_identity: [],
      oracle_text: 'A test common creature.',
      power: '1',
      toughness: '1',
      collector_number: `${i + 70}`,
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    })),
    // Basic lands
    ...['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].map((name, i) => ({
      id: `basic-${i + 1}`,
      name,
      set: setCode,
      rarity: 'common',
      type_line: 'Basic Land',
      mana_cost: '',
      cmc: 0,
      colors: [],
      color_identity: [],
      oracle_text: `Tap: Add one mana of any color.`,
      collector_number: `${i + 140}`,
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    }))
  ]
});

describe('PackGenerator', () => {
  const mockSetData = createMockSetData('TEST');

  describe('basic pack generation', () => {
    test('generates packs with correct card count', () => {
      const generator = createPackGenerator('TEST');
      const pack = generator.generatePack(mockSetData, 1, 0);
      
      expect(pack.cards).toHaveLength(15);
      expect(pack.round).toBe(1);
      expect(pack.originalPlayerPosition).toBe(0);
      expect(pack.id).toBeDefined();
    });

    test('respects rarity distribution', () => {
      const generator = createPackGenerator('TEST');
      const pack = generator.generatePack(mockSetData, 1, 0);
      
      const rarities = pack.cards.map(card => card.rarity);
      const commonCount = rarities.filter(r => r === 'common').length;
      const uncommonCount = rarities.filter(r => r === 'uncommon').length;
      const rareOrMythicCount = rarities.filter(r => r === 'rare' || r === 'mythic').length;
      
      // Standard pack should have: 11 commons, 3 uncommons, 1 rare/mythic
      expect(commonCount).toBe(11);
      expect(uncommonCount).toBe(3);
      expect(rareOrMythicCount).toBe(1);
    });

    test('avoids duplicates when configured', () => {
      // Use a generator with avoidDuplicates: true
      const generator = new PackGenerator({
        setCode: 'TEST',
        template: PACK_TEMPLATES.legacy,
        avoidDuplicates: true
      });
      
      const pack = generator.generatePack(mockSetData, 1, 0);
      
      const cardIds = pack.cards.map(card => card.id);
      const uniqueIds = new Set(cardIds);
      
      expect(cardIds.length).toBe(uniqueIds.size);
    });
  });

  describe('multiple pack generation', () => {
    test('generates correct number of packs', () => {
      const generator = createPackGenerator('TEST');
      const packs = generator.generateMultiplePacks(mockSetData, 8, 1);
      
      expect(packs).toHaveLength(8);
      packs.forEach((pack, index) => {
        expect(pack.round).toBe(1);
        expect(pack.originalPlayerPosition).toBe(index);
        expect(pack.cards).toHaveLength(15);
      });
    });

    test('ensures variety across packs', () => {
      const generator = createPackGenerator('TEST');
      const packs = generator.generateMultiplePacks(mockSetData, 4, 1);
      
      // Check that not all packs have the same rare
      const rareCards = packs.map(pack => 
        pack.cards.find(card => card.rarity === 'rare' || card.rarity === 'mythic')
      );
      
      const uniqueRares = new Set(rareCards.map(card => card?.id));
      expect(uniqueRares.size).toBeGreaterThan(1);
    });
  });

  describe('deterministic generation with seeds', () => {
    test('same seed produces same packs', () => {
      const generator1 = new PackGenerator({
        setCode: 'TEST',
        template: PACK_TEMPLATES.legacy,
        seed: 'test-seed-123'
      });
      
      const generator2 = new PackGenerator({
        setCode: 'TEST',
        template: PACK_TEMPLATES.legacy,
        seed: 'test-seed-123'
      });
      
      const pack1 = generator1.generatePack(mockSetData, 1, 0);
      const pack2 = generator2.generatePack(mockSetData, 1, 0);
      
      expect(pack1.cards.map(c => c.id)).toEqual(pack2.cards.map(c => c.id));
    });

    test('different seeds produce different packs', () => {
      const generator1 = new PackGenerator({
        setCode: 'TEST',
        template: PACK_TEMPLATES.legacy,
        seed: 'seed-1'
      });
      
      const generator2 = new PackGenerator({
        setCode: 'TEST',
        template: PACK_TEMPLATES.legacy,
        seed: 'seed-2'
      });
      
      const pack1 = generator1.generatePack(mockSetData, 1, 0);
      const pack2 = generator2.generatePack(mockSetData, 1, 0);
      
      expect(pack1.cards.map(c => c.id)).not.toEqual(pack2.cards.map(c => c.id));
    });
  });

  describe('draft pack generation', () => {
    test('generates all rounds for draft', () => {
      const allPacks = generatePacksForDraft(mockSetData, 4, 3);
      
      expect(allPacks).toHaveLength(3); // 3 rounds
      expect(allPacks[0]).toHaveLength(4); // 4 players
      expect(allPacks[1]).toHaveLength(4);
      expect(allPacks[2]).toHaveLength(4);
      
      // Each pack should have correct round number
      expect(allPacks[0][0].round).toBe(1);
      expect(allPacks[1][0].round).toBe(2);
      expect(allPacks[2][0].round).toBe(3);
    });

    test('maintains consistency with same seed', () => {
      const packs1 = generatePacksForDraft(mockSetData, 3, 3, 'consistent-seed');
      const packs2 = generatePacksForDraft(mockSetData, 3, 3, 'consistent-seed');
      
      // Should generate identical pack sets
      for (let round = 0; round < 3; round++) {
        for (let player = 0; player < 3; player++) {
          const pack1Cards = packs1[round][player].cards.map(c => c.id);
          const pack2Cards = packs2[round][player].cards.map(c => c.id);
          expect(pack1Cards).toEqual(pack2Cards);
        }
      }
    });
  });

  describe('pack templates', () => {
    test('standard template has correct structure', () => {
      const template = PACK_TEMPLATES.standard;
      
      expect(template.totalCards).toBe(15);
      expect(template.hasBasicLands).toBe(true);
      expect(template.foilRate).toBe(0.25);
      
      // Should have rare/mythic, uncommons, commons, land slots
      const slotTypes = template.slots.map(slot => slot.type);
      expect(slotTypes).toContain('rarity');
      expect(slotTypes).toContain('land');
    });

    test('legacy template differs from standard', () => {
      const standard = PACK_TEMPLATES.standard;
      const legacy = PACK_TEMPLATES.legacy;
      
      expect(standard.foilRate).not.toBe(legacy.foilRate);
      expect(standard.hasBasicLands).toBe(true);
      expect(legacy.hasBasicLands).toBeUndefined();
    });
  });

  describe('error handling', () => {
    test('handles empty set data gracefully', () => {
      const emptySetData: MTGSetData = {
        set_code: 'EMPTY',
        name: 'Empty Set',
        cards: []
      };
      
      const generator = createPackGenerator('TEST');
      const pack = generator.generatePack(emptySetData, 1, 0);
      
      // Should still create pack structure, even if empty
      expect(pack.id).toBeDefined();
      expect(pack.round).toBe(1);
      expect(pack.cards).toHaveLength(0);
    });

    test('handles missing rarity cards', () => {
      const limitedSetData: MTGSetData = {
        set_code: 'LIMITED',
        name: 'Limited Set',
        cards: [
          {
            id: 'only-common',
            name: 'Only Common',
            set: 'LIMITED',
            rarity: 'common',
            type_line: 'Creature',
            mana_cost: '{1}',
            cmc: 1,
            colors: [],
            color_identity: [],
            oracle_text: 'Test',
            collector_number: '1',
            booster: true,
            image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
          }
        ]
      };
      
      const generator = createPackGenerator('TEST');
      
      // Should not crash when trying to generate rare slots
      expect(() => {
        generator.generatePack(limitedSetData, 1, 0);
      }).not.toThrow();
    });
  });
});