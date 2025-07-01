/**
 * Draft Engine - Pure Event-Sourced State Machine
 *
 * Core draft logic with zero dependencies.
 * All state changes go through actions for perfect reproducibility.
 */

import type { DraftAction } from "./actions";
import {
  PackGenerator,
  type Card,
  type SetData,
  type BoosterPack,
} from "./packGenerator";
import { SeededRandom } from "./seededRandom";
import type { DraftStorageAdapter } from "./storage/DraftStorageAdapter";

export interface DraftState {
  draftId: string;
  seed: string;
  setCode: string;
  status: "created" | "active" | "completed";

  // Draft configuration
  playerCount: number;
  humanPlayerIndex: number;

  // Current position
  currentRound: number; // 1, 2, 3
  currentPick: number; // 1-15

  // Packs and cards
  packs: Record<number, Record<number, BoosterPack>>; // round -> packs for each player
  playerDecks: Record<number, string[]>; // playerIndex -> cardIds

  // Action history for reproducibility
  actionHistory: DraftAction[];

  // Draft flow
  packPassDirection: Record<number, "left" | "right">; // round -> direction
}

export interface DraftEngineState {
  drafts: Record<string, DraftState>;
  setData: Record<string, SetData>;
}

export class DraftEngine {
  private state: DraftEngineState;
  private storage?: DraftStorageAdapter;

  constructor(storage?: DraftStorageAdapter) {
    this.state = {
      drafts: {},
      setData: {},
    };

    if (storage) {
      this.setStorage(storage);
    }
  }

  /**
   * Set storage adapter for persistence
   */
  setStorage(storage: DraftStorageAdapter): void {
    this.storage = storage;

    // Set up error handling
    storage.onError((error) => {
      console.error("Draft storage error:", error);
    });
  }

  /**
   * Get current storage adapter
   */
  getStorage(): DraftStorageAdapter | undefined {
    return this.storage;
  }

  /**
   * Load set data for pack generation
   */
  loadSetData(setData: SetData): void {
    this.state.setData[setData.setCode] = setData;
  }

  /**
   * Get loaded set data by set code
   */
  getSetData(setCode: string): SetData | null {
    return this.state.setData[setCode] || null;
  }

  /**
   * Apply an action to update state
   */
  applyAction(action: DraftAction): DraftState {
    // Check if action has proper payload structure
    if (!action.payload) {
      throw new Error(`Unknown action type: ${(action as any).type}`);
    }

    const currentState =
      action.type === "CREATE_DRAFT"
        ? undefined
        : this.state.drafts[action.payload.draftId];
    const newState = this.applyActionToState(currentState, action);

    // Update in-memory state
    this.state.drafts[newState.draftId] = newState;

    // Auto-save only on human actions to avoid excessive saves
    if (this.storage && this.shouldAutoSave(action)) {
      this.storage.saveDraft(newState).catch((error) => {
        console.error("Storage failed:", error);
        // Continue anyway - draft is in memory
      });
    }

    return newState;
  }

