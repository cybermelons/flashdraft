/**
 * Tests for Draft Replay Engine
 */

import { describe, test, expect } from 'vitest';
import {
  createSeededDraft,
  startSeededDraft,
  replayDraftToPosition,
  applyDelta,
  navigateToPosition,
  validateReplay
} from './draftReplayEngine';
import { createDraftDelta } from '../types/draftDelta';
import { getPackDirection } from '../types/seededDraftState';

// Mock set data
const createMockSetData = () => ({
  set_code: 'TEST',
  name: 'Test Set',
  cards: [
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `rare_${i}`,
      name: `Rare ${i}`,
      rarity: 'rare',
      mana_cost: '{4}',
      cmc: 4,
      colors: ['U'],
      booster: true,
      image_uris: { normal: `https://example.com/rare_${i}.jpg` }
    })),
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `uncommon_${i}`,
      name: `Uncommon ${i}`,
      rarity: 'uncommon',
      mana_cost: '{3}',
      cmc: 3,
      colors: ['G'],
      booster: true,
      image_uris: { normal: `https://example.com/uncommon_${i}.jpg` }
    })),
    ...Array.from({ length: 40 }, (_, i) => ({
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

describe('createSeededDraft', () => {
  test('creates draft with correct initial state', () => {
    const setData = createMockSetData();
    const seed = 'test123';
    
    const draft = createSeededDraft({ seed, setData });
    
    expect(draft.id).toBe(seed);
    expect(draft.seed).toBe(seed);
    expect(draft.status).toBe('setup');
    expect(draft.round).toBe(1);
    expect(draft.pick).toBe(1);
    expect(draft.players.length).toBe(8);
    expect(draft.deltas.length).toBe(0);
    expect(draft.allPacks.length).toBe(3); // 3 rounds
    expect(draft.allPacks[0].length).toBe(8); // 8 players
  });
  
  test('generates unique seed if not provided', () => {
    const setData = createMockSetData();
    
    const draft1 = createSeededDraft({ setData });
    const draft2 = createSeededDraft({ setData });
    
    expect(draft1.seed).not.toBe(draft2.seed);
    expect(draft1.id).not.toBe(draft2.id);
  });
  
  test('creates deterministic packs with same seed', () => {
    const setData = createMockSetData();
    const seed = 'deterministic123';
    
    const draft1 = createSeededDraft({ seed, setData });
    const draft2 = createSeededDraft({ seed, setData });
    
    // Packs should be identical
    expect(draft1.allPacks.length).toBe(draft2.allPacks.length);
    
    for (let round = 0; round < draft1.allPacks.length; round++) {
      for (let player = 0; player < draft1.allPacks[round].length; player++) {
        const pack1 = draft1.allPacks[round][player];
        const pack2 = draft2.allPacks[round][player];
        
        expect(pack1.id).toBe(pack2.id);
        expect(pack1.cards.map(c => c.id)).toEqual(pack2.cards.map(c => c.id));
      }
    }
  });
});

describe('startSeededDraft', () => {
  test('distributes initial packs to players', () => {
    const setData = createMockSetData();
    const draft = createSeededDraft({ seed: 'start123', setData });
    
    const startedDraft = startSeededDraft(draft);
    
    expect(startedDraft.status).toBe('active');
    
    // All players should have packs
    startedDraft.players.forEach((player, index) => {
      expect(player.currentPack).not.toBeNull();
      expect(player.currentPack!.cards.length).toBe(15);
      expect(player.currentPack!.id).toBe(`start123_r1_p${index + 1}`);
    });
  });
  
  test('throws error if draft not in setup', () => {
    const setData = createMockSetData();
    const draft = createSeededDraft({ seed: 'error123', setData });
    const startedDraft = startSeededDraft(draft);
    
    expect(() => startSeededDraft(startedDraft)).toThrow('Draft must be in setup status to start');
  });
});

describe('applyDelta', () => {
  test('applies pick delta correctly', () => {
    const setData = createMockSetData();
    const draft = createSeededDraft({ seed: 'pick123', setData });
    const startedDraft = startSeededDraft(draft);
    
    const humanPlayer = startedDraft.players.find(p => p.isHuman)!;
    const firstCard = humanPlayer.currentPack!.cards[0];
    
    const delta = createDraftDelta(
      'pick',
      1, // pack number
      1, // pick number  
      1, // overall pick
      firstCard.id,
      humanPlayer.id
    );
    
    const updatedDraft = applyDelta(startedDraft, delta);
    
    // Player should have picked the card
    const updatedHuman = updatedDraft.players.find(p => p.isHuman)!;
    expect(updatedHuman.pickedCards.length).toBe(1);
    expect(updatedHuman.pickedCards[0].id).toBe(firstCard.id);
    
    // Pack should be passed to next player, so check picked cards instead
    expect(updatedHuman.pickedCards[0].id).toBe(firstCard.id);
    expect(updatedHuman.currentPack!.id).not.toBe(humanPlayer.currentPack!.id);
    
    // Delta should be added to history
    expect(updatedDraft.deltas.length).toBe(1);
    expect(updatedDraft.deltas[0]).toEqual(delta);
  });
  
  test('passes packs after pick', () => {
    const setData = createMockSetData();
    const draft = createSeededDraft({ seed: 'pass123', setData });
    const startedDraft = startSeededDraft(draft);
    
    const humanPlayer = startedDraft.players.find(p => p.isHuman)!;
    const firstCard = humanPlayer.currentPack!.cards[0];
    const originalPackId = humanPlayer.currentPack!.id;
    
    const delta = createDraftDelta('pick', 1, 1, 1, firstCard.id, humanPlayer.id);
    const updatedDraft = applyDelta(startedDraft, delta);
    
    // Human should now have a different pack (passed from next player)
    const updatedHuman = updatedDraft.players.find(p => p.isHuman)!;
    expect(updatedHuman.currentPack!.id).not.toBe(originalPackId);
  });
  
  test('throws error for invalid player', () => {
    const setData = createMockSetData();
    const draft = createSeededDraft({ seed: 'invalid123', setData });
    const startedDraft = startSeededDraft(draft);
    
    const delta = createDraftDelta('pick', 1, 1, 1, 'card123', 'invalid-player');
    
    expect(() => applyDelta(startedDraft, delta)).toThrow('Player invalid-player not found');
  });
  
  test('throws error for invalid card', () => {
    const setData = createMockSetData();
    const draft = createSeededDraft({ seed: 'invalidcard123', setData });
    const startedDraft = startSeededDraft(draft);
    
    const humanPlayer = startedDraft.players.find(p => p.isHuman)!;
    const delta = createDraftDelta('pick', 1, 1, 1, 'invalid-card', humanPlayer.id);
    
    expect(() => applyDelta(startedDraft, delta)).toThrow('Card invalid-card not found');
  });
});

describe('replayDraftToPosition', () => {
  test('replays draft with empty deltas', () => {
    const setData = createMockSetData();
    const seed = 'replay123';
    
    const replayed = replayDraftToPosition({
      seed,
      setData,
      deltas: [],
      targetPosition: 0
    });
    
    expect(replayed.status).toBe('active');
    expect(replayed.deltas.length).toBe(0);
    expect(replayed.players.every(p => p.pickedCards.length === 0)).toBe(true);
  });
  
  test('replays draft with multiple deltas', () => {
    const setData = createMockSetData();
    const seed = 'multireplay123';
    
    // Create and replay just one pick to get the correct state
    const singlePickDraft = replayDraftToPosition({
      seed,
      setData,
      deltas: [],
      targetPosition: 0
    });
    
    // Now we can get the first card from the human player's pack
    const humanPlayer = singlePickDraft.players.find(p => p.isHuman)!;
    const firstCard = humanPlayer.currentPack!.cards[0];
    
    const deltas = [
      createDraftDelta('pick', 1, 1, 1, firstCard.id, humanPlayer.id)
    ];
    
    const replayed = replayDraftToPosition({
      seed,
      setData,
      deltas,
      targetPosition: 1
    });
    
    expect(replayed.deltas.length).toBe(1);
    expect(replayed.players.find(p => p.isHuman)!.pickedCards.length).toBe(1);
    expect(replayed.players.find(p => p.isHuman)!.pickedCards[0].id).toBe(firstCard.id);
  });
  
  test('is deterministic with same inputs', () => {
    const setData = createMockSetData();
    const seed = 'deterministic456';
    
    const initialDraft = startSeededDraft(createSeededDraft({ seed, setData }));
    const deltas = [
      createDraftDelta('pick', 1, 1, 1,
        initialDraft.players[0].currentPack!.cards[0].id,
        initialDraft.players[0].id)
    ];
    
    const replay1 = replayDraftToPosition({ seed, setData, deltas });
    const replay2 = replayDraftToPosition({ seed, setData, deltas });
    
    expect(replay1.players[0].pickedCards[0].id).toBe(replay2.players[0].pickedCards[0].id);
    expect(replay1.round).toBe(replay2.round);
    expect(replay1.pick).toBe(replay2.pick);
  });
});

describe('navigateToPosition', () => {
  test('navigates to valid position', () => {
    const setData = createMockSetData();
    const seed = 'navigate123';
    
    const initialDraft = startSeededDraft(createSeededDraft({ seed, setData }));
    const deltas = [
      createDraftDelta('pick', 1, 1, 1,
        initialDraft.players[0].currentPack!.cards[0].id,
        initialDraft.players[0].id)
    ];
    
    const result = navigateToPosition(seed, setData, deltas, 1, 1);
    
    expect(result.success).toBe(true);
    expect(result.state).toBeDefined();
    expect(result.state!.round).toBe(1);
    expect(result.state!.pick).toBe(1);
  });
  
  test('rejects invalid position', () => {
    const setData = createMockSetData();
    const result = navigateToPosition('test123', setData, [], 0, 1);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid position');
  });
  
  test('rejects position not yet reached', () => {
    const setData = createMockSetData();
    const result = navigateToPosition('test123', setData, [], 2, 5);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Position not yet reached');
  });
});

describe('validateReplay', () => {
  test('validates consistent replay', () => {
    const setData = createMockSetData();
    const seed = 'validate123';
    
    const initialDraft = startSeededDraft(createSeededDraft({ seed, setData }));
    const deltas = [
      createDraftDelta('pick', 1, 1, 1,
        initialDraft.players[0].currentPack!.cards[0].id,
        initialDraft.players[0].id)
    ];
    
    const isValid = validateReplay(seed, setData, deltas);
    expect(isValid).toBe(true);
  });
  
  test('handles empty deltas', () => {
    const setData = createMockSetData();
    const isValid = validateReplay('empty123', setData, []);
    expect(isValid).toBe(true);
  });
});

describe('round progression', () => {
  test('sets correct direction for each round', () => {
    const setData = createMockSetData();
    const draft = createSeededDraft({ seed: 'rounds123', setData });
    
    // Test that direction calculation works
    expect(getPackDirection(1)).toBe('clockwise');
    expect(getPackDirection(2)).toBe('counterclockwise'); 
    expect(getPackDirection(3)).toBe('clockwise');
  });
});