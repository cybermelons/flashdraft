/**
 * DraftEngine Tests - Verify replay and navigation functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DraftEngine } from './DraftEngine';
import type { DraftAction } from './actions';
import type { SetData } from './packGenerator';

// Mock set data for testing
const mockSetData: SetData = {
  setCode: 'TEST',
  setName: 'Test Set',
  cards: [
    // Create 300 mock cards (enough for 8 players * 3 packs * 15 cards = 360)
    ...Array.from({ length: 300 }, (_, i) => ({
      id: `card-${i}`,
      name: `Test Card ${i}`,
      type: 'Creature',
      rarity: i % 15 === 0 ? 'rare' : i % 5 === 0 ? 'uncommon' : 'common',
      colors: ['W'],
      manaCost: '{1}{W}',
      image_uris: {
        normal: `https://example.com/card-${i}.jpg`,
      },
    })),
  ],
};

describe('DraftEngine Replay and Navigation', () => {
  let engine: DraftEngine;
  let draftId: string;

  beforeEach(() => {
    engine = new DraftEngine();
    engine.loadSetData(mockSetData);
    
    // Create and start a draft
    draftId = 'test-draft-1';
    const createAction: DraftAction = {
      type: 'CREATE_DRAFT',
      payload: {
        draftId,
        seed: 'test-seed',
        setCode: 'TEST',
        playerCount: 8,
        humanPlayerIndex: 0,
      },
      timestamp: Date.now(),
    };
    
    engine.applyAction(createAction);
    
    const startAction: DraftAction = {
      type: 'START_DRAFT',
      payload: { draftId },
      timestamp: Date.now(),
    };
    
    engine.applyAction(startAction);
  });

  it('should correctly replay to previous positions after making picks', () => {
    // Get initial state at p1p1
    const initialState = engine.getDraftState(draftId);
    expect(initialState).toBeTruthy();
    expect(initialState!.currentRound).toBe(1);
    expect(initialState!.currentPick).toBe(1);
    
    // Store the initial pack for human player
    const initialPack = initialState!.packs[1][0];
    expect(initialPack).toBeTruthy();
    const initialPackSize = initialPack.cards.length;
    expect(initialPackSize).toBe(15);
    
    // Make first pick (p1p1)
    const firstCardId = initialPack.cards[0].id;
    const pick1Action: DraftAction = {
      type: 'HUMAN_PICK',
      payload: { draftId, cardId: firstCardId },
      timestamp: Date.now(),
    };
    engine.applyAction(pick1Action);
    
    // Simulate bot picks for all other players
    for (let i = 1; i < 8; i++) {
      const botPack = engine.getDraftState(draftId)!.packs[1][i];
      if (botPack && botPack.cards.length > 0) {
        const botPickAction: DraftAction = {
          type: 'BOT_PICK',
          payload: { 
            draftId, 
            playerIndex: i, 
            cardId: botPack.cards[0].id 
          },
          timestamp: Date.now(),
        };
        engine.applyAction(botPickAction);
      }
    }
    
    // After all players pick, we should be at p1p2
    const afterPick1 = engine.getDraftState(draftId);
    expect(afterPick1!.currentRound).toBe(1);
    expect(afterPick1!.currentPick).toBe(2);
    
    // The human should have received a new pack (from player 7)
    const pack2 = afterPick1!.packs[1][0];
    expect(pack2.cards.length).toBe(14); // One card was picked by player 7
    
    // Make second pick (p1p2)
    const secondCardId = pack2.cards[0].id;
    const pick2Action: DraftAction = {
      type: 'HUMAN_PICK',
      payload: { draftId, cardId: secondCardId },
      timestamp: Date.now(),
    };
    engine.applyAction(pick2Action);
    
    // Simulate bot picks again
    for (let i = 1; i < 8; i++) {
      const botPack = engine.getDraftState(draftId)!.packs[1][i];
      if (botPack && botPack.cards.length > 0) {
        const botPickAction: DraftAction = {
          type: 'BOT_PICK',
          payload: { 
            draftId, 
            playerIndex: i, 
            cardId: botPack.cards[0].id 
          },
          timestamp: Date.now(),
        };
        engine.applyAction(botPickAction);
      }
    }
    
    // Should now be at p1p3
    const afterPick2 = engine.getDraftState(draftId);
    expect(afterPick2!.currentRound).toBe(1);
    expect(afterPick2!.currentPick).toBe(3);
    
    // Make third pick (p1p3)
    const pack3 = afterPick2!.packs[1][0];
    expect(pack3.cards.length).toBe(13); // Two cards have been picked
    const thirdCardId = pack3.cards[0].id;
    const pick3Action: DraftAction = {
      type: 'HUMAN_PICK',
      payload: { draftId, cardId: thirdCardId },
      timestamp: Date.now(),
    };
    engine.applyAction(pick3Action);
    
    // Now test replay functionality
    console.log('\n=== Testing Replay Functionality ===');
    
    // First, let's see the current state
    const currentState = engine.getDraftState(draftId)!;
    console.log('Current engine state:', {
      round: currentState.currentRound,
      pick: currentState.currentPick,
      humanDeckSize: currentState.playerDecks[0]?.length || 0,
      actionCount: currentState.actionHistory.length,
    });
    
    // Log action history
    console.log('\nAction history:');
    currentState.actionHistory.forEach((action, idx) => {
      console.log(`${idx}: ${action.type}`);
    });
    
    // Replay to p1p1 (before any picks)
    const replayP1P1 = engine.replayToPosition(draftId, 1, 1);
    console.log('\nReplay to p1p1:', {
      round: replayP1P1.currentRound,
      pick: replayP1P1.currentPick,
      humanDeckSize: replayP1P1.playerDecks[0]?.length || 0,
      packSize: replayP1P1.packs[1][0]?.cards.length,
    });
    expect(replayP1P1.currentRound).toBe(1);
    expect(replayP1P1.currentPick).toBe(1);
    expect(replayP1P1.playerDecks[0]).toBeUndefined(); // No cards picked yet
    expect(replayP1P1.packs[1][0].cards.length).toBe(15); // Full pack
    
    // Replay to p1p2 (after first pick)
    const replayP1P2 = engine.replayToPosition(draftId, 1, 2);
    console.log('Replay to p1p2:', {
      round: replayP1P2.currentRound,
      pick: replayP1P2.currentPick,
      humanDeckSize: replayP1P2.playerDecks[0]?.length || 0,
      packSize: replayP1P2.packs[1][0]?.cards.length,
    });
    expect(replayP1P2.currentRound).toBe(1);
    expect(replayP1P2.currentPick).toBe(2);
    expect(replayP1P2.playerDecks[0]?.length).toBe(1); // One card picked
    expect(replayP1P2.playerDecks[0]?.[0]).toBe(firstCardId);
    expect(replayP1P2.packs[1][0].cards.length).toBe(14); // Pack has been passed
    
    // Replay to p1p3 (after second pick)
    const replayP1P3 = engine.replayToPosition(draftId, 1, 3);
    console.log('Replay to p1p3:', {
      round: replayP1P3.currentRound,
      pick: replayP1P3.currentPick,
      humanDeckSize: replayP1P3.playerDecks[0]?.length || 0,
      packSize: replayP1P3.packs[1][0]?.cards.length,
    });
    expect(replayP1P3.currentRound).toBe(1);
    expect(replayP1P3.currentPick).toBe(3);
    expect(replayP1P3.playerDecks[0]?.length).toBe(2); // Two cards picked
    expect(replayP1P3.playerDecks[0]?.[1]).toBe(secondCardId);
    expect(replayP1P3.packs[1][0].cards.length).toBe(13); // Pack has been passed again
    
    // Verify we can replay back and forth
    const backToP1P1 = engine.replayToPosition(draftId, 1, 1);
    expect(backToP1P1.playerDecks[0]).toBeUndefined();
    expect(backToP1P1.packs[1][0].cards.length).toBe(15);
    
    const forwardToP1P3 = engine.replayToPosition(draftId, 1, 3);
    expect(forwardToP1P3.playerDecks[0]?.length).toBe(2);
    expect(forwardToP1P3.packs[1][0].cards.length).toBe(13);
    
    console.log('\n✅ All replay tests passed!');
  });

  it('should show correct packs at each position', () => {
    // Make picks and track which packs we see
    const packHistory: { position: string; packId: number; cardCount: number }[] = [];
    
    // P1P1
    let state = engine.getDraftState(draftId)!;
    packHistory.push({
      position: 'p1p1',
      packId: 0, // Starting with our own pack
      cardCount: state.packs[1][0].cards.length,
    });
    
    // Pick and advance through several positions
    for (let pick = 1; pick <= 5; pick++) {
      // Human pick
      const humanPack = engine.getDraftState(draftId)!.packs[1][0];
      if (humanPack && humanPack.cards.length > 0) {
        engine.applyAction({
          type: 'HUMAN_PICK',
          payload: { draftId, cardId: humanPack.cards[0].id },
          timestamp: Date.now(),
        });
      }
      
      // Bot picks
      for (let i = 1; i < 8; i++) {
        const botPack = engine.getDraftState(draftId)!.packs[1][i];
        if (botPack && botPack.cards.length > 0) {
          engine.applyAction({
            type: 'BOT_PICK',
            payload: { draftId, playerIndex: i, cardId: botPack.cards[0].id },
            timestamp: Date.now(),
          });
        }
      }
      
      // Record pack state after picks
      state = engine.getDraftState(draftId)!;
      if (state.currentPick <= 5 && state.packs[1][0]) {
        packHistory.push({
          position: `p${state.currentRound}p${state.currentPick}`,
          packId: (8 - (pick % 8)) % 8, // Pack rotation calculation
          cardCount: state.packs[1][0].cards.length,
        });
      }
    }
    
    console.log('\n=== Pack History ===');
    packHistory.forEach(p => console.log(p));
    
    // Now replay and verify we see the same packs
    console.log('\n=== Replay Verification ===');
    for (let pick = 1; pick <= 5; pick++) {
      const replayed = engine.replayToPosition(draftId, 1, pick);
      const expectedCards = 15 - (pick - 1);
      console.log(`Replay p1p${pick}: ${replayed.packs[1][0]?.cards.length || 0} cards (expected ${expectedCards})`);
      expect(replayed.packs[1][0]?.cards.length || 0).toBe(expectedCards);
    }
  });
});