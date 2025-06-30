/**
 * Tests for Seeded Pack Generator
 */

import { describe, test, expect } from 'vitest';
import {
  generateAllDraftPacks,
  SeededBotDecisionMaker,
  createBotDecisionMakers,
  validatePackGeneration
} from './seededPackGenerator';

// Mock MTG set data
const createMockSetData = () => ({
  set_code: 'TEST',
  name: 'Test Set',
  cards: [
    // Mythics
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `mythic_${i}`,
      name: `Mythic ${i}`,
      rarity: 'mythic',
      mana_cost: '{5}',
      cmc: 5,
      colors: ['R'],
      booster: true,
      image_uris: { normal: `https://example.com/mythic_${i}.jpg` }
    })),
    
    // Rares  
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `rare_${i}`,
      name: `Rare ${i}`,
      rarity: 'rare',
      mana_cost: '{4}',
      cmc: 4,
      colors: ['U'],
      booster: true,
      image_uris: { normal: `https://example.com/rare_${i}.jpg` }
    })),
    
    // Uncommons
    ...Array.from({ length: 30 }, (_, i) => ({
      id: `uncommon_${i}`,
      name: `Uncommon ${i}`,
      rarity: 'uncommon',
      mana_cost: '{3}',
      cmc: 3,
      colors: ['G'],
      booster: true,
      image_uris: { normal: `https://example.com/uncommon_${i}.jpg` }
    })),
    
    // Commons
    ...Array.from({ length: 60 }, (_, i) => ({
      id: `common_${i}`,
      name: `Common ${i}`,
      rarity: 'common',
      mana_cost: '{2}',
      cmc: 2,
      colors: ['W'],
      booster: true,
      image_uris: { normal: `https://example.com/common_${i}.jpg` }
    }))
  ]
});

