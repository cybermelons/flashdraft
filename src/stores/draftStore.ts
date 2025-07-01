/**
 * Draft Store - Reactive UI state for draft operations
 * 
 * Manages current draft state, UI interactions, and direct engine access.
 * Uses nanostores for reactive state management with React components.
 */

import { atom, map, computed } from 'nanostores';
import { DraftEngine, type DraftState } from '@/lib/engine/DraftEngine';
import { LocalStorageAdapter } from '@/lib/engine/storage/LocalStorageAdapter';
import type { DraftAction } from '@/lib/engine/actions';
import type { Card, SetData } from '@/lib/engine/PackGenerator';
import { loadAllSets, getAvailableSetCodes } from '@/lib/setData';

// Initialize draft engine with storage
const storage = new LocalStorageAdapter();
const draftEngine = new DraftEngine(storage);

// Auto-load all available set data into the engine
try {
  const allSets = loadAllSets();
  for (const [setCode, setData] of Object.entries(allSets)) {
    draftEngine.loadSetData(setData);
  }
} catch (error) {
  console.error('Failed to load set data:', error);
}

// Core draft state
export const $currentDraftId = atom<string | null>(null);
export const $currentDraft = atom<DraftState | null>(null);
export const $isLoading = atom<boolean>(false);
export const $error = atom<string | null>(null);

// UI interaction state
export const $selectedCard = atom<Card | null>(null);
export const $hoveredCard = atom<Card | null>(null);
export const $isPickingCard = atom<boolean>(false);

// UI navigation state (separate from engine progression)
export const $viewingRound = atom<number>(1);
export const $viewingPick = atom<number>(1);

// Derived navigation state
export const $isViewingCurrent = computed(
  [$currentDraft, $viewingRound, $viewingPick], 
  (draft, viewingRound, viewingPick) => {
    if (!draft) return false;
    return draft.currentRound === viewingRound && draft.currentPick === viewingPick;
  }
);

export const $isViewingHistory = computed(
  [$isViewingCurrent], 
  (isViewingCurrent) => !isViewingCurrent
);

export const $viewingPosition = computed(
  [$viewingRound, $viewingPick], 
  (round, pick) => ({ round, pick })
);

// Get historical state at viewing position
export const $viewingDraftState = computed(
  [$currentDraft, $viewingRound, $viewingPick], 
  (draft, viewingRound, viewingPick) => {
    if (!draft) return null;
    
    // Use engine's replay functionality to get historical state
    try {
      return draftEngine.replayToPosition(draft.draftId, viewingRound, viewingPick);
    } catch (error) {
      return draft; // Fallback to current state
    }
  }
);

// Current pack based on viewing position
export const $currentPack = computed(
  [$currentDraft, $viewingDraftState, $viewingRound, $isViewingCurrent], 
  (currentDraft, viewingState, viewingRound, isViewingCurrent) => {
    // Use current draft when viewing current position, historical state when viewing past
    const draft = isViewingCurrent ? currentDraft : viewingState;
    if (!draft) return null;
    
    const { humanPlayerIndex } = draft;
    const roundPacks = draft.packs[viewingRound];
    const pack = roundPacks?.[humanPlayerIndex] || null;
    
    console.log('$currentPack computed:', {
      isViewingCurrent,
      viewingRound,
      currentRound: draft.currentRound,
      currentPick: draft.currentPick,
      packCards: pack?.cards.length || 0
    });
    
    return pack;
  }
);

export const $humanDeck = computed([$currentDraft], (draft) => {
  if (!draft) return [];
  
  const { humanPlayerIndex } = draft;
  return draft.playerDecks[humanPlayerIndex] || [];
});

// Card lookup infrastructure
export const $cardLookup = computed([$currentDraft], (draft) => {
  if (!draft) return null;
  
  const setData = draftEngine.getSetData(draft.setCode);
  if (!setData) return null;
  
  // Create ID -> Card map for efficient O(1) lookups
  const lookup = new Map<string, Card>();
  for (const card of setData.cards) {
    lookup.set(card.id, card);
  }
  return lookup;
});