  /**
   * Apply action to state (pure function for testing)
   */
  applyActionToState(
    currentState: DraftState | undefined,
    action: DraftAction,
  ): DraftState {
    switch (action.type) {
      case "CREATE_DRAFT":
        return this.handleCreateDraft(action);
      case "START_DRAFT":
        return this.handleStartDraft(action, currentState);
      case "HUMAN_PICK":
        return this.handleHumanPick(action, currentState);
      case "BOT_PICK":
        return this.handleBotPick(action, currentState);
      case "PASS_PACKS":
        return this.handlePassPacks(action, currentState);
      case "ADVANCE_POSITION":
        return this.handleAdvancePosition(action, currentState);
      case "START_ROUND":
        return this.handleStartRound(action, currentState);
      case "COMPLETE_DRAFT":
        return this.handleCompleteDraft(action, currentState);
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Determine if action should trigger auto-save
   */
  private shouldAutoSave(action: DraftAction): boolean {
    // Only save on human actions and key state transitions
    return [
      "HUMAN_PICK",
      "CREATE_DRAFT",
      "START_DRAFT",
      "COMPLETE_DRAFT",
    ].includes(action.type);
  }

  /**
   * Replay actions from history to reach specific state
   */
  replayToPosition(
    draftId: string,
    targetRound: number,
    targetPick: number,
  ): DraftState {
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
      draft.humanPlayerIndex,
    );

    // Replay actions until we reach target position
    let currentState = initialDraft;
    for (const action of draft.actionHistory) {
      currentState = this.applyActionToState(currentState, action);

      // Stop if we've reached the target position
      if (
        currentState.currentRound >= targetRound &&
        currentState.currentPick >= targetPick
      ) {
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

  /**
   * Load draft from storage
   */
  async loadDraft(draftId: string): Promise<DraftState | null> {
    if (!this.storage) {
      return this.state.drafts[draftId] || null;
    }

    try {
      const draft = await this.storage.loadDraft(draftId);
      if (draft) {
        // Store in memory for faster access
        this.state.drafts[draftId] = draft;
      }
      return draft;
    } catch (error) {
      console.error(`Failed to load draft ${draftId}:`, error);
      return null;
    }
  }

  /**
   * Save draft to storage
   */
  async saveDraft(draftId: string): Promise<void> {
    if (!this.storage) return;

    const draft = this.state.drafts[draftId];
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    try {
      await this.storage.saveDraft(draft);
    } catch (error) {
      console.error(`Failed to save draft ${draftId}:`, error);
      throw error;
    }
  }

  /**
   * Delete draft from storage and memory
   */
  async deleteDraft(draftId: string): Promise<void> {
    // Remove from memory
    delete this.state.drafts[draftId];

    // Remove from storage
    if (this.storage) {
      try {
        await this.storage.deleteDraft(draftId);
      } catch (error) {
        console.error(`Failed to delete draft ${draftId}:`, error);
        throw error;
      }
    }
  }

  /**
   * List all drafts from storage
   */
  async listDrafts() {
    if (!this.storage) {
      // Return in-memory drafts as summaries
      return Object.values(this.state.drafts).map((draft) => ({
        draftId: draft.draftId,
        seed: draft.seed,
        setCode: draft.setCode,
        status: draft.status,
        currentRound: draft.currentRound,
        currentPick: draft.currentPick,
        playerCount: draft.playerCount,
        humanPlayerIndex: draft.humanPlayerIndex,
        lastModified: Date.now(),
        cardCount: draft.playerDecks[draft.humanPlayerIndex]?.length || 0,
      }));
    }

    try {
      return await this.storage.listDrafts();
    } catch (error) {
      console.error("Failed to list drafts:", error);
      return [];
    }
  }

  /**
   * Get storage audit information
   */
  async getStorageAudit() {
    if (!this.storage) return null;

    try {
      return await this.storage.getStorageAudit();
    } catch (error) {
      console.error("Failed to get storage audit:", error);
      return null;
    }
  }

  /**
   * Cleanup old drafts
   */
  async cleanupStorage(options?: { maxAge?: number; maxDrafts?: number }) {
    if (!this.storage) return 0;

    try {
      return await this.storage.cleanup(options);
    } catch (error) {
      console.error("Failed to cleanup storage:", error);
      return 0;
    }
  }

  // Private action handlers

  private handleCreateDraft(action: DraftAction): DraftState {
    if (action.type !== "CREATE_DRAFT") throw new Error("Invalid action type");

    const { draftId, seed, setCode, playerCount, humanPlayerIndex } =
      action.payload;

    const draft = this.createInitialDraftState(
      draftId,
      seed,
      setCode,
      playerCount,
      humanPlayerIndex,
    );
    draft.actionHistory.push(action);

    return draft;
  }

  private handleStartDraft(
    action: DraftAction,
    currentState?: DraftState,
  ): DraftState {
    if (action.type !== "START_DRAFT") throw new Error("Invalid action type");

    const draft = currentState || this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error("Draft not found");

    const updatedDraft = { ...draft };
    updatedDraft.status = "active";
    updatedDraft.actionHistory = [...draft.actionHistory, action];

    // Generate initial packs for round 1
    updatedDraft.packs[1] = this.generatePacksForRound(draft, 1);

    return updatedDraft;
  }

  private handleHumanPick(
    action: DraftAction,
    currentState?: DraftState,
  ): DraftState {
    if (action.type !== "HUMAN_PICK") throw new Error("Invalid action type");

    const draft = currentState || this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error("Draft not found");

    return this.handlePlayerPick(
      draft,
      draft.humanPlayerIndex,
      action.payload.cardId,
      action,
    );
  }

  private handleBotPick(
    action: DraftAction,
    currentState?: DraftState,
  ): DraftState {
    if (action.type !== "BOT_PICK") throw new Error("Invalid action type");

    const draft = currentState || this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error("Draft not found");

    return this.handlePlayerPick(
      draft,
      action.payload.playerIndex,
      action.payload.cardId,
      action,
    );
  }

  private handlePlayerPick(
    draft: DraftState,
    playerIndex: number,
    cardId: string,
    action: DraftAction,
  ): DraftState {
    const updatedDraft: DraftState = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];

    // Add card to player's deck
    if (!updatedDraft.playerDecks[playerIndex]) {
      updatedDraft.playerDecks[playerIndex] = [];
    }
    updatedDraft.playerDecks[playerIndex] = [
      ...updatedDraft.playerDecks[playerIndex],
      cardId,
    ];

    // Remove card from current pack
    const currentPacks = updatedDraft.packs[updatedDraft.currentRound];
    if (currentPacks && currentPacks[playerIndex]) {
      const pack = currentPacks[playerIndex];
      const updatedCards = pack.cards.filter((card) => card.id !== cardId);

      updatedDraft.packs[updatedDraft.currentRound] = {
        ...currentPacks,
        [playerIndex]: {
          ...pack,
          cards: updatedCards,
        },
      };
    }

    // Auto-advance: Check if all players have made their pick for this position
    const finalDraft = this.autoAdvanceIfReady(updatedDraft);

    this.state.drafts[draft.draftId] = finalDraft;
    return finalDraft;
  }

  /**
   * Auto-advance engine progression after picks if all players have picked
   */
  private autoAdvanceIfReady(draft: DraftState): DraftState {
    // Check if all players have picked for current position
    const currentPacks = draft.packs[draft.currentRound];
    if (!currentPacks) return draft;

    // Calculate expected number of cards remaining after all players pick
    const expectedCardsRemaining = 15 - draft.currentPick;
    
    // Check if all players have the expected number of cards
    // (meaning they've all picked for this position)
    const allPlayersHavePicked = Object.keys(currentPacks).every((key: string) => {
      const pack = currentPacks[Number(key)];
      return pack && pack.cards.length === expectedCardsRemaining;
    });

    if (allPlayersHavePicked) {
      // All players have picked - advance to next position
      return this.advanceToNextPosition(draft);
    }

    // Still waiting for other players to pick
    return draft;
  }

  /**
   * Advance to next position in the draft
   */
  private advanceToNextPosition(draft: DraftState): DraftState {
    let updatedDraft = { ...draft };

    // Advance pick number
    if (updatedDraft.currentPick < 15) {
      // Move to next pick in same round
      updatedDraft.currentPick += 1;

      // Pass packs after each pick
      updatedDraft = this.handlePassPacks(
        {
          type: "PASS_PACKS",
          payload: { draftId: draft.draftId },
          timestamp: Date.now(),
        },
        updatedDraft,
      );
    } else if (updatedDraft.currentRound < 3) {
      // Move to next round
      updatedDraft.currentRound += 1;
      updatedDraft.currentPick = 1;

      // Start new round (generates new packs)
      updatedDraft = this.handleStartRound(
        {
          type: "START_ROUND",
          payload: {
            draftId: draft.draftId,
            round: updatedDraft.currentRound,
          },
          timestamp: Date.now(),
        },
        updatedDraft,
      );
    } else {
      // Draft complete
      updatedDraft = this.handleCompleteDraft(
        {
          type: "COMPLETE_DRAFT",
          payload: { draftId: draft.draftId },
          timestamp: Date.now(),
        },
        updatedDraft,
      );
    }

    // Add advancement action to history
    const advanceAction: DraftAction = {
      type: "ADVANCE_POSITION",
      payload: {
        draftId: draft.draftId,
        newRound: updatedDraft.currentRound,
        newPick: updatedDraft.currentPick,
      },
      timestamp: Date.now(),
    };
    updatedDraft.actionHistory = [...updatedDraft.actionHistory, advanceAction];

    return updatedDraft;
  }

  private handlePassPacks(
    action: DraftAction,
    currentState?: DraftState,
  ): DraftState {
    if (action.type !== "PASS_PACKS") throw new Error("Invalid action type");

    const draft = currentState || this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error("Draft not found");

    const updatedDraft = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];

    // Pass packs according to current round direction
    const direction = updatedDraft.packPassDirection[updatedDraft.currentRound];
    const currentPacks = updatedDraft.packs[updatedDraft.currentRound];

    if (currentPacks) {
      const newPacks: Record<number, BoosterPack> = {};

      for (let i = 0; i < updatedDraft.playerCount; i++) {
        const sourceIndex =
          direction === "left"
            ? (i + 1) % updatedDraft.playerCount
            : (i - 1 + updatedDraft.playerCount) % updatedDraft.playerCount;

        // Deep clone the pack to avoid reference issues
        const sourcePack = currentPacks[sourceIndex];
        if (sourcePack) {
          newPacks[i] = {
            ...sourcePack,
            cards: [...sourcePack.cards]
          };
        }
      }

      updatedDraft.packs[updatedDraft.currentRound] = newPacks;
      
    }

    return updatedDraft;
  }

  private handleAdvancePosition(
    action: DraftAction,
    currentState?: DraftState,
  ): DraftState {
    if (action.type !== "ADVANCE_POSITION")
      throw new Error("Invalid action type");

    const draft = currentState || this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error("Draft not found");

    const updatedDraft = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];
    updatedDraft.currentRound = action.payload.newRound;
    updatedDraft.currentPick = action.payload.newPick;

    return updatedDraft;
  }

  private handleStartRound(
    action: DraftAction,
    currentState?: DraftState,
  ): DraftState {
    if (action.type !== "START_ROUND") throw new Error("Invalid action type");

    const draft = currentState || this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error("Draft not found");

    const updatedDraft = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];

    // Generate packs for the new round
    updatedDraft.packs[action.payload.round] = this.generatePacksForRound(
      draft,
      action.payload.round,
    );

    return updatedDraft;
  }

