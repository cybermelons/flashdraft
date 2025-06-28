/**
 * Bot integration for DraftSession engine
 * 
 * Adapts the existing bot decision logic to work with the pure DraftSession architecture.
 * Provides clean interface for bot decision making without UI dependencies.
 */

import type { Card, Player, DraftState, BotPersonality, DraftContext } from '../types/core';
import type { MTGCard } from '../../shared/types/card';
import { chooseBotPick, BOT_PERSONALITIES } from '../../shared/utils/cardUtils';

// ============================================================================
// BOT INTERFACE IMPLEMENTATION
// ============================================================================

export class DraftBot {
  selectCard(
    availableCards: Card[],
    pickedCards: Card[],
    draftContext: DraftContext,
    personality: BotPersonality
  ): Card {
    // Convert engine Card types to MTGCard types for existing bot logic
    const mtgCards = availableCards.map(this.toMTGCard);
    const pickedMTGCards = pickedCards.map(this.toMTGCard);
    
    // Use existing bot decision logic
    const personalityKey = personality as keyof typeof BOT_PERSONALITIES;
    const selectedMTGCard = chooseBotPick(mtgCards, personalityKey, {
      picked_cards: pickedMTGCards,
      pack_position: draftContext.packPosition,
      round: draftContext.round
    });
    
    if (!selectedMTGCard) {
      // Fallback to first available card if bot logic fails
      return availableCards[0];
    }
    
    // Find the corresponding engine Card
    const selectedCard = availableCards.find(card => card.id === selectedMTGCard.id);
    return selectedCard || availableCards[0];
  }

  private toMTGCard(card: Card): MTGCard {
    return {
      id: card.id,
      name: card.name,
      set: card.set,
      rarity: card.rarity,
      type_line: card.type_line,
      mana_cost: card.mana_cost,
      cmc: card.cmc,
      colors: card.colors,
      color_identity: card.color_identity,
      oracle_text: card.oracle_text,
      power: card.power,
      toughness: card.toughness,
      collector_number: card.collector_number,
      booster: card.booster,
      image_uris: card.image_uris
    };
  }
}

// ============================================================================
// BOT PROCESSING UTILITIES
// ============================================================================

export interface BotDecision {
  playerId: string;
  selectedCardId: string;
  timeToDecide: number; // milliseconds
  confidence: number; // 0-1
}

export class BotProcessor {
  private bot: DraftBot;
  
  constructor() {
    this.bot = new DraftBot();
  }

  /**
   * Process all bot picks for the current state
   */
  processAllBotPicks(state: DraftState): BotDecision[] {
    const botsNeedingPicks = state.players.filter(player => 
      !player.isHuman && this.playerNeedsPick(state, player)
    );

    return botsNeedingPicks.map(player => this.processBotPick(state, player));
  }

  /**
   * Process a single bot pick
   */
  processBotPick(state: DraftState, player: Player): BotDecision {
    const startTime = Date.now();
    
    // Get available cards from player's current pack
    const pack = player.currentPack || this.getPackForPlayer(state, player);
    if (!pack || pack.cards.length === 0) {
      throw new Error(`No pack available for bot ${player.id}`);
    }

    // Create draft context
    const context: DraftContext = {
      round: state.currentRound,
      pick: state.currentPick,
      packPosition: player.position,
      direction: state.direction,
      totalPlayers: state.players.length
    };

    // Make bot decision
    const selectedCard = this.bot.selectCard(
      pack.cards,
      player.pickedCards,
      context,
      player.personality || 'silver'
    );

    const timeToDecide = Date.now() - startTime;
    
    // Calculate confidence based on card priority and bot skill
    const personality = BOT_PERSONALITIES[player.personality || 'silver'];
    const confidence = this.calculateConfidence(selectedCard, pack.cards, personality);

    return {
      playerId: player.id,
      selectedCardId: selectedCard.id,
      timeToDecide,
      confidence
    };
  }

  private playerNeedsPick(state: DraftState, player: Player): boolean {
    const pack = player.currentPack || this.getPackForPlayer(state, player);
    return pack !== null && pack.cards.length > 0;
  }

  private getPackForPlayer(state: DraftState, player: Player) {
    const roundIndex = state.currentRound - 1;
    if (roundIndex < 0 || roundIndex >= state.packs.length) return null;

    const packsThisRound = state.packs[roundIndex];
    if (!packsThisRound || player.position >= packsThisRound.length) return null;

    return packsThisRound[player.position] || null;
  }

  private calculateConfidence(
    selectedCard: Card, 
    availableCards: Card[], 
    personality: any
  ): number {
    // Higher skill bots have higher confidence
    const baseConfidence = personality.skill_level;
    
    // If it's a clear best pick (rare/mythic), confidence increases
    const isTopRarity = selectedCard.rarity === 'rare' || selectedCard.rarity === 'mythic';
    const rarityBonus = isTopRarity ? 0.2 : 0;
    
    // More cards available = lower confidence (harder decision)
    const choiceBonus = Math.max(0, (15 - availableCards.length) / 15 * 0.2);
    
    return Math.min(1, baseConfidence + rarityBonus + choiceBonus);
  }
}

// ============================================================================
// BOT TIMING AND BEHAVIOR
// ============================================================================

export interface BotTiming {
  baseDecisionTime: number; // milliseconds
  varianceRange: number; // +/- milliseconds
  skillSpeedMultiplier: number; // faster for higher skill
}

export const BOT_TIMING_PROFILES: Record<BotPersonality, BotTiming> = {
  bronze: {
    baseDecisionTime: 3000, // 3 seconds
    varianceRange: 2000,
    skillSpeedMultiplier: 0.8 // Slower
  },
  silver: {
    baseDecisionTime: 2000, // 2 seconds
    varianceRange: 1000,
    skillSpeedMultiplier: 1.0 // Normal
  },
  gold: {
    baseDecisionTime: 1500, // 1.5 seconds
    varianceRange: 800,
    skillSpeedMultiplier: 1.2 // Faster
  },
  mythic: {
    baseDecisionTime: 1000, // 1 second
    varianceRange: 500,
    skillSpeedMultiplier: 1.5 // Very fast
  }
};

export function calculateBotDelay(personality: BotPersonality): number {
  const timing = BOT_TIMING_PROFILES[personality];
  const variance = (Math.random() - 0.5) * timing.varianceRange;
  return Math.max(100, timing.baseDecisionTime + variance);
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createDraftBot(): DraftBot {
  return new DraftBot();
}

export function createBotProcessor(): BotProcessor {
  return new BotProcessor();
}

// Re-export bot personalities for convenience
export { BOT_PERSONALITIES } from '../../shared/utils/cardUtils';