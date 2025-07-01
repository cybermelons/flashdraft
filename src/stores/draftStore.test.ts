import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  $currentDraft, 
  $currentPack, 
  $viewingPosition,
  draftActions 
} from './draftStore';

// Mock the URL manager to avoid navigation side effects
vi.mock('@/utils/urlManager', () => ({
  urlManager: {
    navigateToPosition: vi.fn(),
    updatePositionAfterProgression: vi.fn()
  }
}));

describe('Draft Store - Pack Consistency Bug', () => {
  beforeEach(() => {
    // Reset stores
    draftActions.clearState();
  });

  it('should show the same pack when returning to current position after viewing history', async () => {
    // Create and start a draft
    const draftId = await draftActions.createDraft('test-seed', 'TEST');
    await draftActions.startDraft();
    
    // Get initial state at p1p1
    const initialDraft = $currentDraft.get();
    expect(initialDraft?.currentRound).toBe(1);
    expect(initialDraft?.currentPick).toBe(1);
    
    // Get the pack at p1p1
    const packAtP1P1 = $currentPack.get();
    expect(packAtP1P1).toBeTruthy();
    const packAtP1P1Cards = packAtP1P1?.cards.map(c => c.id);
    
    // Make a pick to advance to p1p2
    if (packAtP1P1?.cards[0]) {
      await draftActions.pickCard(packAtP1P1.cards[0].id);
    }
    
    // Wait for state to settle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should now be at p1p2
    const draftAfterPick = $currentDraft.get();
    expect(draftAfterPick?.currentRound).toBe(1);
    expect(draftAfterPick?.currentPick).toBe(2);
    
    // Get the pack at p1p2 (current position)
    const packAtP1P2Current = $currentPack.get();
    expect(packAtP1P2Current).toBeTruthy();
    const packAtP1P2CurrentCards = packAtP1P2Current?.cards.map(c => c.id);
    
    // Navigate back to p1p1 (historical position)
    draftActions.navigateToPosition(1, 1);
    
    // Verify we're viewing p1p1
    const viewingPos = $viewingPosition.get();
    expect(viewingPos.round).toBe(1);
    expect(viewingPos.pick).toBe(1);
    
    // Navigate forward to p1p2 (current position) again
    draftActions.navigateToPosition(1, 2);
    
    // Get the pack at p1p2 after navigation
    const packAtP1P2AfterNav = $currentPack.get();
    expect(packAtP1P2AfterNav).toBeTruthy();
    const packAtP1P2AfterNavCards = packAtP1P2AfterNav?.cards.map(c => c.id);
    
    // The pack at p1p2 should be the same before and after navigation
    expect(packAtP1P2AfterNavCards).toEqual(packAtP1P2CurrentCards);
    
    // The packs should have the expected number of cards
    expect(packAtP1P1Cards?.length).toBe(15); // Full pack at p1p1
    expect(packAtP1P2CurrentCards?.length).toBe(14); // One card removed after human pick
  });

  it('should use historical state for past positions and current state for current position', async () => {
    // Create and start a draft
    const draftId = await draftActions.createDraft('test-seed-2', 'TEST');
    await draftActions.startDraft();
    
    // Make several picks to have history
    const pack1 = $currentPack.get();
    if (pack1?.cards[0]) {
      await draftActions.pickCard(pack1.cards[0].id);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const pack2 = $currentPack.get();
    if (pack2?.cards[0]) {
      await draftActions.pickCard(pack2.cards[0].id);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const pack3 = $currentPack.get();
    if (pack3?.cards[0]) {
      await draftActions.pickCard(pack3.cards[0].id);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now at p1p4
    const currentDraft = $currentDraft.get();
    expect(currentDraft?.currentRound).toBe(1);
    expect(currentDraft?.currentPick).toBe(4);
    
    // Navigate to p1p2 (historical)
    draftActions.navigateToPosition(1, 2);
    const packAtP1P2 = $currentPack.get();
    
    // Navigate to p1p4 (current)
    draftActions.navigateToPosition(1, 4);
    const packAtP1P4Current = $currentPack.get();
    
    // Navigate to p1p5 (future - hasn't happened yet)
    draftActions.navigateToPosition(1, 5);
    const packAtP1P5 = $currentPack.get();
    
    // Verify pack sizes
    expect(packAtP1P2?.cards.length).toBe(14); // Historical pack after 1 pick
    expect(packAtP1P4Current?.cards.length).toBe(12); // Current pack after 3 picks
    expect(packAtP1P5).toBeNull(); // No pack for future position
  });
});