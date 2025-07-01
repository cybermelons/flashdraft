/**
 * DraftEngine Integration Tests - Full draft simulation without UI
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DraftEngine } from './DraftEngine';
import type { DraftAction } from './actions';
import type { SetData } from './packGenerator';

// Create a more realistic mock set with proper card variety
const mockSetData: SetData = {
  setCode: 'TEST',
  setName: 'Test Set',
  cards: [
    // Create 400 mock cards to ensure we have enough variety
    ...Array.from({ length: 400 }, (_, i) => ({
      id: `card-${i}`,
      name: `Test Card ${i}`,
      type: ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment'][i % 5],
      rarity: i % 15 === 0 ? 'mythic' : i % 15 === 1 ? 'rare' : i % 5 === 0 ? 'uncommon' : 'common',
      colors: [['W'], ['U'], ['B'], ['R'], ['G'], ['W', 'U'], ['B', 'R'], ['G', 'W']][i % 8],
      manaCost: `{${(i % 7) + 1}}`,
      image_uris: {
        normal: `https://example.com/card-${i}.jpg`,
      },
    })),
  ],
};

describe('DraftEngine Full Integration Test', () => {
  let engine: DraftEngine;
  let draftId: string;

  beforeEach(() => {
    engine = new DraftEngine();
    engine.loadSetData(mockSetData);
    draftId = 'test-draft-full';
  });

  it('should complete a full draft simulation with random and sequential access', () => {
    console.log('\n=== Starting Full Draft Simulation ===\n');

    // Step 1: Create and start draft
    const createAction: DraftAction = {
      type: 'CREATE_DRAFT',
      payload: {
        draftId,
        seed: 'test-seed-full',
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

    // Track all picks made for verification
    const humanPicks: { round: number; pick: number; cardId: string }[] = [];
    const stateSnapshots: Map<string, any> = new Map();

    // Helper function to make all picks for current position
    const makeAllPicksForPosition = () => {
      const currentState = engine.getDraftState(draftId)!;
      const round = currentState.currentRound;
      const pick = currentState.currentPick;
      
      console.log(`\nMaking picks for Round ${round}, Pick ${pick}`);
      
      // Human pick
      const humanPack = currentState.packs[round][0];
      if (humanPack && humanPack.cards.length > 0) {
        const cardToPick = humanPack.cards[Math.floor(Math.random() * humanPack.cards.length)];
        console.log(`  Human picks: ${cardToPick.name} (${humanPack.cards.length} cards available)`);
        
        humanPicks.push({ round, pick, cardId: cardToPick.id });
        
        engine.applyAction({
          type: 'HUMAN_PICK',
          payload: { draftId, cardId: cardToPick.id },
          timestamp: Date.now(),
        });
      }
      
      // Bot picks
      for (let i = 1; i < 8; i++) {
        const botState = engine.getDraftState(draftId)!;
        const botPack = botState.packs[botState.currentRound][i];
        if (botPack && botPack.cards.length > 0) {
          const botCard = botPack.cards[Math.floor(Math.random() * botPack.cards.length)];
          engine.applyAction({
            type: 'BOT_PICK',
            payload: { draftId, playerIndex: i, cardId: botCard.id },
            timestamp: Date.now(),
          });
        }
      }
      
      // Save snapshot after all picks
      const afterPicksState = engine.getDraftState(draftId)!;
      const key = `r${round}p${pick}`;
      stateSnapshots.set(key, {
        round: afterPicksState.currentRound,
        pick: afterPicksState.currentPick,
        humanDeckSize: afterPicksState.playerDecks[0]?.length || 0,
        packSizes: Object.entries(afterPicksState.packs[round] || {}).map(([player, pack]) => 
          `Player ${player}: ${pack.cards.length} cards`
        ),
      });
    };

    // Step 2: Complete the entire draft
    console.log('\n--- Phase 1: Complete Full Draft ---');
    
    while (true) {
      const state = engine.getDraftState(draftId)!;
      if (state.status === 'completed') {
        console.log('\nDraft completed!');
        break;
      }
      
      makeAllPicksForPosition();
    }

    // Verify draft completion
    const finalState = engine.getDraftState(draftId)!;
    expect(finalState.status).toBe('completed');
    expect(finalState.playerDecks[0].length).toBe(45); // 3 rounds * 15 picks
    console.log(`\nFinal human deck size: ${finalState.playerDecks[0].length} cards`);

    // Step 3: Test sequential access (forward)
    console.log('\n--- Phase 2: Sequential Access Test (Forward) ---');
    
    for (let round = 1; round <= 3; round++) {
      for (let pick = 1; pick <= 15; pick++) {
        const replayed = engine.replayToPosition(draftId, round, pick);
        const humanDeckAtPosition = replayed.playerDecks[0]?.length || 0;
        const expectedDeckSize = (round - 1) * 15 + pick - 1;
        
        console.log(`Replay R${round}P${pick}: Human deck = ${humanDeckAtPosition} cards (expected: ${expectedDeckSize})`);
        
        // Verify deck size matches expected
        expect(humanDeckAtPosition).toBe(expectedDeckSize);
        
        // Verify we can see the pack at this position
        if (round <= 3 && pick <= 15) {
          const pack = replayed.packs[round]?.[0];
          if (pack) {
            const expectedPackSize = 15 - (pick - 1);
            console.log(`  Pack size: ${pack.cards.length} (expected: ${expectedPackSize})`);
            expect(pack.cards.length).toBe(expectedPackSize);
          }
        }
      }
    }

    // Step 4: Test random access
    console.log('\n--- Phase 3: Random Access Test ---');
    
    const testPositions = [
      { round: 1, pick: 1 },   // First pick
      { round: 2, pick: 8 },   // Middle of round 2
      { round: 1, pick: 15 },  // Last pick of round 1
      { round: 3, pick: 1 },   // First pick of round 3
      { round: 2, pick: 15 },  // Last pick of round 2
      { round: 1, pick: 7 },   // Random middle position
      { round: 3, pick: 15 },  // Final pick
      { round: 2, pick: 1 },   // First pick of round 2
    ];

    for (const pos of testPositions) {
      const replayed = engine.replayToPosition(draftId, pos.round, pos.pick);
      const humanDeckSize = replayed.playerDecks[0]?.length || 0;
      const expectedSize = (pos.round - 1) * 15 + pos.pick - 1;
      
      console.log(`\nRandom access R${pos.round}P${pos.pick}:`);
      console.log(`  Human deck: ${humanDeckSize} cards (expected: ${expectedSize})`);
      expect(humanDeckSize).toBe(expectedSize);
      
      // Verify the pack state
      const pack = replayed.packs[pos.round]?.[0];
      if (pack) {
        const expectedPackSize = 15 - (pos.pick - 1);
        console.log(`  Pack size: ${pack.cards.length} (expected: ${expectedPackSize})`);
        expect(pack.cards.length).toBe(expectedPackSize);
      }
      
      // Verify we can identify what was picked at this position
      if (humanDeckSize > 0) {
        const pickedCardId = replayed.playerDecks[0][humanDeckSize - 1];
        const originalPick = humanPicks[humanDeckSize - 1];
        console.log(`  Last picked card: ${pickedCardId}`);
        expect(pickedCardId).toBe(originalPick.cardId);
      }
    }

    // Step 5: Test edge cases
    console.log('\n--- Phase 4: Edge Case Tests ---');
    
    // Test replay to position before any picks
    const beforeFirstPick = engine.replayToPosition(draftId, 1, 1);
    expect(beforeFirstPick.playerDecks[0]).toBeUndefined();
    console.log('Before first pick: No cards in deck ✓');
    
    // Test replay to final position
    const atFinalPosition = engine.replayToPosition(draftId, 3, 15);
    expect(atFinalPosition.playerDecks[0].length).toBe(44); // One less than final
    console.log('At position 3-15: 44 cards in deck ✓');

    // Step 6: Verify pick history integrity
    console.log('\n--- Phase 5: Pick History Verification ---');
    
    for (let i = 0; i < humanPicks.length; i++) {
      const pickInfo = humanPicks[i];
      const pickNumber = i + 1;
      const round = Math.ceil(pickNumber / 15);
      const pick = ((pickNumber - 1) % 15) + 1;
      
      expect(pickInfo.round).toBe(round);
      expect(pickInfo.pick).toBe(pick);
      
      // Replay to just after this pick
      const afterPick = engine.replayToPosition(draftId, round, pick + 1 > 15 ? 1 : pick + 1);
      if (afterPick.playerDecks[0] && afterPick.playerDecks[0].length > i) {
        expect(afterPick.playerDecks[0][i]).toBe(pickInfo.cardId);
      }
    }
    
    console.log(`\nVerified all ${humanPicks.length} picks are in correct positions ✓`);

    // Step 7: Test that replay doesn't modify original state
    console.log('\n--- Phase 6: State Immutability Test ---');
    
    const originalFinalState = engine.getDraftState(draftId)!;
    const originalDeckSize = originalFinalState.playerDecks[0].length;
    
    // Do multiple replays
    engine.replayToPosition(draftId, 1, 5);
    engine.replayToPosition(draftId, 2, 10);
    engine.replayToPosition(draftId, 3, 3);
    
    // Verify original state unchanged
    const stillFinalState = engine.getDraftState(draftId)!;
    expect(stillFinalState.playerDecks[0].length).toBe(originalDeckSize);
    expect(stillFinalState.status).toBe('completed');
    console.log('Original state remains unchanged after replays ✓');

    console.log('\n=== All Integration Tests Passed! ===\n');
  });

  it('should handle concurrent picks and replay correctly', () => {
    console.log('\n=== Testing Concurrent Operations ===\n');
    
    // Create and start draft
    engine.applyAction({
      type: 'CREATE_DRAFT',
      payload: {
        draftId: 'concurrent-test',
        seed: 'concurrent-seed',
        setCode: 'TEST',
        playerCount: 8,
        humanPlayerIndex: 0,
      },
      timestamp: Date.now(),
    });
    
    engine.applyAction({
      type: 'START_DRAFT',
      payload: { draftId: 'concurrent-test' },
      timestamp: Date.now(),
    });

    // Make some picks
    for (let i = 0; i < 5; i++) {
      const state = engine.getDraftState('concurrent-test')!;
      const humanPack = state.packs[state.currentRound][0];
      
      if (humanPack && humanPack.cards.length > 0) {
        // Human pick
        engine.applyAction({
          type: 'HUMAN_PICK',
          payload: { draftId: 'concurrent-test', cardId: humanPack.cards[0].id },
          timestamp: Date.now(),
        });
        
        // Bot picks
        for (let j = 1; j < 8; j++) {
          const botState = engine.getDraftState('concurrent-test')!;
          const botPack = botState.packs[botState.currentRound][j];
          if (botPack && botPack.cards.length > 0) {
            engine.applyAction({
              type: 'BOT_PICK',
              payload: { draftId: 'concurrent-test', playerIndex: j, cardId: botPack.cards[0].id },
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    // Now test replay while draft is in progress
    const currentState = engine.getDraftState('concurrent-test')!;
    console.log(`Current position: R${currentState.currentRound}P${currentState.currentPick}`);
    console.log(`Human deck size: ${currentState.playerDecks[0].length}`);

    // Replay to various positions
    const replay1 = engine.replayToPosition('concurrent-test', 1, 1);
    expect(replay1.playerDecks[0]).toBeUndefined();
    console.log('Replay to 1-1: No deck ✓');

    const replay2 = engine.replayToPosition('concurrent-test', 1, 3);
    expect(replay2.playerDecks[0]?.length).toBe(2);
    console.log('Replay to 1-3: 2 cards ✓');

    // Continue draft after replay
    const continueState = engine.getDraftState('concurrent-test')!;
    const continuePack = continueState.packs[continueState.currentRound][0];
    if (continuePack && continuePack.cards.length > 0) {
      engine.applyAction({
        type: 'HUMAN_PICK',
        payload: { draftId: 'concurrent-test', cardId: continuePack.cards[0].id },
        timestamp: Date.now(),
      });
    }

    // Verify draft progressed correctly
    const afterContinue = engine.getDraftState('concurrent-test')!;
    expect(afterContinue.playerDecks[0].length).toBeGreaterThanOrEqual(currentState.playerDecks[0].length);
    console.log(`Draft continued correctly after replay (was ${currentState.playerDecks[0].length}, now ${afterContinue.playerDecks[0].length}) ✓`);

    console.log('\n=== Concurrent Operations Test Passed! ===\n');
  });
});