/**
 * Test pure draft engine without storage dependencies
 */

import { describe, test, expect } from 'vitest';
import { applyAction } from './applyAction';
import type { SeededDraftState } from '../shared/types/seededDraftState';
import type { DraftAction } from './types/DraftActions';

// Mock set data
const mockSetData = {
  set_code: 'TEST',
  name: 'Test Set',
  cards: [
    ...Array.from({ length: 50 }, (_, i) => ({
      id: `test-common-${i + 1}`,
      name: `Test Common ${i + 1}`,
      rarity: 'common',
      mana_cost: '{1}',
      cmc: 1,
      colors: ['W'],
      booster: true
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `test-uncommon-${i + 1}`,
      name: `Test Uncommon ${i + 1}`,
      rarity: 'uncommon',
      mana_cost: '{2}',
      cmc: 2,
      colors: ['U'],
      booster: true
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `test-rare-${i + 1}`,
      name: `Test Rare ${i + 1}`,
      rarity: 'rare',
      mana_cost: '{3}',
      cmc: 3,
      colors: ['B'],
      booster: true
    }))
  ]
};

describe('Pure Draft Engine', () => {
  test('create and start draft', () => {
    const seed = 'test123';
    
    // Initial state
    const initialState: SeededDraftState = {
      seed,
      status: 'setup',
      round: 1,
      pick: 1,
      direction: 'clockwise',
      players: [],
      setCode: 'TEST',
      setData: null,
      allPacks: [],
      lastModified: Date.now()
    };
    
    // Create draft
    const createAction: DraftAction = { type: 'CREATE_DRAFT', setCode: 'TEST' };
    const createdState = applyAction(initialState, createAction, { setData: mockSetData });
    
    console.log('Created state status:', createdState.status);
    console.log('Players count:', createdState.players.length);
    console.log('All packs count:', createdState.allPacks.length);
    
    expect(createdState.status).toBe('setup');
    expect(createdState.players).toHaveLength(8);
    expect(createdState.allPacks).toHaveLength(3); // 3 rounds
    
    // Start draft
    const startAction: DraftAction = { type: 'START_DRAFT' };
    const startedState = applyAction(createdState, startAction);
    
    console.log('Started state status:', startedState.status);
    console.log('Human player pack size:', startedState.players.find(p => p.isHuman)?.currentPack?.cards.length);
    
    expect(startedState.status).toBe('active');
    
    const humanPlayer = startedState.players.find(p => p.isHuman)!;
    expect(humanPlayer.currentPack).toBeDefined();
    expect(humanPlayer.currentPack!.cards).toHaveLength(15);
  });
  
  test('complete pick sequence', () => {
    const seed = 'test456';
    
    // Setup state
    let state: SeededDraftState = {
      seed,
      status: 'setup',
      round: 1,
      pick: 1,
      direction: 'clockwise',
      players: [],
      setCode: 'TEST',
      setData: null,
      allPacks: [],
      lastModified: Date.now()
    };
    
    // Create and start
    state = applyAction(state, { type: 'CREATE_DRAFT', setCode: 'TEST' }, { setData: mockSetData });
    state = applyAction(state, { type: 'START_DRAFT' });
    
    const humanPlayer = state.players.find(p => p.isHuman)!;
    const initialPackSize = humanPlayer.currentPack!.cards.length;
    const cardToPick = humanPlayer.currentPack!.cards[0].id;
    
    console.log('Initial pack size:', initialPackSize);
    console.log('Card to pick:', cardToPick);
    
    // Human pick
    state = applyAction(state, { type: 'HUMAN_PICK', cardId: cardToPick });
    
    const humanAfterPick = state.players.find(p => p.isHuman)!;
    console.log('Pack size after pick:', humanAfterPick.currentPack!.cards.length);
    console.log('Picked cards count:', humanAfterPick.pickedCards.length);
    
    expect(humanAfterPick.currentPack!.cards.length).toBe(initialPackSize - 1);
    expect(humanAfterPick.pickedCards).toHaveLength(1);
    expect(humanAfterPick.pickedCards[0].id).toBe(cardToPick);
    
    // Bot picks
    for (const player of state.players) {
      if (!player.isHuman && player.currentPack && player.currentPack.cards.length > 0) {
        const botCard = player.currentPack.cards[0].id;
        state = applyAction(state, { type: 'BOT_PICK', playerId: player.id, cardId: botCard });
      }
    }
    
    // Pass packs
    state = applyAction(state, { type: 'PASS_PACKS' });
    
    // Advance position
    state = applyAction(state, { type: 'ADVANCE_POSITION' });
    
    console.log('Final position:', `p${state.round}p${state.pick}`);
    expect(state.pick).toBe(2);
  });
  
  test('deterministic replay', () => {
    const seed = 'deterministic789';
    
    // Run sequence twice
    const runSequence = () => {
      let state: SeededDraftState = {
        seed,
        status: 'setup',
        round: 1,
        pick: 1,
        direction: 'clockwise',
        players: [],
        setCode: 'TEST',
        setData: null,
        allPacks: [],
        lastModified: Date.now()
      };
      
      state = applyAction(state, { type: 'CREATE_DRAFT', setCode: 'TEST' }, { setData: mockSetData });
      state = applyAction(state, { type: 'START_DRAFT' });
      
      const humanPlayer = state.players.find(p => p.isHuman)!;
      const firstCard = humanPlayer.currentPack!.cards[0].id;
      
      state = applyAction(state, { type: 'HUMAN_PICK', cardId: firstCard });
      state = applyAction(state, { type: 'ADVANCE_POSITION' });
      
      return { state, firstCard };
    };
    
    const run1 = runSequence();
    const run2 = runSequence();
    
    console.log('Run 1 first card:', run1.firstCard);
    console.log('Run 2 first card:', run2.firstCard);
    
    expect(run1.firstCard).toBe(run2.firstCard);
    expect(run1.state.pick).toBe(run2.state.pick);
    
    console.log('✅ Engine is deterministic');
  });
});