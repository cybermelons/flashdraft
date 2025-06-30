/**
 * Test complete draft through service layer
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DraftService } from './DraftService';
import { LocalDraftStorage } from './DraftStorage';

describe('DraftService - Full Draft Test', () => {
  let service: DraftService;
  let storage: LocalDraftStorage;
  
  beforeEach(() => {
    storage = new LocalDraftStorage();
    service = new DraftService({ storage });
  });
  
  test('complete draft simulation is deterministic', async () => {
    
    // Create draft
    const draft1 = await service.createDraft('FFX');
    const started1 = await service.startDraft(draft1.seed);
    
    // Make first pick
    const humanPlayer1 = started1.players.find(p => p.isHuman)!;
    const firstCard = humanPlayer1.currentPack!.cards[0].id;
    console.log(`First pick: ${firstCard}`);
    
    const afterPick1 = await service.makeHumanPick(started1, firstCard);
    
    // Verify position advanced
    expect(afterPick1.pick).toBe(2);
    expect(afterPick1.round).toBe(1);
    
    // Make second pick 
    const humanPlayer2 = afterPick1.players.find(p => p.isHuman)!;
    const secondCard = humanPlayer2.currentPack!.cards[0].id;
    console.log(`Second pick: ${secondCard}`);
    
    const afterPick2 = await service.makeHumanPick(afterPick1, secondCard);
    
    // Now test replay determinism
    console.log('Testing replay...');
    const replayedP1P1 = await service.navigateToPosition(draft1.seed, 1, 1);
    const replayedP1P2 = await service.navigateToPosition(draft1.seed, 1, 2);
    
    // Verify p1p1 replay
    const replayedHuman1 = replayedP1P1.players.find(p => p.isHuman)!;
    const replayedFirstCard = replayedHuman1.currentPack!.cards[0].id;
    expect(replayedFirstCard).toBe(firstCard);
    
    // Verify p1p2 replay
    const replayedHuman2 = replayedP1P2.players.find(p => p.isHuman)!;
    const replayedSecondCard = replayedHuman2.currentPack!.cards[0].id;
    expect(replayedSecondCard).toBe(secondCard);
    
    console.log('✅ Draft engine is deterministic');
  });
  
  test('action sequence validation', async () => {
    
    // Create and start draft
    const draft = await service.createDraft('FFX');
    const started = await service.startDraft(draft.seed);
    
    // Get initial state
    const humanPlayer = started.players.find(p => p.isHuman)!;
    const initialPackSize = humanPlayer.currentPack!.cards.length;
    const cardToPick = humanPlayer.currentPack!.cards[0].id;
    
    console.log(`Initial pack size: ${initialPackSize}`);
    console.log(`Picking card: ${cardToPick}`);
    
    // Make pick
    const afterPick = await service.makeHumanPick(started, cardToPick);
    
    // Verify results
    const humanAfterPick = afterPick.players.find(p => p.isHuman)!;
    const finalPackSize = humanAfterPick.currentPack!.cards.length;
    
    console.log(`Final pack size: ${finalPackSize}`);
    console.log(`Position: p${afterPick.round}p${afterPick.pick}`);
    
    // Pack should have one less card
    expect(finalPackSize).toBe(initialPackSize - 1);
    
    // Position should advance
    expect(afterPick.pick).toBe(2);
    
    // Human should have the picked card
    expect(humanAfterPick.pickedCards).toHaveLength(1);
    expect(humanAfterPick.pickedCards[0].id).toBe(cardToPick);
  });
});