  private handleCompleteDraft(
    action: DraftAction,
    currentState?: DraftState,
  ): DraftState {
    if (action.type !== "COMPLETE_DRAFT")
      throw new Error("Invalid action type");

    const draft = currentState || this.state.drafts[action.payload.draftId];
    if (!draft) throw new Error("Draft not found");

    const updatedDraft = { ...draft };
    updatedDraft.actionHistory = [...draft.actionHistory, action];
    updatedDraft.status = "completed";

    return updatedDraft;
  }

  // Helper methods

  private createInitialDraftState(
    draftId: string,
    seed: string,
    setCode: string,
    playerCount: number,
    humanPlayerIndex: number,
  ): DraftState {
    return {
      draftId,
      seed,
      setCode,
      status: "created",
      playerCount,
      humanPlayerIndex,
      currentRound: 1,
      currentPick: 1,
      packs: {},
      playerDecks: {},
      actionHistory: [],
      packPassDirection: {
        1: "left", // Round 1: pass left
        2: "right", // Round 2: pass right
        3: "left", // Round 3: pass left
      },
    };
  }

  private generatePacksForRound(
    draft: DraftState,
    round: number,
  ): BoosterPack[] {
    const setData = this.state.setData[draft.setCode];
    if (!setData) {
      throw new Error(`Set data not found: ${draft.setCode}`);
    }

    const packGenerator = new PackGenerator(
      setData,
      `${draft.seed}_round_${round}`,
    );
    return packGenerator.generatePacks(
      draft.playerCount,
      `${draft.seed}_round_${round}`,
    );
  }
}

