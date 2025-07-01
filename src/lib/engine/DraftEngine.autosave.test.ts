import { describe, it, expect, beforeEach } from 'vitest';
import { DraftEngine } from './DraftEngine';
import { InMemoryAdapter } from './storage/InMemoryAdapter';
import type { SetData } from './PackGenerator';

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

describe('DraftEngine - Auto-save Behavior', () => {
  let engine: DraftEngine;
  let storage: InMemoryAdapter;
  let setData: SetData;

  beforeEach(() => {
    storage = new InMemoryAdapter();
    engine = new DraftEngine(storage);
    setData = createTestSet();
    engine.loadSetData(setData);
  });

  it('should save after bot picks and position advancement', async () => {
    const draftId = 'test_autosave_123';
    
    // Create and start draft
    engine.applyAction({
      type: 'CREATE_DRAFT',
      payload: {
        draftId,
        seed: 'autosave-test',
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

    // Get initial state
    const initialState = engine.getDraftState(draftId)!;
    expect(initialState.currentRound).toBe(1);
    expect(initialState.currentPick).toBe(1);

    // Human picks
    const humanPack = initialState.packs[1][0];
    engine.applyAction({
      type: 'HUMAN_PICK',
      payload: { draftId, cardId: humanPack.cards[0].id },
      timestamp: Date.now(),
    });

    // Bot picks
    for (let i = 1; i < 8; i++) {
      const state = engine.getDraftState(draftId)!;
      const botPack = state.packs[1][i];
      if (botPack && botPack.cards.length > 0) {
        engine.applyAction({
          type: 'BOT_PICK',
          payload: { draftId, playerIndex: i, cardId: botPack.cards[0].id },
          timestamp: Date.now(),
        });
      }
    }

    // Check current state is at p1p2
    const afterPicksState = engine.getDraftState(draftId)!;
    expect(afterPicksState.currentRound).toBe(1);
    expect(afterPicksState.currentPick).toBe(2);
    
    // Check what's in storage
    console.log('Storage contents:', {
      drafts: storage.getRawStorage().size,
      hasDraft: storage.getRawStorage().has(draftId)
    });

    // Now simulate a page reload by creating a new engine with the same storage
    const newEngine = new DraftEngine(storage);
    newEngine.loadSetData(setData);
    
    // Load the draft from storage
    const loadedDraft = await newEngine.loadDraft(draftId);
    
    // The loaded draft should have the latest position
    expect(loadedDraft).toBeTruthy();
    expect(loadedDraft!.currentRound).toBe(1);
    expect(loadedDraft!.currentPick).toBe(2);
    expect(loadedDraft!.playerDecks[0]?.length).toBe(1); // Human has 1 card
    
    // Verify all actions were saved
    const lastAction = loadedDraft!.actionHistory[loadedDraft!.actionHistory.length - 1];
    expect(lastAction.type).toBe('ADVANCE_POSITION');
    
    console.log('Loaded draft state:', {
      position: `p${loadedDraft!.currentRound}p${loadedDraft!.currentPick}`,
      actionCount: loadedDraft!.actionHistory.length,
      lastAction: lastAction.type,
      humanDeckSize: loadedDraft!.playerDecks[0]?.length
    });
  });
});