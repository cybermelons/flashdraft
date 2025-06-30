/**
 * Draft Engine - Pure Event-Sourced State Machine
 * 
 * Core draft logic with zero dependencies.
 * All state changes go through actions for perfect reproducibility.
 */

import type { DraftAction } from './actions';
import { PackGenerator, type Card, type SetData, type BoosterPack } from './packGenerator';
import { SeededRandom } from './seededRandom';

export interface DraftState {
  draftId: string;
  seed: string;
  setCode: string;
  status: 'created' | 'active' | 'completed';
  
  // Draft configuration
  playerCount: number;
  humanPlayerIndex: number;
  
  // Current position
  currentRound: number; // 1, 2, 3
  currentPick: number;   // 1-15
  
  // Packs and cards
  packs: Record<number, BoosterPack[]>; // round -> packs for each player
  playerDecks: Record<number, string[]>; // playerIndex -> cardIds
  
  // Action history for reproducibility
  actionHistory: DraftAction[];
  
  // Draft flow
  packPassDirection: Record<number, 'left' | 'right'>; // round -> direction
}

export interface DraftEngineState {
  drafts: Record<string, DraftState>;
  setData: Record<string, SetData>;
}

export class DraftEngine {
  private state: DraftEngineState;

  constructor() {
    this.state = {
      drafts: {},
      setData: {},
    };
  }

  /**
   * Load set data for pack generation
   */
  loadSetData(setData: SetData): void {
    this.state.setData[setData.setCode] = setData;
  }

  /**
   * Apply an action to update state
   */
  applyAction(action: DraftAction): DraftState {
    switch (action.type) {
      case 'CREATE_DRAFT':
        return this.handleCreateDraft(action);
      case 'START_DRAFT':
        return this.handleStartDraft(action);
      case 'HUMAN_PICK':
        return this.handleHumanPick(action);
      case 'BOT_PICK':
        return this.handleBotPick(action);
      case 'PASS_PACKS':
        return this.handlePassPacks(action);
      case 'ADVANCE_POSITION':
        return this.handleAdvancePosition(action);
      case 'START_ROUND':
        return this.handleStartRound(action);
      case 'COMPLETE_DRAFT':
        return this.handleCompleteDraft(action);
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Replay actions from history to reach specific state
   */
  replayToPosition(draftId: string, targetRound: number, targetPick: number): DraftState {
    const draft = this.state.drafts[draftId];
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    // Reset to initial state
    const initialDraft = this.createInitialDraftState(
      draft.draftId,
      draft.seed,
      draft.setCode,
      draft.playerCount,
      draft.humanPlayerIndex
    );

    // Replay actions until we reach target position
    let currentState = initialDraft;
    for (const action of draft.actionHistory) {
      currentState = this.applyActionToState(currentState, action);
      
      // Stop if we've reached the target position
      if (currentState.currentRound >= targetRound && 
          currentState.currentPick >= targetPick) {
        break;
      }
    }

    return currentState;
  }

  /**
   * Get current draft state
   */
  getDraftState(draftId: string): DraftState | null {
    return this.state.drafts[draftId] || null;
  }

  /**
   * Get all draft IDs
   */
  getAllDraftIds(): string[] {
    return Object.keys(this.state.drafts);
  }

  // Private action handlers

  private handleCreateDraft(action: DraftAction): DraftState {
    if (action.type !== 'CREATE_DRAFT') throw new Error('Invalid action type');

    const { draftId, seed, setCode, playerCount, humanPlayerIndex } = action.payload;
    
    const draft = this.createInitialDraftState(draftId, seed, setCode, playerCount, humanPlayerIndex);
    draft.actionHistory.push(action);
    
    this.state.drafts[draftId] = draft;
    return draft;
  }

  private handleStartDraft(action: DraftAction): DraftState {
    if (action.type !== 'START_DRAFT') throw new Error('Invalid action type');

    const draft = this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error('Draft not found');

    const updatedDraft = { ...draft };
    updatedDraft.status = 'active';
    updatedDraft.actionHistory = [...draft.actionHistory, action];

    // Generate initial packs for round 1
    updatedDraft.packs[1] = this.generatePacksForRound(draft, 1);

    this.state.drafts[draft.draftId] = updatedDraft;
    return updatedDraft;
  }

  private handleHumanPick(action: DraftAction): DraftState {
    if (action.type !== 'HUMAN_PICK') throw new Error('Invalid action type');

    const draft = this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error('Draft not found');

    return this.handlePlayerPick(draft, draft.humanPlayerIndex, action.payload.cardId, action);
  }

  private handleBotPick(action: DraftAction): DraftState {
    if (action.type !== 'BOT_PICK') throw new Error('Invalid action type');

    const draft = this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error('Draft not found');

    return this.handlePlayerPick(draft, action.payload.playerIndex, action.payload.cardId, action);
  }

  private handlePlayerPick(draft: DraftState, playerIndex: number, cardId: string, action: DraftAction): DraftState {
    const updatedDraft = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];

    // Add card to player's deck
    if (!updatedDraft.playerDecks[playerIndex]) {
      updatedDraft.playerDecks[playerIndex] = [];
    }
    updatedDraft.playerDecks[playerIndex] = [...updatedDraft.playerDecks[playerIndex], cardId];

    // Remove card from current pack
    const currentPacks = updatedDraft.packs[updatedDraft.currentRound];
    if (currentPacks && currentPacks[playerIndex]) {
      const pack = currentPacks[playerIndex];
      const updatedCards = pack.cards.filter(card => card.id !== cardId);
      
      updatedDraft.packs[updatedDraft.currentRound] = {
        ...currentPacks,
        [playerIndex]: {
          ...pack,
          cards: updatedCards,
        },
      };
    }

    this.state.drafts[draft.draftId] = updatedDraft;
    return updatedDraft;
  }

  private handlePassPacks(action: DraftAction): DraftState {
    if (action.type !== 'PASS_PACKS') throw new Error('Invalid action type');

    const draft = this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error('Draft not found');

    const updatedDraft = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];

    // Pass packs according to current round direction
    const direction = updatedDraft.packPassDirection[updatedDraft.currentRound];
    const currentPacks = updatedDraft.packs[updatedDraft.currentRound];
    
    if (currentPacks) {
      const newPacks: BoosterPack[] = [];
      
      for (let i = 0; i < updatedDraft.playerCount; i++) {
        const sourceIndex = direction === 'left' 
          ? (i + 1) % updatedDraft.playerCount
          : (i - 1 + updatedDraft.playerCount) % updatedDraft.playerCount;
        
        newPacks[i] = currentPacks[sourceIndex];
      }
      
      updatedDraft.packs[updatedDraft.currentRound] = newPacks;
    }

    this.state.drafts[draft.draftId] = updatedDraft;
    return updatedDraft;
  }