describe('generateAllDraftPacks', () => {
  test('generates correct number of packs', () => {
    const setData = createMockSetData();
    const seed = 'test123';
    
    const allPacks = generateAllDraftPacks(seed, setData);
    
    // Should have 3 rounds
    expect(allPacks.length).toBe(3);
    
    // Each round should have 8 packs
    allPacks.forEach(round => {
      expect(round.length).toBe(8);
    });
  });
  
  test('each pack has 15 cards', () => {
    const setData = createMockSetData();
    const seed = 'test123';
    
    const allPacks = generateAllDraftPacks(seed, setData);
    
    allPacks.forEach(round => {
      round.forEach(pack => {
        expect(pack.cards.length).toBe(15);
      });
    });
  });
  
  test('packs have correct rarity distribution', () => {
    const setData = createMockSetData();
    const seed = 'test123';
    
    const allPacks = generateAllDraftPacks(seed, setData);
    const firstPack = allPacks[0][0];
    
    const rarities = firstPack.cards.map(card => card.rarity);
    const rarityCounts = {
      mythic: rarities.filter(r => r === 'mythic').length,
      rare: rarities.filter(r => r === 'rare').length,
      uncommon: rarities.filter(r => r === 'uncommon').length,
      common: rarities.filter(r => r === 'common').length
    };
    
    // Should have exactly 1 rare/mythic
    expect(rarityCounts.mythic + rarityCounts.rare).toBe(1);
    
    // Should have 3 uncommons
    expect(rarityCounts.uncommon).toBe(3);
    
    // Rest should be commons
    expect(rarityCounts.common).toBe(11);
  });
  
  test('is deterministic with same seed', () => {
    const setData = createMockSetData();
    const seed = 'deterministic123';
    
    const packs1 = generateAllDraftPacks(seed, setData);
    const packs2 = generateAllDraftPacks(seed, setData);
    
    expect(packs1.length).toBe(packs2.length);
    
    for (let round = 0; round < packs1.length; round++) {
      expect(packs1[round].length).toBe(packs2[round].length);
      
      for (let pack = 0; pack < packs1[round].length; pack++) {
        const pack1 = packs1[round][pack];
        const pack2 = packs2[round][pack];
        
        expect(pack1.id).toBe(pack2.id);
        expect(pack1.cards.length).toBe(pack2.cards.length);
        
        for (let card = 0; card < pack1.cards.length; card++) {
          expect(pack1.cards[card].id).toBe(pack2.cards[card].id);
          expect(pack1.cards[card].instanceId).toBe(pack2.cards[card].instanceId);
        }
      }
    }
  });
  
  test('different seeds produce different packs', () => {
    const setData = createMockSetData();
    
    const packs1 = generateAllDraftPacks('seed1', setData);
    const packs2 = generateAllDraftPacks('seed2', setData);
    
    // Structure should be same
    expect(packs1.length).toBe(packs2.length);
    expect(packs1[0].length).toBe(packs2[0].length);
    
    // But contents should be different
    const firstPack1 = packs1[0][0];
    const firstPack2 = packs2[0][0];
    
    const cardIds1 = firstPack1.cards.map(c => c.id).sort();
    const cardIds2 = firstPack2.cards.map(c => c.id).sort();
    
    expect(cardIds1).not.toEqual(cardIds2);
  });
  
  test('cards have unique instance IDs within pack', () => {
    const setData = createMockSetData();
    const seed = 'instance123';
    
    const allPacks = generateAllDraftPacks(seed, setData);
    const firstPack = allPacks[0][0];
    
    const instanceIds = firstPack.cards.map(card => card.instanceId);
    const uniqueInstanceIds = new Set(instanceIds);
    
    expect(uniqueInstanceIds.size).toBe(instanceIds.length);
  });
  
  test('pack IDs are unique and deterministic', () => {
    const setData = createMockSetData();
    const seed = 'packid123';
    
    const allPacks = generateAllDraftPacks(seed, setData);
    const allPackIds = allPacks.flat().map(pack => pack.id);
    
    // All pack IDs should be unique
    expect(new Set(allPackIds).size).toBe(allPackIds.length);
    
    // Pack IDs should follow expected format
    expect(allPackIds[0]).toBe(`${seed}_r1_p1`);
    expect(allPackIds[7]).toBe(`${seed}_r1_p8`);
    expect(allPackIds[8]).toBe(`${seed}_r2_p1`);
  });
});

describe('SeededBotDecisionMaker', () => {
  test('makes consistent decisions with same seed', () => {
    const seed = 'bot123';
    const botId = 'bot1';
    
    const bot1 = new SeededBotDecisionMaker(seed, botId);
    const bot2 = new SeededBotDecisionMaker(seed, botId);
    
    const cards = [
      { id: 'card1', name: 'Card 1' },
      { id: 'card2', name: 'Card 2' }, 
      { id: 'card3', name: 'Card 3' }
    ] as any[];
    
    const choices1 = Array.from({ length: 10 }, () => bot1.makePick(cards));
    const choices2 = Array.from({ length: 10 }, () => bot2.makePick(cards));
    
    expect(choices1.map(c => c.id)).toEqual(choices2.map(c => c.id));
  });
  
  test('different bots make different decisions', () => {
    const seed = 'multibot123';
    
    const bot1 = new SeededBotDecisionMaker(seed, 'bot1');
    const bot2 = new SeededBotDecisionMaker(seed, 'bot2');
    
    const cards = [
      { id: 'card1', name: 'Card 1' },
      { id: 'card2', name: 'Card 2' },
      { id: 'card3', name: 'Card 3' },
      { id: 'card4', name: 'Card 4' },
      { id: 'card5', name: 'Card 5' }
    ] as any[];
    
    const choices1 = Array.from({ length: 20 }, () => bot1.makePick(cards));
    const choices2 = Array.from({ length: 20 }, () => bot2.makePick(cards));
    
    // Should make some different choices
    const same = choices1.filter((choice, i) => choice.id === choices2[i].id).length;
    expect(same).toBeLessThan(18); // Allow some overlap but expect differences
  });
  
  test('reset returns bot to initial state', () => {
    const seed = 'reset123';
    const bot = new SeededBotDecisionMaker(seed, 'bot1');
    
    const cards = [
      { id: 'card1', name: 'Card 1' },
      { id: 'card2', name: 'Card 2' }
    ] as any[];
    
    const firstChoice = bot.makePick(cards);
    const secondChoice = bot.makePick(cards);
    
    bot.reset();
    
    const firstChoiceAgain = bot.makePick(cards);
    const secondChoiceAgain = bot.makePick(cards);
    
    expect(firstChoice.id).toBe(firstChoiceAgain.id);
    expect(secondChoice.id).toBe(secondChoiceAgain.id);
  });
  
  test('throws on empty card array', () => {
    const bot = new SeededBotDecisionMaker('test123', 'bot1');
    
    expect(() => bot.makePick([])).toThrow('Bot bot1 has no cards to pick from');
  });
});

