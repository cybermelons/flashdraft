/**
 * DraftSession - Core draft logic implementation
 * 
 * Pure TypeScript class that manages MTG draft state and flow.
 * All state changes happen through validated actions.
 */

import type { 
  DraftSession as IDraftSession, 
  DraftState, 
  DraftAction, 
  DraftConfig,
  Player, 
  Pack, 
  Card, 
  DraftStatus,
  BotPersonality,
  MTGSetData,
  SerializedDraft
} from './types/core';
import type { ActionResult, DraftError } from './types/errors';
import { 
  validateMakePick, 
  validateStartDraft, 
  validateAddPlayer,
  getPlayer,
  getCurrentPackForPlayer,
  isPlayerTurn,
  getPlayersNeedingPicks,
  getBotPlayersNeedingPicks,
  isDraftComplete,
  shouldPassPacks,
  shouldAdvanceRound
} from './validation/rules';
import { generatePacksForDraft } from './generators/PackGenerator';
import { BotProcessor, createBotProcessor, type BotDecision } from './bots/DraftBot';
import { DraftSerializer, createDraftSerializer, type SerializationOptions } from './serialization/DraftSerializer';

export class DraftSession implements IDraftSession {
  private readonly botProcessor: BotProcessor;
  private readonly serializer: DraftSerializer;
  
  constructor(private readonly _state: DraftState) {
    this.botProcessor = createBotProcessor();
    this.serializer = createDraftSerializer();
  }

  // ============================================================================
  // FACTORY METHODS
  // ============================================================================