  private handleAdvancePosition(action: DraftAction): DraftState {
    if (action.type !== 'ADVANCE_POSITION') throw new Error('Invalid action type');

    const draft = this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error('Draft not found');

    const updatedDraft = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];
    updatedDraft.currentRound = action.payload.newRound;
    updatedDraft.currentPick = action.payload.newPick;

    this.state.drafts[draft.draftId] = updatedDraft;
    return updatedDraft;
  }

  private handleStartRound(action: DraftAction): DraftState {
    if (action.type !== 'START_ROUND') throw new Error('Invalid action type');

    const draft = this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error('Draft not found');

    const updatedDraft = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];

    // Generate packs for the new round
    updatedDraft.packs[action.payload.round] = this.generatePacksForRound(draft, action.payload.round);

    this.state.drafts[draft.draftId] = updatedDraft;
    return updatedDraft;
  }

  private handleCompleteDraft(action: DraftAction): DraftState {
    if (action.type !== 'COMPLETE_DRAFT') throw new Error('Invalid action type');

    const draft = this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error('Draft not found');

    const updatedDraft = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];
    updatedDraft.status = 'completed';

    this.state.drafts[draft.draftId] = updatedDraft;
    return updatedDraft;
  }

  // Helper methods

  private createInitialDraftState(
    draftId: string,
    seed: string,
    setCode: string,
    playerCount: number,
    humanPlayerIndex: number
  ): DraftState {
    return {
      draftId,
      seed,
      setCode,
      status: 'created',
      playerCount,
      humanPlayerIndex,
      currentRound: 1,
      currentPick: 1,
      packs: {},
      playerDecks: {},
      actionHistory: [],
      packPassDirection: {
        1: 'left',  // Round 1: pass left
        2: 'right', // Round 2: pass right  
        3: 'left',  // Round 3: pass left
      },
    };
  }

  private generatePacksForRound(draft: DraftState, round: number): BoosterPack[] {
    const setData = this.state.setData[draft.setCode];
    if (!setData) {
      throw new Error(`Set data not found: ${draft.setCode}`);
    }

    const packGenerator = new PackGenerator(setData, `${draft.seed}_round_${round}`);
    return packGenerator.generatePacks(draft.playerCount, `${draft.seed}_round_${round}`);
  }

  private applyActionToState(state: DraftState, action: DraftAction): DraftState {
    // Temporarily set state for action processing
    const originalDraft = this.state.drafts[state.draftId];
    this.state.drafts[state.draftId] = state;
    
    const result = this.applyAction(action);
    
    // Restore original state
    if (originalDraft) {
      this.state.drafts[state.draftId] = originalDraft;
    }
    
    return result;
  }
}