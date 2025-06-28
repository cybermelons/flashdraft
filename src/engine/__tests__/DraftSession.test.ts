/**
 * Tests for DraftSession core functionality
 */

import { DraftSession } from '../DraftSession';
import type { DraftConfig, MTGSetData } from '../types/core';

// Mock set data for testing
const mockSetData: MTGSetData = {
  set_code: 'TEST',
  name: 'Test Set',
  cards: [
    {
      id: 'card-1',
      name: 'Lightning Bolt',
      set: 'TEST',
      rarity: 'common',
      type_line: 'Instant',
      mana_cost: '{R}',
      cmc: 1,
      colors: ['R'],
      color_identity: ['R'],
      oracle_text: 'Lightning Bolt deals 3 damage to any target.',
      collector_number: '1',
      booster: true,
      image_uris: {
        small: 'test.jpg',
        normal: 'test.jpg',
        large: 'test.jpg',
        png: 'test.jpg'
      }
    },
    {
      id: 'card-2',
      name: 'Giant Growth',
      set: 'TEST',
      rarity: 'common',
      type_line: 'Instant',
      mana_cost: '{G}',
      cmc: 1,
      colors: ['G'],
      color_identity: ['G'],
      oracle_text: 'Target creature gets +3/+3 until end of turn.',
      collector_number: '2',
      booster: true,
      image_uris: {
        small: 'test.jpg',
        normal: 'test.jpg',
        large: 'test.jpg',
        png: 'test.jpg'
      }
    },
    {
      id: 'card-3',
      name: 'Counterspell',
      set: 'TEST',
      rarity: 'uncommon',
      type_line: 'Instant',
      mana_cost: '{U}{U}',
      cmc: 2,
      colors: ['U'],
      color_identity: ['U'],
      oracle_text: 'Counter target spell.',
      collector_number: '3',
      booster: true,
      image_uris: {
        small: 'test.jpg',
        normal: 'test.jpg',
        large: 'test.jpg',
        png: 'test.jpg'
      }
    }
  ]
};

// Add more cards to fill out rarity requirements
for (let i = 4; i <= 20; i++) {
  mockSetData.cards.push({
    id: `card-${i}`,
    name: `Test Card ${i}`,
    set: 'TEST',
    rarity: i % 3 === 0 ? 'rare' : 'common',
    type_line: 'Creature',
    mana_cost: '{1}',
    cmc: 1,
    colors: [],
    color_identity: [],
    oracle_text: 'A test creature.',
    power: '1',
    toughness: '1',
    collector_number: `${i}`,
    booster: true,
    image_uris: {
      small: 'test.jpg',
      normal: 'test.jpg',
      large: 'test.jpg',
      png: 'test.jpg'
    }
  });
}

const mockConfig: DraftConfig = {
  setCode: 'TEST',
  setData: mockSetData,
  playerCount: 3,
  humanPlayerId: 'human-1',
  botPersonalities: ['silver', 'gold']
};

