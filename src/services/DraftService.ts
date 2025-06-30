/**
 * Draft Service - Core Business Logic Layer
 * 
 * Single source of truth for all draft operations.
 * Handles data loading, action sequencing, and state persistence.
 * Pure business logic with no UI dependencies.
 */

import type { DraftAction } from './types/DraftActions';
import { applyAction } from './applyAction';
import type { SeededDraftState, MTGSetData } from '../shared/types/seededDraftState';
import { generateUniqueId } from '../shared/utils/seededPackGenerator';

export interface DraftServiceConfig {
  // Storage abstraction - will be implemented in Phase 5
  storage?: DraftStorage;
  // Set data loader - will be implemented with API integration
  setDataLoader?: SetDataLoader;
}

// Storage interface for Phase 5
interface DraftStorage {
  save(seed: string, actions: DraftAction[]): Promise<void>;
  load(seed: string): Promise<{ actions: DraftAction[] } | null>;
  list(): Promise<string[]>;
  delete(seed: string): Promise<boolean>;
}

// Set data loader interface
interface SetDataLoader {
  load(setCode: string): Promise<MTGSetData>;
}

/**
 * Main Draft Service Class
 * 
 * Coordinates all draft operations:
 * 1. Load external data (sets, AI models)
 * 2. Apply business logic through actions
 * 3. Persist state changes
 * 4. Handle navigation between positions
 */
export class DraftService {
  private storage?: DraftStorage;
  private setDataLoader?: SetDataLoader;

  constructor(config: DraftServiceConfig = {}) {
    this.storage = config.storage;
    this.setDataLoader = config.setDataLoader;
  }

  /**
   * Create a new draft from a set code
   * Returns complete initial state ready for UI
   */
  async createDraft(setCode: string): Promise<SeededDraftState> {
    // 1. Load set data from external source
    const setData = await this.loadSetData(setCode);
    
    // 2. Generate unique seed for deterministic replay
    const seed = generateUniqueId();
    
    // 3. Create initial state
    const initialState: SeededDraftState = {
      seed,
      status: 'setup',
      round: 1,
      pick: 1,
      direction: 'clockwise',
      players: [],
      setCode,
      setData: null, // Will be set by action
      allPacks: [],
      lastModified: Date.now()
    };
    
    // 4. Apply CREATE_DRAFT action with loaded set data
    const action: DraftAction = { type: 'CREATE_DRAFT', setCode };
    const newState = applyAction(initialState, action, { setData });
    
    // 5. Persist the seed and initial action
    await this.saveState(newState, [action]);
    
    return newState;
  }

  /**
   * Start an existing draft
   * Distributes initial packs to all players
   */
  async startDraft(seed: string): Promise<SeededDraftState> {
    const { state, actions } = await this.loadState(seed);
    
    const action: DraftAction = { type: 'START_DRAFT' };
    const newState = applyAction(state, action);
    
    const newActions = [...actions, action];
    await this.saveState(newState, newActions);
    
    return newState;
  }

  /**
   * Process a human pick
   * This is the main user interaction - handles complete pick sequence:
   * 1. Human picks card
   * 2. All bots make their picks
   * 3. Packs get passed
   * 4. Position advances
   * 5. Check for round/draft completion
   */
  async makeHumanPick(seed: string, cardId: string): Promise<SeededDraftState> {
    const { state, actions } = await this.loadState(seed);
    
    // Create sequence of actions for complete pick cycle
    const pickActions: DraftAction[] = [
      { type: 'HUMAN_PICK', cardId },
      ...this.generateBotPickActions(state),
      { type: 'PASS_PACKS' }
    ];
    
    // Apply all actions in sequence
    let currentState = state;
    for (const action of pickActions) {
      currentState = applyAction(currentState, action);
    }
    
    // Check if we need to advance round or complete draft
    const completionActions = this.generateCompletionActions(currentState);
    for (const action of completionActions) {
      currentState = applyAction(currentState, action);
    }
    
    // Update position (pick number)
    currentState = {
      ...currentState,
      pick: currentState.pick + 1,
      lastModified: Date.now()
    };
    
    // Save all actions
    const allNewActions = [...pickActions, ...completionActions];
    const updatedActions = [...actions, ...allNewActions];
    await this.saveState(currentState, updatedActions);
    
    return currentState;
  }