// Get human deck based on viewing state
export const $viewingHumanDeck = computed(
  [$currentDraft, $viewingDraftState, $isViewingCurrent],
  (currentDraft, viewingState, isViewingCurrent) => {
    // Use current draft when viewing current position, historical state when viewing past
    const draft = isViewingCurrent ? currentDraft : viewingState;
    if (!draft) return [];
    const { humanPlayerIndex } = draft;
    return draft.playerDecks[humanPlayerIndex] || [];
  }
);

// Get full card data for human player's deck
export const $humanDeckCards = computed(
  [$viewingHumanDeck, $cardLookup], 
  (deckIds, lookup) => {
    if (!deckIds || !lookup) return [];
    
    const cards: Card[] = [];
    for (const id of deckIds) {
      const card = lookup.get(id);
      if (card) cards.push(card);
    }
    
    // Sort by rarity (mythic > rare > uncommon > common) then by name
    const rarityOrder: Record<string, number> = { 
      mythic: 4, 
      rare: 3, 
      uncommon: 2, 
      common: 1 
    };
    
    cards.sort((a, b) => {
      const rarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
      return rarityDiff || a.name.localeCompare(b.name);
    });
    
    return cards;
  }
);

// Helper function to get a single card by ID
export function getCardById(cardId: string): Card | null {
  const lookup = $cardLookup.get();
  return lookup?.get(cardId) || null;
}

export const $draftProgress = computed([$currentDraft], (draft) => {
  if (!draft) return null;
  
  const totalPicks = 3 * 15; // 3 rounds, 15 picks each
  const currentPick = (draft.currentRound - 1) * 15 + draft.currentPick;
  
  return {
    currentRound: draft.currentRound,
    currentPick: draft.currentPick,
    totalRounds: 3,
    totalPicks,
    progress: (currentPick - 1) / totalPicks,
    isComplete: draft.status === 'completed',
  };
});

// Derived state for UI
export const $canPick = computed(
  [$currentDraft, $isLoading, $isPickingCard, $isViewingCurrent], 
  (draft, loading, picking, isViewingCurrent) => {
    const canPick = draft && 
           draft.status === 'active' && 
           !loading && 
           !picking &&
           isViewingCurrent; // Can only pick when viewing current engine position
    
    
    return canPick;
  }
);

export const $currentPosition = computed(
  [$currentDraft, $viewingRound, $viewingPick], 
  (draft, viewingRound, viewingPick) => {
    if (!draft) return null;
    
    return {
      round: viewingRound,
      pick: viewingPick,
      urlPath: `/draft/${draft.draftId}/p${viewingRound}p${viewingPick}`,
    };
  }
);

