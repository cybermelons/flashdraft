/**
 * Tests for bot integration in DraftSession
 */

import { DraftSession } from '../DraftSession';
import { DraftBot, BotProcessor, calculateBotDelay } from '../bots/DraftBot';
import type { DraftConfig, MTGSetData, Card, DraftContext } from '../types/core';

// Mock set data for testing
const mockSetData: MTGSetData = {
  set_code: 'TEST',
  name: 'Test Set',
  cards: [
    // High-value mythic
    {
      id: 'bomb-mythic',
      name: 'Lightning Dragon',
      set: 'TEST',
      rarity: 'mythic',
      type_line: 'Creature — Dragon',
      mana_cost: '{5}{R}{R}',
      cmc: 7,
      colors: ['R'],
      color_identity: ['R'],
      oracle_text: 'Flying, haste. When Lightning Dragon enters the battlefield, it deals 5 damage to any target.',
      power: '6',
      toughness: '4',
      collector_number: '1',
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    },
    // Good removal spell
    {
      id: 'removal-spell',
      name: 'Destroy Target',
      set: 'TEST',
      rarity: 'uncommon',
      type_line: 'Instant',
      mana_cost: '{2}{B}',
      cmc: 3,
      colors: ['B'],
      color_identity: ['B'],
      oracle_text: 'Destroy target creature.',
      collector_number: '2',
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    },
    // Efficient creature
    {
      id: 'good-creature',
      name: 'Grizzly Bears',
      set: 'TEST',
      rarity: 'common',
      type_line: 'Creature — Bear',
      mana_cost: '{1}{G}',
      cmc: 2,
      colors: ['G'],
      color_identity: ['G'],
      oracle_text: '',
      power: '2',
      toughness: '2',
      collector_number: '3',
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    },
    // Overcosted creature
    {
      id: 'bad-creature',
      name: 'Expensive Bear',
      set: 'TEST',
      rarity: 'common',
      type_line: 'Creature — Bear',
      mana_cost: '{5}',
      cmc: 5,
      colors: [],
      color_identity: [],
      oracle_text: '',
      power: '2',
      toughness: '2',
      collector_number: '4',
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    },
    // Add more cards for complete pack
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `filler-${i + 1}`,
      name: `Filler Card ${i + 1}`,
      set: 'TEST',
      rarity: 'common',
      type_line: 'Creature',
      mana_cost: '{2}',
      cmc: 2,
      colors: [],
      color_identity: [],
      oracle_text: 'A filler creature.',
      power: '1',
      toughness: '1',
      collector_number: `${i + 10}`,
      booster: true,
      image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
    }))
  ]
};

const mockConfig: DraftConfig = {
  setCode: 'TEST',
  setData: mockSetData,
  playerCount: 3,
  humanPlayerId: 'human-1',
  botPersonalities: ['silver', 'gold']
};

