import { describe, it, expect, beforeEach } from 'vitest';
import { DraftEngine } from './DraftEngine';
import type { SetData } from './PackGenerator';

// Create a simple set with identifiable cards
const createTestSet = (): SetData => ({
  setCode: 'TST',
  setName: 'Test Set',
  cards: Array.from({ length: 200 }, (_, i) => ({
    id: `card_${i}`,
    name: `Card ${i}`,
    setCode: 'TST',
    rarity: i < 10 ? 'mythic' : i < 30 ? 'rare' : i < 80 ? 'uncommon' : 'common',
    manaCost: '{1}',
    type: 'Artifact',
    colors: []
  }))
});

describe('DraftEngine - Pack Flow Analysis', () => {
  let engine: DraftEngine;
  let setData: SetData;

  beforeEach(() => {
    engine = new DraftEngine();
    setData = createTestSet();
    engine.loadSetData(setData);
  });

  it('should maintain consistent pack view when navigating', () => {
    // Create draft
    const draftId = 'test_draft_123';
    engine.applyAction({
      type: 'CREATE_DRAFT',
      payload: {
        draftId,
        seed: 'consistent-seed',
        setCode: 'TST',
        playerCount: 8,
        humanPlayerIndex: 0,
      },
      timestamp: Date.now(),
    });

    // Start draft
    engine.applyAction({
      type: 'START_DRAFT',
      payload: { draftId },
      timestamp: Date.now(),
    });

    // Get initial state
    const initialState = engine.getDraftState(draftId)!;
    const humanInitialPack = initialState.packs[1][0];
    console.log('Initial pack for human at p1p1:', {
      packId: humanInitialPack.id,
      cardCount: humanInitialPack.cards.length,
      firstCard: humanInitialPack.cards[0].id,
      lastCard: humanInitialPack.cards[14].id
    });

    // Human picks first card
    const humanPickCard = humanInitialPack.cards[0];
    engine.applyAction({
      type: 'HUMAN_PICK',
      payload: { draftId, cardId: humanPickCard.id },
      timestamp: Date.now(),
    });

    // Check state after human pick
    const afterHumanPick = engine.getDraftState(draftId)!;
    console.log('After human pick:', {
      position: `p${afterHumanPick.currentRound}p${afterHumanPick.currentPick}`,
      humanDeckSize: afterHumanPick.playerDecks[0]?.length || 0,
      humanPackSize: afterHumanPick.packs[1][0]?.cards.length || 0
    });

    // All bots pick
    for (let i = 1; i < 8; i++) {
      const botPack = afterHumanPick.packs[1][i];
      if (botPack && botPack.cards.length > 0) {
        engine.applyAction({
          type: 'BOT_PICK',
          payload: { draftId, playerIndex: i, cardId: botPack.cards[0].id },
          timestamp: Date.now(),
        });
      }
    }

    // Get current state (should be at p1p2)
    const currentState = engine.getDraftState(draftId)!;
    console.log('Current state:', {
      position: `p${currentState.currentRound}p${currentState.currentPick}`,
      humanDeckSize: currentState.playerDecks[0]?.length || 0,
      humanPackId: currentState.packs[1][0]?.id,
      humanPackSize: currentState.packs[1][0]?.cards.length || 0
    });

    // Now replay to p1p1
    const replayedP1P1 = engine.replayToPosition(draftId, 1, 1);
    const replayedHumanPack = replayedP1P1.packs[1][0];
    console.log('Replayed pack at p1p1:', {
      packId: replayedHumanPack.id,
      cardCount: replayedHumanPack.cards.length,
      firstCard: replayedHumanPack.cards[0].id,
      lastCard: replayedHumanPack.cards[14].id
    });

    // The replayed pack should match the initial pack exactly
    expect(replayedHumanPack.id).toBe(humanInitialPack.id);
    expect(replayedHumanPack.cards.length).toBe(15);
    expect(replayedHumanPack.cards[0].id).toBe(humanInitialPack.cards[0].id);
    expect(replayedHumanPack.cards[14].id).toBe(humanInitialPack.cards[14].id);

    // Pick a few more times to get to p1p4
    for (let pick = 2; pick <= 3; pick++) {
      const state = engine.getDraftState(draftId)!;
      const humanPack = state.packs[1][0];
      
      // Human picks
      engine.applyAction({
        type: 'HUMAN_PICK',
        payload: { draftId, cardId: humanPack.cards[0].id },
        timestamp: Date.now(),
      });

      // Bots pick
      for (let i = 1; i < 8; i++) {
        const latestState = engine.getDraftState(draftId)!;
        const botPack = latestState.packs[1][i];
        if (botPack && botPack.cards.length > 0) {
          engine.applyAction({
            type: 'BOT_PICK',
            payload: { draftId, playerIndex: i, cardId: botPack.cards[0].id },
            timestamp: Date.now(),
          });
        }
      }
    }

    // Now at p1p4
    const p1p4State = engine.getDraftState(draftId)!;
    const p1p4Pack = p1p4State.packs[1][0];
    console.log('Pack at p1p4:', {
      position: `p${p1p4State.currentRound}p${p1p4State.currentPick}`,
      packId: p1p4Pack.id,
      cardCount: p1p4Pack.cards.length
    });

    // Replay back to p1p1 again
    const replayedAgain = engine.replayToPosition(draftId, 1, 1);
    const replayedPackAgain = replayedAgain.packs[1][0];
    
    // Should still be the same initial pack
    expect(replayedPackAgain.id).toBe(humanInitialPack.id);
    expect(replayedPackAgain.cards.length).toBe(15);
    expect(replayedPackAgain.cards.map(c => c.id)).toEqual(humanInitialPack.cards.map(c => c.id));
  });

  it('should show different packs at each pick position', () => {
    // Create and start draft
    const draftId = 'test_draft_456';
    engine.applyAction({
      type: 'CREATE_DRAFT',
      payload: {
        draftId,
        seed: 'pack-flow-seed',
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

    const packHistory: { position: string; packId: string; firstCard: string }[] = [];

    // Simulate first 5 picks
    for (let pick = 1; pick <= 5; pick++) {
      const state = engine.getDraftState(draftId)!;
      const humanPack = state.packs[1][0];
      
      packHistory.push({
        position: `p1p${pick}`,
        packId: humanPack.id,
        firstCard: humanPack.cards[0].id
      });

      // Human picks
      engine.applyAction({
        type: 'HUMAN_PICK',
        payload: { draftId, cardId: humanPack.cards[0].id },
        timestamp: Date.now(),
      });

      // Bots pick
      for (let i = 1; i < 8; i++) {
        const latestState = engine.getDraftState(draftId)!;
        const botPack = latestState.packs[1][i];
        if (botPack && botPack.cards.length > 0) {
          engine.applyAction({
            type: 'BOT_PICK',
            payload: { draftId, playerIndex: i, cardId: botPack.cards[0].id },
            timestamp: Date.now(),
          });
        }
      }
    }

    console.log('Pack history:', packHistory);

    // Verify each position shows the correct pack when replayed
    for (let pick = 1; pick <= 5; pick++) {
      const replayed = engine.replayToPosition(draftId, 1, pick);
      const replayedPack = replayed.packs[1][0];
      
      console.log(`Replayed p1p${pick}:`, {
        packId: replayedPack.id,
        firstCard: replayedPack.cards[0].id,
        expected: packHistory[pick - 1]
      });

      expect(replayedPack.id).toBe(packHistory[pick - 1].packId);
    }
  });
});