  static create(config: DraftConfig): DraftSession {
    const state: DraftState = {
      id: generateId(),
      config,
      players: [],
      packs: [], // Will be generated when draft starts
      currentRound: 1,
      currentPick: 1,
      direction: 'clockwise',
      status: 'setup',
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return new DraftSession(state);
  }

  static deserialize(data: string): ActionResult<DraftSession> {
    const serializer = createDraftSerializer();
    
    // First deserialize and validate the data
    const deserializeResult = serializer.deserialize(data);
    if (!deserializeResult.success) {
      return deserializeResult as ActionResult<DraftSession>;
    }
    
    const saved = deserializeResult.data;
    
    try {
      // Create session with original ID
      const state: DraftState = {
        id: saved.id,
        config: saved.config,
        players: [],
        packs: [],
        currentRound: 1,
        currentPick: 1,
        direction: 'clockwise',
        status: 'setup',
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      let session = new DraftSession(state);
      
      // Replay all actions to restore state
      for (const action of saved.history) {
        const result = session.applyAction(action);
        if (!result.success) {
          return {
            success: false,
            error: {
              type: 'DESERIALIZATION_ERROR',
              message: `Failed to replay action: ${result.error.message}`,
              details: `Action: ${action.type}`
            }
          };
        }
        session = result.data;
      }
      
      return { success: true, data: session };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'DESERIALIZATION_ERROR',
          message: 'Failed to reconstruct draft session',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // ============================================================================
  // STATE ACCESS
  // ============================================================================

  get state(): DraftState {
    return this._state;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  getCurrentPack(playerId: string): Pack | null {
    return getCurrentPackForPlayer(this._state, playerId);
  }

  getPlayerCards(playerId: string): Card[] {
    const player = getPlayer(this._state, playerId);
    return player?.pickedCards || [];
  }

  getAvailableActions(playerId: string): DraftAction[] {
    const actions: DraftAction[] = [];
    
    // Always allow undo during active draft (for development/testing)
    if (this._state.status === 'active' && this._state.history.length > 0) {
      actions.push({ type: 'UNDO_LAST_ACTION' });
    }

    // Can add players during setup
    if (this._state.status === 'setup' && this._state.players.length < 8) {
      // Note: actual player details would be provided when creating the action
      actions.push({ 
        type: 'ADD_PLAYER', 
        playerId: 'placeholder', 
        name: 'placeholder', 
        isHuman: false 
      });
    }

    // Can start draft if in setup with enough players
    if (this._state.status === 'setup' && this._state.players.length >= 2) {
      actions.push({ type: 'START_DRAFT' });
    }

    // Can make pick if it's the player's turn
    const pack = this.getCurrentPack(playerId);
    if (pack && pack.cards.length > 0) {
      const player = getPlayer(this._state, playerId);
      if (player && (player.isHuman ? isPlayerTurn(this._state, playerId) : !player.isHuman)) {
        // Return potential pick actions for all available cards
        pack.cards.forEach(card => {
          actions.push({
            type: 'MAKE_PICK',
            playerId,
            cardId: card.id
          });
        });
      }
    }

    return actions;
  }

  canMakePick(playerId: string, cardId: string): boolean {
    const validation = validateMakePick(this._state, playerId, cardId);
    return validation.success;
  }

  getDraftStatus(): DraftStatus {
    return this._state.status;
  }

  // ============================================================================
  // ACTION PROCESSING
  // ============================================================================

  applyAction(action: DraftAction): ActionResult<DraftSession> {
    // Validate action first
    const validation = this.validateAction(action);
    if (!validation.success) {
      return validation;
    }

    // Execute action
    const result = this.executeAction(action);
    if (!result.success) {
      return result;
    }

    // Update history and timestamp
    const newState: DraftState = {
      ...result.data._state,
      history: [...this._state.history, action],
      updatedAt: Date.now()
    };

    return {
      success: true,
      data: new DraftSession(newState)
    };
  }

  private validateAction(action: DraftAction): ActionResult<void> {
    switch (action.type) {
      case 'ADD_PLAYER':
        return validateAddPlayer(this._state, action.playerId, action.name, action.isHuman);
      
      case 'START_DRAFT':
        return validateStartDraft(this._state);
      
      case 'MAKE_PICK':
        return validateMakePick(this._state, action.playerId, action.cardId);
      
      case 'TIME_OUT_PICK':
        // Same validation as MAKE_PICK but we'll auto-select a card
        const player = getPlayer(this._state, action.playerId);
        if (!player) {
          return {
            success: false,
            error: {
              type: 'PLAYER_NOT_FOUND',
              message: `Player ${action.playerId} not found`,
              playerId: action.playerId
            }
          };
        }
        const pack = getCurrentPackForPlayer(this._state, action.playerId);
        if (!pack || pack.cards.length === 0) {
          return {
            success: false,
            error: {
              type: 'NO_PACK_AVAILABLE',
              message: `No pack available for player ${action.playerId}`,
              playerId: action.playerId,
              round: this._state.currentRound
            }
          };
        }
        return { success: true, data: undefined };
      
      case 'UNDO_LAST_ACTION':
        if (this._state.history.length === 0) {
          return {
            success: false,
            error: {
              type: 'INVALID_ACTION',
              message: 'No actions to undo',
              action: 'UNDO_LAST_ACTION'
            }
          };
        }
        return { success: true, data: undefined };
      
      default:
        return {
          success: false,
          error: {
            type: 'INVALID_ACTION',
            message: `Unknown action type: ${(action as any).type}`,
            action: (action as any).type
          }
        };
    }
  }

  private executeAction(action: DraftAction): ActionResult<DraftSession> {
    switch (action.type) {
      case 'ADD_PLAYER':
        return this.executeAddPlayer(action.playerId, action.name, action.isHuman, action.personality);
      
      case 'START_DRAFT':
        return this.executeStartDraft();
      
      case 'MAKE_PICK':
        return this.executeMakePick(action.playerId, action.cardId);
      
      case 'TIME_OUT_PICK':
        return this.executeTimeOutPick(action.playerId);
      
      case 'UNDO_LAST_ACTION':
        return this.executeUndo();
      
      default:
        return {
          success: false,
          error: {
            type: 'INVALID_ACTION',
            message: `Cannot execute unknown action: ${(action as any).type}`,
            action: (action as any).type
          }
        };
    }
  }

  // ============================================================================
  // ACTION IMPLEMENTATIONS
  // ============================================================================

  private executeAddPlayer(
    playerId: string, 
    name: string, 
    isHuman: boolean, 
    personality?: BotPersonality
  ): ActionResult<DraftSession> {
    const newPlayer: Player = {
      id: playerId,
      name,
      isHuman,
      position: this._state.players.length,
      pickedCards: [],
      personality: isHuman ? undefined : (personality || 'silver')
    };

    const newState: DraftState = {
      ...this._state,
      players: [...this._state.players, newPlayer]
    };

    return {
      success: true,
      data: new DraftSession(newState)
    };
  }

  private executeStartDraft(): ActionResult<DraftSession> {
    // Generate packs for all 3 rounds
    const packsResult = this.generateAllPacks();
    if (!packsResult.success) {
      return packsResult;
    }

    // Activate first round packs
    const firstRoundPacks = packsResult.data[0];
    const updatedPlayers = this._state.players.map((player, index) => ({
      ...player,
      // Assign pack to each player's position
      currentPack: firstRoundPacks[index] || null
    }));

    const newState: DraftState = {
      ...this._state,
      status: 'active',
      packs: packsResult.data,
      players: updatedPlayers
    };

    return {
      success: true,
      data: new DraftSession(newState)
    };
  }

  private executeMakePick(playerId: string, cardId: string): ActionResult<DraftSession> {
    const player = getPlayer(this._state, playerId);
    const pack = player?.currentPack;
    
    if (!player || !pack) {
      return {
        success: false,
        error: {
          type: 'INVALID_PICK',
          message: 'Player or pack not found',
          cardId,
          playerId
        }
      };
    }

    const card = pack.cards.find(c => c.id === cardId);
    if (!card) {
      return {
        success: false,
        error: {
          type: 'CARD_NOT_AVAILABLE',
          message: `Card ${cardId} not found in pack`,
          cardId,
          availableCardIds: pack.cards.map(c => c.id)
        }
      };
    }

    // Remove card from pack and add to player's picks
    const updatedPack: Pack = {
      ...pack,
      cards: pack.cards.filter(c => c.id !== cardId)
    };

    const updatedPlayer: Player = {
      ...player,
      pickedCards: [...player.pickedCards, card]
    };

    // Simple pack passing logic: pass pack immediately to next player
    const passResult = this.passPackToNextPlayer(updatedPlayer, updatedPack);
    if (!passResult.success) {
      return passResult;
    }

    return {
      success: true,
      data: passResult.data
    };
  }

  /**
   * Pass pack to next player and increment pick counter
   */
  private passPackToNextPlayer(pickingPlayer: Player, updatedPack: Pack): ActionResult<DraftSession> {
    const playerCount = this._state.players.length;
    const direction = this._state.direction;
    
    // Calculate next player position based on direction
    let nextPosition: number;
    if (direction === 'clockwise') {
      nextPosition = (pickingPlayer.position + 1) % playerCount;
    } else {
      nextPosition = (pickingPlayer.position - 1 + playerCount) % playerCount;
    }
    
    // Update players: picking player loses pack, next player gets pack
    const updatedPlayers = this._state.players.map(player => {
      if (player.id === pickingPlayer.id) {
        // Picking player: add picked card, remove pack
        return {
          ...pickingPlayer,
          currentPack: null
        };
      } else if (player.position === nextPosition) {
        // Next player: receives the passed pack
        return {
          ...player,
          currentPack: updatedPack
        };
      }
      return player;
    });

    // Increment pick counter
    const newPick = this._state.currentPick + 1;
    
    // Check if we need to advance round (all packs empty)
    const hasAnyCardsLeft = updatedPlayers.some(p => p.currentPack && p.currentPack.cards.length > 0);
    
    let newState: DraftState;
    if (!hasAnyCardsLeft && this._state.currentRound < 3) {
      // Advance to next round
      const nextRound = this._state.currentRound + 1;
      const newDirection = nextRound === 2 ? 'counterclockwise' : 'clockwise';
      
      // Get packs for next round
      const roundIndex = nextRound - 1;
      const nextRoundPacks = this._state.packs[roundIndex] || [];
      
      const playersWithNewPacks = this._state.players.map((player, index) => ({
        ...updatedPlayers[index],
        currentPack: nextRoundPacks[index] || null
      }));

      newState = {
        ...this._state,
        players: playersWithNewPacks,
        currentRound: nextRound,
        currentPick: 1,
        direction: newDirection
      };
    } else if (!hasAnyCardsLeft) {
      // Draft complete
      newState = {
        ...this._state,
        players: updatedPlayers,
        currentPick: newPick,
        status: 'complete'
      };
    } else {
      // Continue current round
      newState = {
        ...this._state,
        players: updatedPlayers,
        currentPick: newPick
      };
    }

    const newSession = new DraftSession(newState);
    
    // If there are bots with packs, they pick immediately
    const botsWithPacks = newSession.getBotsNeedingPicks();
    if (botsWithPacks.length > 0) {
      return this.processBotPicksSequentially(newSession, botsWithPacks);
    }

    return { success: true, data: newSession };
  }

  /**
   * Process bot picks sequentially (each bot picks immediately when they get a pack)
   */
  private processBotPicksSequentially(session: DraftSession, botsWithPacks: Player[]): ActionResult<DraftSession> {
    let currentSession = session;
    
    for (const bot of botsWithPacks) {
      if (!bot.currentPack || bot.currentPack.cards.length === 0) {
        continue; // Skip bots without cards
      }
      
      // Bot makes decision
      const selectedCard = this.botProcessor.processBotPick(currentSession._state, bot);
      
      // Apply bot's pick using same logic as human pick
      const result = currentSession.executeMakePick(bot.id, selectedCard.selectedCardId);
      if (!result.success) {
        return result;
      }
      
      currentSession = result.data;
    }
    
    return { success: true, data: currentSession };
  }


  private executeTimeOutPick(playerId: string): ActionResult<DraftSession> {
    const pack = getCurrentPackForPlayer(this._state, playerId);
    if (!pack || pack.cards.length === 0) {
      return {
        success: false,
        error: {
          type: 'NO_PACK_AVAILABLE',
          message: `No pack available for timeout pick`,
          playerId,
          round: this._state.currentRound
        }
      };
    }

    // Auto-pick first available card
    const cardId = pack.cards[0].id;
    return this.executeMakePick(playerId, cardId);
  }

  private executeUndo(): ActionResult<DraftSession> {
    if (this._state.history.length === 0) {
      return {
        success: false,
        error: {
          type: 'INVALID_ACTION',
          message: 'No actions to undo',
          action: 'UNDO_LAST_ACTION'
        }
      };
    }

    // Recreate session by replaying all actions except the last one
    const historyWithoutLast = this._state.history.slice(0, -1);
    let session = DraftSession.create(this._state.config);

    for (const action of historyWithoutLast) {
      const result = session.applyAction(action);
      if (!result.success) {
        return {
          success: false,
          error: {
            type: 'INVALID_ACTION',
            message: `Failed to replay action during undo: ${result.error.message}`,
            action: 'UNDO_LAST_ACTION'
          }
        };
      }
      session = result.data;
    }

    return { success: true, data: session };
  }

  // ============================================================================
  // PACK MANAGEMENT
  // ============================================================================

  private generateAllPacks(): ActionResult<Pack[][]> {
    try {
      const playerCount = this._state.players.length;
      const setData = this._state.config.setData;
      
      if (!setData || !setData.cards) {
        return {
          success: false,
          error: {
            type: 'INVALID_DRAFT_STATE',
            message: 'No set data available for pack generation',
            details: 'Set data is null or missing cards'
          }
        };
      }

      // Use enhanced pack generation with deterministic seed for consistency
      const seed = `${this._state.id}-${playerCount}`;
      const allPacks = generatePacksForDraft(setData, playerCount, 3, seed);

      return { success: true, data: allPacks };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'INVALID_DRAFT_STATE',
          message: 'Failed to generate draft packs',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }


  // ============================================================================
  // BOT PROCESSING
  // ============================================================================


  /**
   * Get all bot players that need to make picks
   */
  getBotsNeedingPicks(): Player[] {
    return getBotPlayersNeedingPicks(this._state);
  }

  /**
   * Process a single bot pick
   */
  processSingleBotPick(playerId: string): ActionResult<DraftSession> {
    const player = getPlayer(this._state, playerId);
    if (!player) {
      return {
        success: false,
        error: {
          type: 'PLAYER_NOT_FOUND',
          message: `Bot player ${playerId} not found`,
          playerId
        }
      };
    }

    if (player.isHuman) {
      return {
        success: false,
        error: {
          type: 'INVALID_ACTION',
          message: `Cannot process bot pick for human player ${playerId}`,
          action: 'PROCESS_BOT_PICK'
        }
      };
    }

    try {
      const decision = this.botProcessor.processBotPick(this._state, player);
      
      return this.applyAction({
        type: 'MAKE_PICK',
        playerId: decision.playerId,
        cardId: decision.selectedCardId
      });
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'BOT_ERROR',
          message: `Single bot pick failed for ${playerId}`,
          botId: playerId,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  serialize(options?: SerializationOptions): string {
    const result = this.serializer.serialize(this._state, options);
    if (!result.success) {
      throw new Error(`Serialization failed: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Serialize with enhanced options
   */
  serializeEnhanced(options: SerializationOptions = {}): ActionResult<string> {
    return this.serializer.serialize(this._state, options);
  }

  /**
   * Serialize for ML training data
   */
  serializeForMLTraining(): ActionResult<string> {
    return this.serializer.serializeForMLTraining(this._state);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}