  /**
   * Navigate to a specific position in the draft
   * Replays from seed up to the target position
   */
  async navigateToPosition(seed: string, round: number, pick: number): Promise<SeededDraftState> {
    const { actions } = await this.loadState(seed);
    
    // Calculate target position (1-based)
    const targetPosition = (round - 1) * 15 + pick;
    
    // Find actions that should be applied to reach this position
    const actionsToApply = this.getActionsUpToPosition(actions, targetPosition);
    
    // Replay from seed
    return this.replayFromSeed(seed, actionsToApply);
  }

  /**
   * Get current draft state without modifications
   * Useful for UI reads
   */
  async getCurrentState(seed: string): Promise<SeededDraftState> {
    const { state } = await this.loadState(seed);
    return state;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Load set data from external source
   * For now, this is a placeholder - will be implemented with API integration
   */
  private async loadSetData(setCode: string): Promise<MTGSetData> {
    if (this.setDataLoader) {
      return this.setDataLoader.load(setCode);
    }
    
    // TODO: Implement API call to load set data
    // For now, return mock data structure
    return {
      set_code: setCode,
      name: `Mock Set ${setCode}`,
      cards: []
    };
  }

  /**
   * Generate bot pick actions for current state
   * Each bot makes exactly one pick
   */
  private generateBotPickActions(state: SeededDraftState): DraftAction[] {
    const botActions: DraftAction[] = [];
    
    for (const player of state.players) {
      if (!player.isHuman && player.currentPack && player.currentPack.cards.length > 0) {
        // Simple bot logic - pick first card
        // TODO: Implement actual AI decision making
        const cardId = player.currentPack.cards[0].id;
        botActions.push({
          type: 'BOT_PICK',
          playerId: player.id,
          cardId
        });
      }
    }
    
    return botActions;
  }

  /**
   * Generate actions for round/draft completion
   */
  private generateCompletionActions(state: SeededDraftState): DraftAction[] {
    const actions: DraftAction[] = [];
    
    // Check if round is complete (pick 16 means we've done picks 1-15)
    if (state.pick > 15) {
      if (state.round >= 3) {
        // Draft complete
        actions.push({ type: 'COMPLETE_DRAFT' });
      } else {
        // Start next round
        actions.push({ type: 'START_ROUND', round: state.round + 1 });
      }
    }
    
    return actions;
  }

  /**
   * Get actions needed to reach a specific position
   */
  private getActionsUpToPosition(actions: DraftAction[], targetPosition: number): DraftAction[] {
    // This is a simplified implementation
    // In full implementation, we'd track pick positions more precisely
    const humanPicks = actions.filter(a => a.type === 'HUMAN_PICK').length;
    
    if (targetPosition <= humanPicks + 1) {
      // Find the actions that led to this position
      const actionsToApply: DraftAction[] = [];
      let pickCount = 0;
      
      for (const action of actions) {
        actionsToApply.push(action);
        
        if (action.type === 'HUMAN_PICK') {
          pickCount++;
          if (pickCount >= targetPosition - 1) {
            break;
          }
        }
      }
      
      return actionsToApply;
    }
    
    return actions;
  }

  /**
   * Replay state from seed by applying actions
   */
  private async replayFromSeed(seed: string, actions: DraftAction[]): Promise<SeededDraftState> {
    // Create initial state
    const initialState: SeededDraftState = {
      seed,
      status: 'setup',
      round: 1,
      pick: 1,
      direction: 'clockwise',
      players: [],
      setCode: '', // Will be set by first action
      setData: null,
      allPacks: [],
      lastModified: Date.now()
    };
    
    // Apply each action in sequence
    let currentState = initialState;
    for (const action of actions) {
      if (action.type === 'CREATE_DRAFT') {
        // Load set data for CREATE_DRAFT action
        const setData = await this.loadSetData(action.setCode);
        currentState = applyAction(currentState, action, { setData });
      } else {
        currentState = applyAction(currentState, action);
      }
    }
    
    return currentState;
  }

  /**
   * Save state and action history
   */
  private async saveState(state: SeededDraftState, actions: DraftAction[]): Promise<void> {
    if (this.storage) {
      await this.storage.save(state.seed, actions);
    }
    // TODO: Implement localStorage fallback for Phase 2
  }

  /**
   * Load state and action history
   */
  private async loadState(seed: string): Promise<{ state: SeededDraftState; actions: DraftAction[] }> {
    if (this.storage) {
      const stored = await this.storage.load(seed);
      if (stored) {
        const state = await this.replayFromSeed(seed, stored.actions);
        return { state, actions: stored.actions };
      }
    }
    
    // TODO: Implement localStorage fallback for Phase 2
    throw new Error(`Draft with seed ${seed} not found`);
  }
}

/**
 * Default service instance
 * Can be configured with storage and data loaders
 */
export const draftService = new DraftService();