describe('DraftBot', () => {
  describe('card selection', () => {
    test('selects highest priority card', () => {
      const bot = new DraftBot();
      const availableCards: Card[] = [
        mockSetData.cards[3], // bad creature
        mockSetData.cards[0], // bomb mythic
        mockSetData.cards[2]  // good creature
      ];
      
      const context: DraftContext = {
        round: 1,
        pick: 1,
        packPosition: 0,
        direction: 'clockwise',
        totalPlayers: 3
      };
      
      const selected = bot.selectCard(availableCards, [], context, 'mythic');
      
      // Should pick the bomb mythic
      expect(selected.id).toBe('bomb-mythic');
    });

    test('considers color commitment', () => {
      const bot = new DraftBot();
      
      // Create a better green card to compete with removal
      const goodGreenCard: Card = {
        id: 'good-green',
        name: 'Excellent Green Creature',
        set: 'TEST',
        rarity: 'uncommon',
        type_line: 'Creature — Beast',
        mana_cost: '{2}{G}',
        cmc: 3,
        colors: ['G'],
        color_identity: ['G'],
        oracle_text: 'Trample. When this enters the battlefield, draw a card.',
        power: '3',
        toughness: '3',
        collector_number: '50',
        booster: true,
        image_uris: { small: 'test.jpg', normal: 'test.jpg', large: 'test.jpg', png: 'test.jpg' }
      };
      
      const availableCards: Card[] = [
        mockSetData.cards[1], // black removal
        goodGreenCard         // good green creature
      ];
      
      const pickedCards: Card[] = [
        mockSetData.cards[2], // already picked green
        goodGreenCard         // another green card
      ];
      
      const context: DraftContext = {
        round: 1,
        pick: 3,
        packPosition: 0,
        direction: 'clockwise',
        totalPlayers: 3
      };
      
      // Run multiple times since there's randomness
      let greenPicks = 0;
      for (let i = 0; i < 10; i++) {
        const selected = bot.selectCard(availableCards, pickedCards, context, 'gold');
        if (selected.colors?.includes('G')) {
          greenPicks++;
        }
      }
      
      // Gold bot should show color commitment most of the time
      expect(greenPicks).toBeGreaterThan(6);
    });

    test('bronze bot shows more randomness', () => {
      const bot = new DraftBot();
      const availableCards: Card[] = [
        mockSetData.cards[0], // bomb mythic (should be clear best)
        mockSetData.cards[3]  // bad creature
      ];
      
      const context: DraftContext = {
        round: 1,
        pick: 1,
        packPosition: 0,
        direction: 'clockwise',
        totalPlayers: 3
      };
      
      // Run multiple times to check for variability
      const selections = [];
      for (let i = 0; i < 10; i++) {
        const selected = bot.selectCard(availableCards, [], context, 'bronze');
        selections.push(selected.id);
      }
      
      // Bronze bot should usually pick the mythic, but might occasionally pick poorly
      const mythicPicks = selections.filter(id => id === 'bomb-mythic').length;
      expect(mythicPicks).toBeGreaterThan(6); // Should pick correctly most of the time
      expect(mythicPicks).toBeLessThan(10); // But not always due to randomness
    });
  });

  describe('timing calculations', () => {
    test('different personalities have different timing', () => {
      const bronzeDelay = calculateBotDelay('bronze');
      const mythicDelay = calculateBotDelay('mythic');
      
      // On average, bronze should be slower than mythic
      // Run multiple times to check average
      let bronzeTotal = 0;
      let mythicTotal = 0;
      
      for (let i = 0; i < 50; i++) {
        bronzeTotal += calculateBotDelay('bronze');
        mythicTotal += calculateBotDelay('mythic');
      }
      
      const bronzeAvg = bronzeTotal / 50;
      const mythicAvg = mythicTotal / 50;
      
      expect(bronzeAvg).toBeGreaterThan(mythicAvg);
    });

    test('timing has reasonable ranges', () => {
      for (let i = 0; i < 20; i++) {
        const delay = calculateBotDelay('silver');
        expect(delay).toBeGreaterThan(500); // At least 0.5 seconds
        expect(delay).toBeLessThan(5000); // At most 5 seconds
      }
    });
  });
});

