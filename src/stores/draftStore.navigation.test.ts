import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  $currentDraft, 
  $currentPack, 
  $viewingPosition,
  draftActions,
  draftEngine 
} from './draftStore';
import type { DraftState } from '@/lib/engine/DraftEngine';
import type { SetData } from '@/lib/engine/PackGenerator';

// Mock set data
const mockSetData: SetData = {
  setCode: 'TST',
  setName: 'Test Set',
  cards: Array.from({ length: 300 }, (_, i) => ({
    id: `card_${i}`,
    name: `Test Card ${i}`,
    set: 'TST',
    collector_number: `${i}`,
    rarity: i < 10 ? 'mythic' : i < 40 ? 'rare' : i < 120 ? 'uncommon' : 'common',
    color_identity: [],
    mana_cost: '{1}',
    type_line: 'Artifact',
    oracle_text: 'Test card',
    image_uris: {
      small: '',
      normal: '',
      large: '',
      png: '',
      art_crop: '',
      border_crop: ''
    }
  }))
};

// Mock window.location
const mockLocation = {
  pathname: '/draft/test_draft_123/p1p1',
  href: 'http://localhost:3000/draft/test_draft_123/p1p1'
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
    key: (index: number) => Object.keys(store)[index] || null,
    length: Object.keys(store).length
  };
})();

// Create a mock window object for node environment
if (typeof window === 'undefined') {
  (global as any).window = {
    location: mockLocation,
    localStorage: localStorageMock,
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
} else {
  Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true
  });
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });
}

describe('Draft Store Navigation - Pack Consistency', () => {
  beforeEach(() => {
    // Clear any existing state
    draftActions.clearState();
    localStorageMock.clear();
    
    // Load mock set data
    draftEngine.loadSetData(mockSetData);
  });

  it('should show the same pack when navigating back to current position', async () => {
    // Create and start a draft
    const draftId = await draftActions.createDraft('test-seed', 'TST');
    await draftActions.startDraft();
    
    // Get initial state at p1p1
    const initialDraft = $currentDraft.get();
    expect(initialDraft).toBeTruthy();
    expect(initialDraft!.currentRound).toBe(1);
    expect(initialDraft!.currentPick).toBe(1);
    
    // Store the initial pack at p1p1
    const initialPack = $currentPack.get();
    expect(initialPack).toBeTruthy();
    const initialPackCards = initialPack!.cards.map(c => c.id);
    console.log('Initial pack at p1p1:', initialPackCards);
    
    // Make several picks to advance the draft
    const cardsToPick = initialPack!.cards.slice(0, 3);
    
    // Pick 1
    await draftActions.pickCard(cardsToPick[0].id);
    await vi.waitFor(() => {
      const draft = $currentDraft.get();
      return draft?.currentPick === 2;
    });
    
    // Pick 2
    const pack2 = $currentPack.get();
    await draftActions.pickCard(pack2!.cards[0].id);
    await vi.waitFor(() => {
      const draft = $currentDraft.get();
      return draft?.currentPick === 3;
    });
    
    // Pick 3
    const pack3 = $currentPack.get();
    await draftActions.pickCard(pack3!.cards[0].id);
    await vi.waitFor(() => {
      const draft = $currentDraft.get();
      return draft?.currentPick === 4;
    });
    
    // Now we're at p1p4
    const currentDraft = $currentDraft.get();
    expect(currentDraft!.currentRound).toBe(1);
    expect(currentDraft!.currentPick).toBe(4);
    
    // Store the pack at p1p4 before navigation
    const packAtP1P4Before = $currentPack.get();
    expect(packAtP1P4Before).toBeTruthy();
    const packAtP1P4BeforeCards = packAtP1P4Before!.cards.map(c => c.id);
    console.log('Pack at p1p4 before navigation:', packAtP1P4BeforeCards);
    
    // Navigate back to p1p2 (historical position)
    mockLocation.pathname = `/draft/${draftId}/p1p2`;
    window.dispatchEvent(new Event('urlchange'));
    
    await vi.waitFor(() => {
      const pos = $viewingPosition.get();
      return pos.round === 1 && pos.pick === 2;
    });
    
    // Check we're viewing history
    const packAtP1P2 = $currentPack.get();
    console.log('Pack at p1p2 (historical):', packAtP1P2?.cards.map(c => c.id));
    
    // Navigate forward to p1p4 (current position)
    mockLocation.pathname = `/draft/${draftId}/p1p4`;
    window.dispatchEvent(new Event('urlchange'));
    
    await vi.waitFor(() => {
      const pos = $viewingPosition.get();
      return pos.round === 1 && pos.pick === 4;
    });
    
    // Get the pack at p1p4 after navigation
    const packAtP1P4After = $currentPack.get();
    expect(packAtP1P4After).toBeTruthy();
    const packAtP1P4AfterCards = packAtP1P4After!.cards.map(c => c.id);
    console.log('Pack at p1p4 after navigation:', packAtP1P4AfterCards);
    
    // The pack should be the same before and after navigation!
    expect(packAtP1P4AfterCards).toEqual(packAtP1P4BeforeCards);
  });
  
  it('should correctly identify when at current engine position', async () => {
    // Create and start a draft
    const draftId = await draftActions.createDraft('test-seed-2', 'TST');
    await draftActions.startDraft();
    
    // Make a pick to advance to p1p2
    const pack1 = $currentPack.get();
    await draftActions.pickCard(pack1!.cards[0].id);
    
    await vi.waitFor(() => {
      const draft = $currentDraft.get();
      return draft?.currentPick === 2;
    });
    
    const draft = $currentDraft.get();
    expect(draft!.currentRound).toBe(1);
    expect(draft!.currentPick).toBe(2);
    
    // Navigate to p1p1 (historical)
    mockLocation.pathname = `/draft/${draftId}/p1p1`;
    window.dispatchEvent(new Event('urlchange'));
    
    await vi.waitFor(() => {
      const pos = $viewingPosition.get();
      return pos.round === 1 && pos.pick === 1;
    });
    
    // Should be viewing history
    const currentPackAtP1P1 = $currentPack.get();
    console.log('Viewing p1p1, using historical state');
    
    // Navigate to p1p2 (current engine position)
    mockLocation.pathname = `/draft/${draftId}/p1p2`;
    window.dispatchEvent(new Event('urlchange'));
    
    await vi.waitFor(() => {
      const pos = $viewingPosition.get();
      return pos.round === 1 && pos.pick === 2;
    });
    
    // Should be viewing current state since we're at engine position
    const currentPackAtP1P2 = $currentPack.get();
    console.log('Viewing p1p2 (engine position), using current state');
    
    // The pack at engine position should match the actual current pack
    const currentDraft = $currentDraft.get();
    const enginePack = currentDraft!.packs[1][0]; // Human player pack
    expect(currentPackAtP1P2?.cards.map(c => c.id)).toEqual(enginePack.cards.map(c => c.id));
  });
});