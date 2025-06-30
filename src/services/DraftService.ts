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
import type { DraftStorage } from './DraftStorage';
import { draftStorage } from './DraftStorage';

export interface DraftServiceConfig {
  // Storage for persisting draft action history
  storage?: DraftStorage;
  // Set data loader - will be implemented with API integration
  setDataLoader?: SetDataLoader;
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
  private storage: DraftStorage;
  private setDataLoader?: SetDataLoader;

  constructor(config: DraftServiceConfig = {}) {
    this.storage = config.storage || draftStorage;
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
  async makeHumanPick(currentState: SeededDraftState, cardId: string): Promise<SeededDraftState> {
    // Load current action history for persistence
    const { actions } = await this.loadState(currentState.seed);
    
    // Create sequence of actions for complete pick cycle
    const pickActions: DraftAction[] = [
      { type: 'HUMAN_PICK', cardId },
      ...this.generateBotPickActions(currentState),
      { type: 'PASS_PACKS' }
    ];
    
    // Apply all actions in sequence
    let newState = currentState;
    for (const action of pickActions) {
      newState = applyAction(newState, action);
    }
    
    // Check if we need to advance round or complete draft
    const completionActions = this.generateCompletionActions(newState);
    for (const action of completionActions) {
      newState = applyAction(newState, action);
    }
    
    // Update position (pick number)
    newState = {
      ...newState,
      pick: newState.pick + 1,
      lastModified: Date.now()
    };
    
    // Save all actions
    const allNewActions = [...pickActions, ...completionActions];
    const updatedActions = [...actions, ...allNewActions];
    await this.saveState(newState, updatedActions);
    
    return newState;
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

  /**
   * Get list of all stored drafts
   * Returns metadata for UI display
   */
  async getDraftList() {
    return this.storage.list();
  }

  /**
   * Delete a draft
   * Removes from storage completely
   */
  async deleteDraft(seed: string): Promise<boolean> {
    return this.storage.delete(seed);
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
    // For now, return mock data with cards for testing
    return {
      set_code: setCode,
      name: `Mock Set ${setCode}`,
      cards: this.generateMockCards(setCode)
    };
  }

  /**
   * Generate mock cards for testing
   * Uses set code as seed for deterministic generation
   */
  private generateMockCards(setCode: string): any[] {
    const cards: any[] = [];
    
    // Generate commons (60% of set)
    for (let i = 1; i <= 120; i++) {
      cards.push({
        id: `${setCode.toLowerCase()}-common-${i}`,
        name: `${['Lightning', 'Stone', 'Giant', 'Dark', 'Healing'][i % 5]} ${['Bolt', 'Rain', 'Growth', 'Ritual', 'Salve'][Math.floor(i / 5) % 5]}`,
        mana_cost: `{${Math.floor(i % 4) + 1}}`,
        rarity: 'common',
        booster: true,
        colors: [['W'], ['U'], ['B'], ['R'], ['G']][i % 5],
        cmc: Math.floor(i % 4) + 1,
        type_line: 'Instant'
      });
    }
    
    // Generate uncommons (30% of set)  
    for (let i = 1; i <= 60; i++) {
      cards.push({
        id: `${setCode.toLowerCase()}-uncommon-${i}`,
        name: `${['Elite', 'Royal', 'Master', 'Ancient', 'Fierce'][i % 5]} ${['Dragon', 'Angel', 'Demon', 'Phoenix', 'Hydra'][Math.floor(i / 5) % 5]}`,
        mana_cost: `{${Math.floor(i % 3) + 2}}{${['W', 'U', 'B', 'R', 'G'][i % 5]}}`,
        rarity: 'uncommon',
        booster: true,
        colors: [['W'], ['U'], ['B'], ['R'], ['G']][i % 5],
        cmc: Math.floor(i % 3) + 3,
        type_line: 'Creature'
      });
    }
    
    // Generate rares (8% of set)
    for (let i = 1; i <= 15; i++) {
      cards.push({
        id: `${setCode.toLowerCase()}-rare-${i}`,
        name: `Legendary ${['Planeswalker', 'Creature', 'Artifact', 'Enchantment', 'Sorcery'][i % 5]}`,
        mana_cost: `{${Math.floor(i % 2) + 4}}{${['W', 'U', 'B', 'R', 'G'][i % 5]}}`,
        rarity: 'rare',
        booster: true,
        colors: [['W'], ['U'], ['B'], ['R'], ['G']][i % 5],
        cmc: Math.floor(i % 2) + 5,
        type_line: 'Legendary Creature'
      });
    }
    
    // Generate mythics (2% of set)
    for (let i = 1; i <= 5; i++) {
      cards.push({
        id: `${setCode.toLowerCase()}-mythic-${i}`,
        name: `Planeswalker ${['Chandra', 'Jace', 'Liliana', 'Garruk', 'Ajani'][i - 1]}`,
        mana_cost: `{${i + 3}}{${['R', 'U', 'B', 'G', 'W'][i - 1]}}`,
        rarity: 'mythic',
        booster: true,
        colors: [['R'], ['U'], ['B'], ['G'], ['W']][i - 1],
        cmc: i + 4,
        type_line: 'Legendary Planeswalker'
      });
    }

    console.log(`[DraftService] Generated ${cards.length} mock cards for set ${setCode}`);
    return cards;
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
    await this.storage.save(state.seed, actions);
  }

  /**
   * Load state and action history
   */
  private async loadState(seed: string): Promise<{ state: SeededDraftState; actions: DraftAction[] }> {
    const stored = await this.storage.load(seed);
    if (stored) {
      const state = await this.replayFromSeed(seed, stored.actions);
      return { state, actions: stored.actions };
    }
    
    throw new Error(`Draft with seed ${seed} not found`);
  }
}

/**
 * Default service instance
 * Can be configured with storage and data loaders
 */
export const draftService = new DraftService();