import { describe, it, expect, beforeEach } from 'vitest';
import { DraftEngine } from './DraftEngine';
import { InMemoryAdapter } from './storage/InMemoryAdapter';
import type { SetData } from './PackGenerator';

const createTestSet = (): SetData => ({
  setCode: 'TST',
  setName: 'Test Set',
  cards: Array.from({ length: 300 }, (_, i) => ({
    id: `card_${i}`,
    name: `Card ${i}`,
    setCode: 'TST',
    rarity: i < 10 ? 'mythic' : i < 30 ? 'rare' : i < 80 ? 'uncommon' : 'common',
    manaCost: '{1}',
    type: 'Artifact',
    colors: []
  }))
});

describe('DraftEngine - Draft Completion', () => {
  let engine: DraftEngine;
  let storage: InMemoryAdapter;
  let setData: SetData;

  beforeEach(() => {
    storage = new InMemoryAdapter();
    engine = new DraftEngine(storage);
    setData = createTestSet();
    engine.loadSetData(setData);
  });

  it('should complete draft at p3p15 with 45 cards', () => {
    const draftId = 'test_completion';
    
    // Create and start draft
    engine.applyAction({
      type: 'CREATE_DRAFT',
      payload: {
        draftId,
        seed: 'completion-test',
        setCode: 'TST',
        playerCount: 8,
        humanPlayerIndex: 0,
      },
      timestamp: Date.now(),
    });

    engine.applyAction({
      type: 'START_DRAFT',
      payload: { draftId },
      timestamp: Date.now(),
    });

    // Simulate full draft - 3 rounds of 15 picks each
    for (let round = 1; round <= 3; round++) {
      for (let pick = 1; pick <= 15; pick++) {
        const state = engine.getDraftState(draftId)!;
        
        if (state.status === 'completed') {
          console.log(`Draft completed at round ${round}, pick ${pick}`);
          break;
        }

        // Human picks
        const humanPack = state.packs[round]?.[0];
        if (humanPack && humanPack.cards.length > 0) {
          engine.applyAction({
            type: 'HUMAN_PICK',
            payload: { draftId, cardId: humanPack.cards[0].id },
            timestamp: Date.now(),
          });
        }

        // Bot picks
        for (let i = 1; i < 8; i++) {
          const currentState = engine.getDraftState(draftId)!;
          const botPack = currentState.packs[currentState.currentRound]?.[i];
          if (botPack && botPack.cards.length > 0) {
            engine.applyAction({
              type: 'BOT_PICK',
              payload: { draftId, playerIndex: i, cardId: botPack.cards[0].id },
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    // Check final state
    const finalState = engine.getDraftState(draftId)!;
    console.log('Final state:', {
      status: finalState.status,
      position: `p${finalState.currentRound}p${finalState.currentPick}`,
      humanDeckSize: finalState.playerDecks[0]?.length || 0,
      actionCount: finalState.actionHistory.length
    });

    expect(finalState.status).toBe('completed');
    expect(finalState.currentRound).toBe(3);
    expect(finalState.currentPick).toBe(15);
    expect(finalState.playerDecks[0]?.length).toBe(45); // 3 rounds * 15 picks
  });

  it('should allow navigation through all picks in completed draft', async () => {
    const draftId = 'test_nav_complete';
    
    // Create and start draft
    engine.applyAction({
      type: 'CREATE_DRAFT',
      payload: {
        draftId,
        seed: 'nav-test',
        setCode: 'TST',
        playerCount: 8,
        humanPlayerIndex: 0,
      },
      timestamp: Date.now(),
    });

    engine.applyAction({
      type: 'START_DRAFT',
      payload: { draftId },
      timestamp: Date.now(),
    });

    // Quick draft - just do first 5 picks
    for (let pick = 1; pick <= 5; pick++) {
      const state = engine.getDraftState(draftId)!;
      
      // Human picks
      const humanPack = state.packs[1]?.[0];
      if (humanPack && humanPack.cards.length > 0) {
        engine.applyAction({
          type: 'HUMAN_PICK',
          payload: { draftId, cardId: humanPack.cards[0].id },
          timestamp: Date.now(),
        });
      }

      // Bot picks
      for (let i = 1; i < 8; i++) {
        const currentState = engine.getDraftState(draftId)!;
        const botPack = currentState.packs[1]?.[i];
        if (botPack && botPack.cards.length > 0) {
          engine.applyAction({
            type: 'BOT_PICK',
            payload: { draftId, playerIndex: i, cardId: botPack.cards[0].id },
            timestamp: Date.now(),
          });
        }
      }
    }

    const currentState = engine.getDraftState(draftId)!;
    expect(currentState.currentRound).toBe(1);
    expect(currentState.currentPick).toBe(6);

    // Now test navigation - we should be able to replay to any position
    for (let targetPick = 1; targetPick <= 5; targetPick++) {
      const replayed = engine.replayToPosition(draftId, 1, targetPick);
      
      expect(replayed.currentRound).toBe(1);
      expect(replayed.currentPick).toBe(targetPick);
      const deckSize = replayed.playerDecks[0]?.length || 0;
      expect(deckSize).toBe(targetPick - 1); // Deck size before the pick
      
      // Should have a pack available at this position
      const pack = replayed.packs[1]?.[0];
      expect(pack).toBeTruthy();
      expect(pack!.cards.length).toBe(15 - targetPick + 1); // Cards remaining in pack
    }
  });
});