describe('createBotDecisionMakers', () => {
  test('creates 7 bots', () => {
    const bots = createBotDecisionMakers('test123');
    expect(bots.length).toBe(7);
  });
  
  test('bots have different decision patterns', () => {
    const bots = createBotDecisionMakers('multibots123');
    
    // Use more cards to give bots more options
    const cards = Array.from({ length: 10 }, (_, i) => ({
      id: `card${i}`,
      name: `Card ${i}`
    })) as any[];
    
    // Get multiple choices from each bot to see patterns
    const allChoices = bots.map(bot => {
      return Array.from({ length: 5 }, () => bot.makePick(cards).id);
    });
    
    // Count unique choice patterns across all bots
    const choicePatterns = allChoices.map(choices => choices.join(','));
    const uniquePatterns = new Set(choicePatterns);
    
    // Should have some variety in choice patterns
    expect(uniquePatterns.size).toBeGreaterThan(1);
  });
});

describe('validatePackGeneration', () => {
  test('returns true for deterministic generation', () => {
    const setData = createMockSetData();
    const seed = 'validation123';
    
    const isValid = validatePackGeneration(seed, setData);
    expect(isValid).toBe(true);
  });
  
  test('comprehensive validation', () => {
    const setData = createMockSetData();
    const seed = 'comprehensive123';
    
    // Run validation multiple times to ensure consistency
    for (let i = 0; i < 5; i++) {
      const isValid = validatePackGeneration(seed, setData);
      expect(isValid).toBe(true);
    }
  });
});

describe('pack generation edge cases', () => {
  test('handles set with no mythics', () => {
    const setData = {
      set_code: 'NOMYTHIC',
      cards: [
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `rare_${i}`,
          rarity: 'rare',
          booster: true
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `uncommon_${i}`,
          rarity: 'uncommon', 
          booster: true
        })),
        ...Array.from({ length: 40 }, (_, i) => ({
          id: `common_${i}`,
          rarity: 'common',
          booster: true
        }))
      ]
    };
    
    const allPacks = generateAllDraftPacks('nomythic123', setData);
    const firstPack = allPacks[0][0];
    
    // Should still have 15 cards with proper distribution
    expect(firstPack.cards.length).toBe(15);
    
    const rarities = firstPack.cards.map(c => c.rarity);
    expect(rarities.filter(r => r === 'rare').length).toBe(1);
    expect(rarities.filter(r => r === 'mythic').length).toBe(0);
  });
  
  test('handles minimal set size', () => {
    const setData = {
      set_code: 'MINIMAL',
      cards: [
        { id: 'rare1', rarity: 'rare', booster: true },
        { id: 'uncommon1', rarity: 'uncommon', booster: true },
        { id: 'uncommon2', rarity: 'uncommon', booster: true },
        { id: 'uncommon3', rarity: 'uncommon', booster: true },
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `common_${i}`,
          rarity: 'common',
          booster: true
        }))
      ]
    };
    
    expect(() => {
      generateAllDraftPacks('minimal123', setData);
    }).not.toThrow();
  });
});