describe('BotProcessor', () => {
  test('processes all bot picks in draft state', () => {
    const processor = new BotProcessor();
    
    // Create a draft session with bots
    let session = DraftSession.create(mockConfig);
    
    // Add players
    session = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'human-1',
      name: 'Human',
      isHuman: true
    }).data!;
    
    session = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'bot-1',
      name: 'Bot 1',
      isHuman: false,
      personality: 'silver'
    }).data!;
    
    session = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'bot-2',
      name: 'Bot 2',
      isHuman: false,
      personality: 'gold'
    }).data!;
    
    // Start draft
    session = session.applyAction({ type: 'START_DRAFT' }).data!;
    
    // Process bot decisions
    const decisions = processor.processAllBotPicks(session.state);
    
    expect(decisions).toHaveLength(2); // Two bots
    expect(decisions[0].playerId).toBe('bot-1');
    expect(decisions[1].playerId).toBe('bot-2');
    expect(decisions[0].selectedCardId).toBeDefined();
    expect(decisions[1].selectedCardId).toBeDefined();
    expect(decisions[0].confidence).toBeGreaterThan(0);
    expect(decisions[0].confidence).toBeLessThanOrEqual(1);
  });

  test('handles bot processing errors gracefully', () => {
    const processor = new BotProcessor();
    
    // Create invalid state (bot has pack but no cards in it)
    const invalidState = {
      id: 'test',
      config: mockConfig,
      players: [{
        id: 'bot-1',
        name: 'Bot 1',
        isHuman: false,
        position: 0,
        pickedCards: [],
        personality: 'silver' as const,
        currentPack: {
          id: 'empty-pack',
          cards: [], // Empty pack should cause error
          round: 1,
          originalPlayerPosition: 0
        }
      }],
      packs: [],
      currentRound: 1,
      currentPick: 1,
      direction: 'clockwise' as const,
      status: 'active' as const,
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(() => {
      processor.processBotPick(invalidState, invalidState.players[0]);
    }).toThrow();
  });
});

describe('DraftSession bot integration', () => {
  test('automatically processes bot picks after human pick', () => {
    let session = DraftSession.create(mockConfig);
    
    // Add players
    session = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'human-1',
      name: 'Human',
      isHuman: true
    }).data!;
    
    session = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'bot-1',
      name: 'Bot 1',
      isHuman: false,
      personality: 'silver'
    }).data!;
    
    // Start draft
    session = session.applyAction({ type: 'START_DRAFT' }).data!;
    
    const humanPack = session.getCurrentPack('human-1');
    expect(humanPack).toBeDefined();
    
    if (humanPack && humanPack.cards.length > 0) {
      const initialHumanCards = session.getPlayerCards('human-1').length;
      const initialBotCards = session.getPlayerCards('bot-1').length;
      
      // Human makes a pick
      const pickResult = session.applyAction({
        type: 'MAKE_PICK',
        playerId: 'human-1',
        cardId: humanPack.cards[0].id
      });
      
      expect(pickResult.success).toBe(true);
      
      if (pickResult.success) {
        session = pickResult.data;
        
        // Both human and bot should have picked
        expect(session.getPlayerCards('human-1')).toHaveLength(initialHumanCards + 1);
        expect(session.getPlayerCards('bot-1')).toHaveLength(initialBotCards + 1);
      }
    }
  });

  test('processes individual bot picks correctly', () => {
    let session = DraftSession.create(mockConfig);
    
    // Add players
    session = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'human-1',
      name: 'Human',
      isHuman: true
    }).data!;
    
    session = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'bot-1',
      name: 'Bot 1',
      isHuman: false,
      personality: 'gold'
    }).data!;
    
    // Start draft
    session = session.applyAction({ type: 'START_DRAFT' }).data!;
    
    const botsNeedingPicks = session.getBotsNeedingPicks();
    expect(botsNeedingPicks).toHaveLength(1);
    expect(botsNeedingPicks[0].id).toBe('bot-1');
    
    // Process single bot pick
    const result = session.processSingleBotPick('bot-1');
    expect(result.success).toBe(true);
    
    if (result.success) {
      session = result.data;
      expect(session.getPlayerCards('bot-1')).toHaveLength(1);
    }
  });

  test('validates bot pick attempts on human players', () => {
    let session = DraftSession.create(mockConfig);
    
    // Add human player
    session = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'human-1',
      name: 'Human',
      isHuman: true
    }).data!;
    
    // Try to process bot pick on human
    const result = session.processSingleBotPick('human-1');
    expect(result.success).toBe(false);
    expect(result.error?.type).toBe('INVALID_ACTION');
  });

  test('handles missing bot players', () => {
    const session = DraftSession.create(mockConfig);
    
    const result = session.processSingleBotPick('nonexistent-bot');
    expect(result.success).toBe(false);
    expect(result.error?.type).toBe('PLAYER_NOT_FOUND');
  });
});