// Draft management actions
export const draftActions = {
  /**
   * Create a new draft
   */
  async createDraft(seed: string, setCode: string): Promise<string> {
    $isLoading.set(true);
    $error.set(null);
    
    try {
      const draftId = `draft_${seed}_${Date.now()}`;
      
      const action: DraftAction = {
        type: 'CREATE_DRAFT',
        payload: {
          draftId,
          seed,
          setCode,
          playerCount: 8,
          humanPlayerIndex: 0,
        },
        timestamp: Date.now(),
      };
      
      const newDraft = draftEngine.applyAction(action);
      
      $currentDraftId.set(draftId);
      $currentDraft.set(newDraft);
      
      // Initialize viewing position
      $viewingRound.set(1);
      $viewingPick.set(1);
      
      return draftId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create draft';
      $error.set(message);
      throw error;
    } finally {
      $isLoading.set(false);
    }
  },

  /**
   * Load an existing draft
   */
  async loadDraft(draftId: string): Promise<void> {
    $isLoading.set(true);
    $error.set(null);
    
    try {
      const draft = await draftEngine.loadDraft(draftId);
      
      if (!draft) {
        throw new Error(`Draft not found: ${draftId}`);
      }
      
      $currentDraftId.set(draftId);
      $currentDraft.set(draft);
      
      // Initialize viewing position to current engine progression
      console.log('Setting viewing position from loadDraft:', {
        round: draft.currentRound,
        pick: draft.currentPick,
        caller: new Error().stack
      });
      $viewingRound.set(draft.currentRound);
      $viewingPick.set(draft.currentPick);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load draft';
      $error.set(message);
      throw error;
    } finally {
      $isLoading.set(false);
    }
  },

  /**
   * Start the draft (generate initial packs)
   */
  async startDraft(): Promise<void> {
    const draftId = $currentDraftId.get();
    if (!draftId) throw new Error('No current draft');
    
    $isLoading.set(true);
    
    try {
      const action: DraftAction = {
        type: 'START_DRAFT',
        payload: { draftId },
        timestamp: Date.now(),
      };
      
      const updatedDraft = draftEngine.applyAction(action);
      $currentDraft.set(updatedDraft);
      
      // Initialize viewing position to current engine progression  
      $viewingRound.set(updatedDraft.currentRound);
      $viewingPick.set(updatedDraft.currentPick);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start draft';
      $error.set(message);
      throw error;
    } finally {
      $isLoading.set(false);
    }
  },

  /**
   * Pick a card for the human player
   */
  async pickCard(cardId: string): Promise<void> {
    const draftId = $currentDraftId.get();
    const isViewingCurrent = $isViewingCurrent.get();
    
    if (!draftId) throw new Error('No current draft');
    if (!isViewingCurrent) throw new Error('Cannot pick cards when viewing historical positions');
    
    $isPickingCard.set(true);
    $error.set(null);
    
    try {
      const action: DraftAction = {
        type: 'HUMAN_PICK',
        payload: { draftId, cardId },
        timestamp: Date.now(),
      };
      
      // Engine processes pick
      const updatedDraft = draftEngine.applyAction(action);
      $currentDraft.set(updatedDraft);
      
      $selectedCard.set(null); // Clear selection after pick
      
      // Process all picks and position updates together
      // Pass the updated draft directly to avoid race conditions
      await this.processAllPicksAndAdvance(updatedDraft);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to pick card';
      $error.set(message);
      throw error;
    } finally {
      $isPickingCard.set(false);
    }
  },

  /**
   * Process all picks and advance position atomically
   */
  async processAllPicksAndAdvance(draftAfterHumanPick?: DraftState): Promise<void> {
    const draft = draftAfterHumanPick || $currentDraft.get();
    const draftId = $currentDraftId.get();
    
    if (!draft || !draftId) throw new Error('No current draft');
    
    $isLoading.set(true);
    
    try {
      let currentState = draft;
      
      // Process picks for all non-human players
      for (let playerIndex = 1; playerIndex < draft.playerCount; playerIndex++) {
        const currentPack = currentState.packs[currentState.currentRound]?.[playerIndex];
        if (currentPack && currentPack.cards.length > 0) {
          // Simple bot logic: pick first card
          const cardToPickId = currentPack.cards[0].id;
          
          const action: DraftAction = {
            type: 'BOT_PICK',
            payload: { draftId, playerIndex, cardId: cardToPickId },
            timestamp: Date.now(),
          };
          
          currentState = draftEngine.applyAction(action);
        }
      }
      
      // Now update everything atomically
      $currentDraft.set(currentState);
      
      // Update viewing position to match engine
      console.log('Setting viewing position from processAllPicksAndAdvance:', {
        round: currentState.currentRound,
        pick: currentState.currentPick,
        humanPackCards: currentState.packs[currentState.currentRound]?.[0]?.cards.length
      });
      $viewingRound.set(currentState.currentRound);
      $viewingPick.set(currentState.currentPick);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process picks';
      $error.set(message);
      throw error;
    } finally {
      $isLoading.set(false);
    }
  },

  /**
   * Simulate bot picks for all other players
   * @deprecated Use processAllPicksAndAdvance instead
   */
  async processBotPicks(): Promise<void> {
    const draft = $currentDraft.get();
    const draftId = $currentDraftId.get();
    
    if (!draft || !draftId) throw new Error('No current draft');
    
    $isLoading.set(true);
    
    try {
      let currentState = draft;
      
      // Process picks for all non-human players
      for (let playerIndex = 1; playerIndex < draft.playerCount; playerIndex++) {
        const currentPack = currentState.packs[currentState.currentRound]?.[playerIndex];
        if (currentPack && currentPack.cards.length > 0) {
          // Simple bot logic: pick first card (can be enhanced later)
          const cardToPickId = currentPack.cards[0].id;
          
          const action: DraftAction = {
            type: 'BOT_PICK',
            payload: { draftId, playerIndex, cardId: cardToPickId },
            timestamp: Date.now(),
          };
          
          currentState = draftEngine.applyAction(action);
        }
      }
      
      $currentDraft.set(currentState);
      
      // Always update viewing position to match engine after bot picks
      console.log('After bot picks, updating viewing position:', {
        engineRound: currentState.currentRound,
        enginePick: currentState.currentPick
      });
      $viewingRound.set(currentState.currentRound);
      $viewingPick.set(currentState.currentPick);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process bot picks';
      $error.set(message);
      throw error;
    } finally {
      $isLoading.set(false);
    }
  },

  /**
   * Navigate UI viewing position (does not affect engine state)
   */
  navigateToPosition(round: number, pick: number): void {
    $viewingRound.set(round);
    $viewingPick.set(pick);
  },

  /**
   * Jump viewing position to current engine progression
   */
  jumpToCurrentPosition(): void {
    const draft = $currentDraft.get();
    if (draft) {
      $viewingRound.set(draft.currentRound);
      $viewingPick.set(draft.currentPick);
    }
  },

  /**
   * Get list of all drafts
   */
  async listDrafts() {
    try {
      return await draftEngine.listDrafts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list drafts';
      $error.set(message);
      return [];
    }
  },

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    try {
      await draftEngine.deleteDraft(draftId);
      
      // If we deleted the current draft, clear the current state
      if ($currentDraftId.get() === draftId) {
        $currentDraftId.set(null);
        $currentDraft.set(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete draft';
      $error.set(message);
      throw error;
    }
  },

  /**
   * Clear all state (useful for logout/reset)
   */
  clearState(): void {
    $currentDraftId.set(null);
    $currentDraft.set(null);
    $selectedCard.set(null);
    $hoveredCard.set(null);
    $isLoading.set(false);
    $isPickingCard.set(false);
    $error.set(null);
  }
};

// UI interaction actions
export const uiActions = {
  /**
   * Select a card (for detailed view, pick preparation)
   */
  selectCard(card: Card | null): void {
    $selectedCard.set(card);
  },

  /**
   * Hover over a card (for tooltips, previews)
   */
  hoverCard(card: Card | null): void {
    $hoveredCard.set(card);
  },

  /**
   * Clear error state
   */
  clearError(): void {
    $error.set(null);
  }
};

// Set data management
export const $setData = map<Record<string, SetData>>({});

export const setDataActions = {
  /**
   * Load set data into the engine
   */
  loadSetData(setData: SetData): void {
    draftEngine.loadSetData(setData);
    $setData.setKey(setData.setCode, setData);
  },

  /**
   * Get set data for a specific set
   */
  getSetData(setCode: string): SetData | null {
    return $setData.get()[setCode] || null;
  }
};

// Export the engine instance for direct access if needed
export { draftEngine };