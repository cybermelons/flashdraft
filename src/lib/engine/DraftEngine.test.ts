/**
 * Draft Engine Tests - Verify core draft logic in isolation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DraftEngine, type DraftState } from './DraftEngine';
import { 
  createDraft, 
  startDraft, 
  humanPick, 
  botPick, 
  passPacks, 
  advancePosition,
  startRound,
  completeDraft,
  type DraftAction 
} from './actions';
import type { SetData } from './PackGenerator';

// Mock set data for testing
const mockSetData: SetData = {
  setCode: 'TST',
  name: 'Test Set',
  cards: [
    // Commons (60 cards)
    ...Array.from({ length: 60 }, (_, i) => ({
      id: `common-${i}`,
      name: `Common Card ${i}`,
      setCode: 'TST',
      rarity: 'common' as const,
      manaCost: '{1}',
      type: 'Creature',
      colors: ['W']
    })),
    // Uncommons (30 cards)
    ...Array.from({ length: 30 }, (_, i) => ({
      id: `uncommon-${i}`,
      name: `Uncommon Card ${i}`,
      setCode: 'TST',
      rarity: 'uncommon' as const,
      manaCost: '{2}',
      type: 'Instant',
      colors: ['U']
    })),
    // Rares (20 cards)
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `rare-${i}`,
      name: `Rare Card ${i}`,
      setCode: 'TST',
      rarity: 'rare' as const,
      manaCost: '{3}',
      type: 'Sorcery',
      colors: ['B']
    })),
    // Mythics (5 cards)
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `mythic-${i}`,
      name: `Mythic Card ${i}`,
      setCode: 'TST',
      rarity: 'mythic' as const,
      manaCost: '{4}',
      type: 'Planeswalker',
      colors: ['R']
    }))
  ]
};

describe('DraftEngine', () => {
  let engine: DraftEngine;

  beforeEach(() => {
    engine = new DraftEngine();
    engine.loadSetData(mockSetData);
  });

  describe('Draft Creation', () => {
    it('should create a new draft with initial state', () => {
      const action = createDraft('draft-1', 'test-seed', 'TST', 8, 0);
      const state = engine.applyAction(action);

      expect(state.draftId).toBe('draft-1');
      expect(state.seed).toBe('test-seed');
      expect(state.setCode).toBe('TST');
      expect(state.status).toBe('created');
      expect(state.playerCount).toBe(8);
      expect(state.humanPlayerIndex).toBe(0);
      expect(state.currentRound).toBe(1);
      expect(state.currentPick).toBe(1);
      expect(state.actionHistory).toHaveLength(1);
    });

    it('should store draft in engine state', () => {
      const action = createDraft('draft-1', 'test-seed', 'TST');
      engine.applyAction(action);
      
      const retrieved = engine.getDraftState('draft-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.draftId).toBe('draft-1');
    });
  });

  describe('Draft Start', () => {
    it('should start draft and generate initial packs', () => {
      engine.applyAction(createDraft('draft-1', 'test-seed', 'TST'));
      const state = engine.applyAction(startDraft('draft-1'));

      expect(state.status).toBe('active');
      expect(state.packs[1]).toBeDefined();
      expect(state.packs[1]).toHaveLength(8); // 8 players
      expect(state.packs[1][0].cards).toHaveLength(15); // 15 cards per pack
    });

    it('should generate deterministic packs from seed', () => {
      // Create two drafts with same seed
      engine.applyAction(createDraft('draft-1', 'same-seed', 'TST'));
      const state1 = engine.applyAction(startDraft('draft-1'));

      const engine2 = new DraftEngine();
      engine2.loadSetData(mockSetData);
      engine2.applyAction(createDraft('draft-2', 'same-seed', 'TST'));
      const state2 = engine2.applyAction(startDraft('draft-2'));

      // Same seed should generate same packs
      expect(state1.packs[1][0].cards.map(c => c.id))
        .toEqual(state2.packs[1][0].cards.map(c => c.id));
    });
  });

  describe('Human Picks', () => {
    let draftId: string;

    beforeEach(() => {
      draftId = 'test-draft';
      engine.applyAction(createDraft(draftId, 'test-seed', 'TST'));
      engine.applyAction(startDraft(draftId));
    });

    it('should handle human pick correctly', () => {
      const state = engine.getDraftState(draftId)!;
      const cardToPick = state.packs[1][0].cards[0];

      const newState = engine.applyAction(
        humanPick(draftId, cardToPick.id, 0, 0)
      );

      // Card should be in human's deck
      expect(newState.playerDecks[0]).toContain(cardToPick.id);
      
      // Card should be removed from pack
      const remainingCards = newState.packs[1][0].cards;
      expect(remainingCards).not.toContainEqual(cardToPick);
      expect(remainingCards).toHaveLength(14);
    });

    it('should track action history', () => {
      const state = engine.getDraftState(draftId)!;
      const cardToPick = state.packs[1][0].cards[0];

      const newState = engine.applyAction(
        humanPick(draftId, cardToPick.id, 0, 0)
      );

      expect(newState.actionHistory).toHaveLength(3); // create, start, pick
      expect(newState.actionHistory[2].type).toBe('HUMAN_PICK');
    });
  });

  describe('Bot Picks', () => {
    let draftId: string;

    beforeEach(() => {
      draftId = 'test-draft';
      engine.applyAction(createDraft(draftId, 'test-seed', 'TST'));
      engine.applyAction(startDraft(draftId));
    });

    it('should handle bot picks for all other players', () => {
      const state = engine.getDraftState(draftId)!;
      
      // Make picks for all bots (players 1-7)
      let currentState = state;
      for (let playerIndex = 1; playerIndex < 8; playerIndex++) {
        const pack = currentState.packs[1][playerIndex];
        const cardToPick = pack.cards[0]; // Bot picks first card
        
        currentState = engine.applyAction(
          botPick(draftId, playerIndex, cardToPick.id, playerIndex, 0)
        );
      }

      // Each bot should have 1 card
      for (let i = 1; i < 8; i++) {
        expect(currentState.playerDecks[i]).toHaveLength(1);
      }

      // Each pack should have 14 cards left
      for (let i = 1; i < 8; i++) {
        expect(currentState.packs[1][i].cards).toHaveLength(14);
      }
    });
  });

  describe('Pack Passing', () => {
    let draftId: string;

    beforeEach(() => {
      draftId = 'test-draft';
      engine.applyAction(createDraft(draftId, 'test-seed', 'TST'));
      engine.applyAction(startDraft(draftId));
    });

    it('should pass packs left in round 1', () => {
      const stateBefore = engine.getDraftState(draftId)!;
      
      // Remember pack IDs before passing
      const packIdsBefore = stateBefore.packs[1].map(p => p.id);
      
      const stateAfter = engine.applyAction(passPacks(draftId, 1));
      
      // Each player should receive pack from player to their right
      for (let i = 0; i < 8; i++) {
        const expectedFromPlayer = (i + 1) % 8;
        expect(stateAfter.packs[1][i].id).toBe(packIdsBefore[expectedFromPlayer]);
      }
    });

    it('should pass packs right in round 2', () => {
      // Setup round 2
      engine.applyAction(createDraft(draftId, 'test-seed', 'TST'));
      let state = engine.applyAction(startDraft(draftId));
      
      // Advance to round 2
      state = engine.applyAction(advancePosition(draftId, 2, 1));
      state = engine.applyAction(startRound(draftId, 2));
      
      const packIdsBefore = state.packs[2].map(p => p.id);
      
      const stateAfter = engine.applyAction(passPacks(draftId, 2));
      
      // Each player should receive pack from player to their left
      for (let i = 0; i < 8; i++) {
        const expectedFromPlayer = (i - 1 + 8) % 8;
        expect(stateAfter.packs[2][i].id).toBe(packIdsBefore[expectedFromPlayer]);
      }
    });
  });

  describe('Position Advancement', () => {
    let draftId: string;

    beforeEach(() => {
      draftId = 'test-draft';
      engine.applyAction(createDraft(draftId, 'test-seed', 'TST'));
      engine.applyAction(startDraft(draftId));
    });

    it('should advance position correctly', () => {
      const state = engine.applyAction(advancePosition(draftId, 1, 2));
      
      expect(state.currentRound).toBe(1);
      expect(state.currentPick).toBe(2);
    });

    it('should handle round transitions', () => {
      const state = engine.applyAction(advancePosition(draftId, 2, 1));
      
      expect(state.currentRound).toBe(2);
      expect(state.currentPick).toBe(1);
    });
  });

  describe('Round Management', () => {
    let draftId: string;

    beforeEach(() => {
      draftId = 'test-draft';
      engine.applyAction(createDraft(draftId, 'test-seed', 'TST'));
      engine.applyAction(startDraft(draftId));
    });

    it('should start new rounds with fresh packs', () => {
      // Advance to round 2
      engine.applyAction(advancePosition(draftId, 2, 1));
      const state = engine.applyAction(startRound(draftId, 2));
      
      expect(state.packs[2]).toBeDefined();
      expect(state.packs[2]).toHaveLength(8);
      expect(state.packs[2][0].cards).toHaveLength(15);
      
      // Round 2 packs should be different from round 1
      const round1Pack = engine.getDraftState(draftId)!.packs[1][0];
      expect(state.packs[2][0].id).not.toBe(round1Pack.id);
    });
  });

  describe('Draft Completion', () => {
    it('should complete draft correctly', () => {
      const draftId = 'test-draft';
      engine.applyAction(createDraft(draftId, 'test-seed', 'TST'));
      engine.applyAction(startDraft(draftId));
      
      // Simulate some picks
      const state = engine.getDraftState(draftId)!;
      engine.applyAction(humanPick(draftId, state.packs[1][0].cards[0].id, 0, 0));
      
      const finalDecks = { 0: ['card1', 'card2'] };
      const completed = engine.applyAction(completeDraft(draftId, finalDecks));
      
      expect(completed.status).toBe('completed');
    });
  });

  describe('Replay Functionality', () => {
    it('should replay to specific position', () => {
      const draftId = 'test-draft';
      engine.applyAction(createDraft(draftId, 'test-seed', 'TST'));
      engine.applyAction(startDraft(draftId));
      
      // Make some picks
      const state1 = engine.getDraftState(draftId)!;
      const card1 = state1.packs[1][0].cards[0];
      engine.applyAction(humanPick(draftId, card1.id, 0, 0));
      engine.applyAction(advancePosition(draftId, 1, 2));
      
      // Replay to position 1,2
      const replayed = engine.replayToPosition(draftId, 1, 2);
      
      expect(replayed.currentRound).toBe(1);
      expect(replayed.currentPick).toBe(2);
      expect(replayed.playerDecks[0]).toContain(card1.id);
    });
  });

  describe('Determinism', () => {
    it('should produce identical results with same seed and actions', () => {
      const seed = 'deterministic-test';
      const actions: DraftAction[] = [];
      
      // Setup first engine
      const engine1 = new DraftEngine();
      engine1.loadSetData(mockSetData);
      actions.push(createDraft('draft-1', seed, 'TST'));
      actions.push(startDraft('draft-1'));
      
      // Apply actions to engine 1
      actions.forEach(action => engine1.applyAction(action));
      const state1 = engine1.getDraftState('draft-1')!;
      
      // Pick specific card
      const cardToPick = state1.packs[1][0].cards[3];
      actions.push(humanPick('draft-1', cardToPick.id, 0, 0));
      engine1.applyAction(actions[actions.length - 1]);
      
      // Setup second engine with same actions
      const engine2 = new DraftEngine();
      engine2.loadSetData(mockSetData);
      
      // Change draft ID but keep same seed
      const actions2 = actions.map(a => ({
        ...a,
        payload: { ...a.payload, draftId: 'draft-2' }
      }));
      actions2[0] = createDraft('draft-2', seed, 'TST');
      
      actions2.forEach(action => engine2.applyAction(action));
      
      const final1 = engine1.getDraftState('draft-1')!;
      const final2 = engine2.getDraftState('draft-2')!;
      
      // States should be identical (except for draft ID)
      expect(final1.playerDecks[0]).toEqual(final2.playerDecks[0]);
      expect(final1.packs[1][0].cards.length).toBe(final2.packs[1][0].cards.length);
      expect(final1.currentPick).toBe(final2.currentPick);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown action type', () => {
      const badAction = { type: 'UNKNOWN_ACTION' } as any;
      expect(() => engine.applyAction(badAction)).toThrow('Unknown action type');
    });

    it('should throw error for non-existent draft', () => {
      expect(() => engine.applyAction(startDraft('non-existent'))).toThrow('Draft not found');
    });

    it('should throw error when set data not loaded', () => {
      const engineNoData = new DraftEngine();
      engineNoData.applyAction(createDraft('draft-1', 'seed', 'TST'));
      expect(() => engineNoData.applyAction(startDraft('draft-1'))).toThrow('Set data not found');
    });
  });
});