describe('DraftSession', () => {
  test('creates new session', () => {
    const session = DraftSession.create(mockConfig);
    
    expect(session.state.id).toBeDefined();
    expect(session.state.status).toBe('setup');
    expect(session.state.players).toHaveLength(0);
    expect(session.state.currentRound).toBe(1);
    expect(session.state.currentPick).toBe(1);
  });

  test('adds players', () => {
    let session = DraftSession.create(mockConfig);
    
    // Add human player
    const addHumanResult = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'human-1',
      name: 'Human Player',
      isHuman: true
    });
    
    expect(addHumanResult.success).toBe(true);
    if (addHumanResult.success) {
      session = addHumanResult.data;
      expect(session.state.players).toHaveLength(1);
      expect(session.state.players[0].name).toBe('Human Player');
      expect(session.state.players[0].isHuman).toBe(true);
    }

    // Add bot player
    const addBotResult = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'bot-1',
      name: 'Bot Player',
      isHuman: false,
      personality: 'gold'
    });
    
    expect(addBotResult.success).toBe(true);
    if (addBotResult.success) {
      session = addBotResult.data;
      expect(session.state.players).toHaveLength(2);
      expect(session.state.players[1].personality).toBe('gold');
    }
  });

  test('starts draft with sufficient players', () => {
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
      isHuman: false
    }).data!;
    
    // Start draft
    const startResult = session.applyAction({ type: 'START_DRAFT' });
    
    expect(startResult.success).toBe(true);
    if (startResult.success) {
      session = startResult.data;
      expect(session.state.status).toBe('active');
      expect(session.state.packs).toHaveLength(3); // 3 rounds
      expect(session.state.packs[0]).toHaveLength(2); // 2 players
      
      // Players should have packs
      expect(session.state.players[0].currentPack).toBeDefined();
      expect(session.state.players[1].currentPack).toBeDefined();
    }
  });

  test('validates picks correctly', () => {
    let session = DraftSession.create(mockConfig);
    
    // Add players and start draft
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
      isHuman: false
    }).data!;
    
    session = session.applyAction({ type: 'START_DRAFT' }).data!;
    
    const humanPack = session.getCurrentPack('human-1');
    expect(humanPack).toBeDefined();
    
    if (humanPack && humanPack.cards.length > 0) {
      const cardId = humanPack.cards[0].id;
      
      // Valid pick
      expect(session.canMakePick('human-1', cardId)).toBe(true);
      
      // Invalid card
      expect(session.canMakePick('human-1', 'nonexistent-card')).toBe(false);
      
      // Invalid player
      expect(session.canMakePick('nonexistent-player', cardId)).toBe(false);
    }
  });

  test('processes picks and updates state', () => {
    let session = DraftSession.create(mockConfig);
    
    // Setup draft
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
      isHuman: false
    }).data!;
    
    session = session.applyAction({ type: 'START_DRAFT' }).data!;
    
    const humanPack = session.getCurrentPack('human-1');
    expect(humanPack).toBeDefined();
    
    if (humanPack && humanPack.cards.length > 0) {
      const cardToPick = humanPack.cards[0];
      const initialPackSize = humanPack.cards.length;
      
      // Make pick
      const pickResult = session.applyAction({
        type: 'MAKE_PICK',
        playerId: 'human-1',
        cardId: cardToPick.id
      });
      
      expect(pickResult.success).toBe(true);
      if (pickResult.success) {
        session = pickResult.data;
        
        // Card should be in player's picked cards
        const humanPlayer = session.state.players.find(p => p.id === 'human-1');
        expect(humanPlayer?.pickedCards).toContainEqual(cardToPick);
        
        // After human pick, bots also pick automatically, so pack may be passed
        // Just verify the human player has the picked card
        const newHumanPack = session.getCurrentPack('human-1');
        if (newHumanPack) {
          // Pack size depends on whether bots have picked too
          expect(newHumanPack.cards.length).toBeLessThan(initialPackSize);
          expect(newHumanPack.cards.find(c => c.id === cardToPick.id)).toBeUndefined();
        }
      }
    }
  });

  test('serializes and deserializes correctly', () => {
    let session = DraftSession.create(mockConfig);
    
    // Add some history
    session = session.applyAction({
      type: 'ADD_PLAYER',
      playerId: 'human-1',
      name: 'Human',
      isHuman: true
    }).data!;
    
    // Serialize
    const serialized = session.serialize();
    expect(serialized).toBeDefined();
    
    // Deserialize
    const deserializeResult = DraftSession.deserialize(serialized);
    expect(deserializeResult.success).toBe(true);
    
    if (deserializeResult.success) {
      const restoredSession = deserializeResult.data;
      expect(restoredSession.state.id).toBe(session.state.id);
      expect(restoredSession.state.players).toHaveLength(1);
      expect(restoredSession.state.history).toHaveLength(session.state.history.length);
    }
  });
});