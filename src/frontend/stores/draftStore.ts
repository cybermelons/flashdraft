/**
 * FlashDraft - Draft State Management
 * 
 * Zustand store for managing draft state, including packs,
 * picks, player data, and draft flow control.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import type { DraftCard, MTGSetData, MTGCard } from '../../shared/types/card';
import type { GeneratedPack } from '../utils/clientPackGenerator';
import { chooseBotPick, BOT_PERSONALITIES } from '../../shared/utils/cardUtils';
import { updateUrlWithDraftState, createShareableUrl, getDraftStateFromUrl, type DraftUrlState } from '../../shared/utils/draftUrl';
import { saveDraftState, loadDraftState, getCurrentDraftId, loadCurrentDraft, generateDraftId, type PersistedDraftState } from '../../shared/utils/draftPersistence';

export interface DraftPlayer {
  id: string;
  name: string;
  is_human: boolean;
  position: number; // Seat position (0-7)
  picked_cards: DraftCard[];
  current_pack?: GeneratedPack;
  total_picks: number;
  bot_personality?: keyof typeof BOT_PERSONALITIES; // For bot players
}

export interface DraftState {
  // Draft configuration
  draft_id: string;
  set_code: string;
  set_data: MTGSetData | null;
  players: DraftPlayer[];
  current_player_id: string;
  
  // Draft flow
  current_round: number; // 1, 2, or 3
  current_pick: number; // 1-15 (or pack size)
  direction: 'clockwise' | 'counterclockwise';
  draft_started: boolean;
  draft_completed: boolean;
  
  // Current state
  active_packs: GeneratedPack[];
  all_draft_packs: GeneratedPack[][]; // [player][round] structure - all packs for all rounds
  pack_history: GeneratedPack[][];
  pick_timer: number | null;
  pick_deadline: number | null;
  
  // UI state
  selected_card: DraftCard | null;
  hovered_card: DraftCard | null;
  show_pack_info: boolean;
  show_picked_cards: boolean;
  auto_pick_enabled: boolean;
  
  // Performance tracking
  pick_times: number[];
  draft_start_time: number | null;
}

export interface DraftActions {
  // Setup actions
  initializeDraft: (setCode: string, setData: MTGSetData, playerCount?: number) => void;
  resetDraft: () => void;
  
  // Player actions
  addPlayer: (name: string, isHuman: boolean, botPersonality?: keyof typeof BOT_PERSONALITIES) => void;
  removePlayer: (playerId: string) => void;
  setCurrentPlayer: (playerId: string) => void;
  
  // Draft flow actions
  startDraft: () => void;
  makePickBy: (playerId: string, card: DraftCard) => void;
  makeBotPick: (playerId: string) => void;
  processBotTurns: () => void;
  passPacks: () => void;
  nextRound: () => void;
  completeDraft: () => void;
  
  // Pack management
  setActivePacks: (packs: GeneratedPack[]) => void;
  setAllDraftPacks: (allPacks: GeneratedPack[][]) => void;
  updatePack: (packId: string, pack: GeneratedPack) => void;
  
  // UI actions
  selectCard: (card: DraftCard | null) => void;
  hoverCard: (card: DraftCard | null) => void;
  togglePackInfo: () => void;
  togglePickedCards: () => void;
  toggleAutoPick: () => void;
  
  // Timer actions
  startPickTimer: (seconds: number) => void;
  stopPickTimer: () => void;
  
  // Utility actions
  getCurrentPlayer: () => DraftPlayer | null;
  getCurrentPack: () => GeneratedPack | null;
  getPlayerByPosition: (position: number) => DraftPlayer | null;
  isHumanTurn: () => boolean;
  canMakePick: () => boolean;
  getDraftProgress: () => { current: number; total: number };
  
  // URL management actions
  updatePermalink: () => void;
  getShareableUrl: () => string;
  loadFromUrl: (urlState: DraftUrlState) => boolean;
  
  // Persistence actions
  saveDraft: () => string;
  loadDraft: (draftId: string) => boolean;
  loadDraftWithData: (draftId: string, setData: MTGSetData, allPacks?: GeneratedPack[][]) => boolean;
  loadCurrentDraft: () => boolean;
  createNewDraft: (setCode: string, setData: MTGSetData) => string;
  navigateToPosition: (round: number, pick: number) => boolean;
}

type DraftStore = DraftState & DraftActions;

const initialState: DraftState = {
  draft_id: '',
  set_code: '',
  set_data: null,
  players: [],
  current_player_id: '',
  
  current_round: 1,
  current_pick: 1,
  direction: 'clockwise',
  draft_started: false,
  draft_completed: false,
  
  active_packs: [],
  all_draft_packs: [],
  pack_history: [],
  pick_timer: null,
  pick_deadline: null,
  
  selected_card: null,
  hovered_card: null,
  show_pack_info: true,
  show_picked_cards: false,
  auto_pick_enabled: false,
  
  pick_times: [],
  draft_start_time: null,
};

export const useDraftStore = create<DraftStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Setup actions
    initializeDraft: (setCode: string, setData: MTGSetData, playerCount = 8) => {
      const draftId = generateDraftId();
      set({
        draft_id: draftId,
        set_code: setCode,
        set_data: setData,
        players: [],
        current_player_id: '',
        current_round: 1,
        current_pick: 1,
        direction: 'clockwise',
        draft_started: false,
        draft_completed: false,
        active_packs: [],
        all_draft_packs: [],
        pack_history: [],
        selected_card: null,
        pick_times: [],
        draft_start_time: null,
      });

      // Add default players
      const { addPlayer } = get();
      addPlayer('You', true); // Human player
      
      // Add bots with varied personalities
      const personalities: (keyof typeof BOT_PERSONALITIES)[] = ['bronze', 'silver', 'gold', 'mythic'];
      
      for (let i = 1; i < playerCount; i++) {
        const personality = personalities[(i - 1) % personalities.length];
        const personalityName = BOT_PERSONALITIES[personality].name;
        addPlayer(personalityName, false, personality);
      }
    },

    resetDraft: () => {
      set(initialState);
    },

    // Player actions
    addPlayer: (name: string, isHuman: boolean, botPersonality?: keyof typeof BOT_PERSONALITIES) => {
      const state = get();
      const newPlayer: DraftPlayer = {
        id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        is_human: isHuman,
        position: state.players.length,
        picked_cards: [],
        total_picks: 0,
        bot_personality: isHuman ? undefined : (botPersonality || 'silver'),
      };

      set({
        players: [...state.players, newPlayer],
        current_player_id: state.current_player_id || newPlayer.id,
      });
    },

    removePlayer: (playerId: string) => {
      const state = get();
      const updatedPlayers = state.players
        .filter(p => p.id !== playerId)
        .map((p, index) => ({ ...p, position: index }));

      set({
        players: updatedPlayers,
        current_player_id: state.current_player_id === playerId 
          ? (updatedPlayers[0]?.id || '') 
          : state.current_player_id,
      });
    },

    setCurrentPlayer: (playerId: string) => {
      set({ current_player_id: playerId });
    },

    // Draft flow actions
    startDraft: () => {
      const state = get();
      if (state.players.length < 2) {
        throw new Error('Need at least 2 players to start draft');
      }

      set({
        draft_started: true,
        draft_start_time: Date.now(),
        current_player_id: state.players[0].id,
      });
    },

    makePickBy: (playerId: string, card: DraftCard) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || !player.current_pack) return;

      const pickTime = state.pick_deadline ? Date.now() - (state.pick_deadline - 75000) : 0;

      // Update player with picked card
      const updatedPlayers = state.players.map(p => {
        if (p.id === playerId && p.current_pack) {
          return {
            ...p,
            picked_cards: [...p.picked_cards, card],
            total_picks: p.total_picks + 1,
            current_pack: {
              ...p.current_pack,
              cards: p.current_pack.cards.filter(c => c.id !== card.id),
              pick_number: p.current_pack.pick_number + 1,
            },
          };
        }
        return p;
      });

      // Update pack history
      const newPackHistory = [...state.pack_history];
      if (!newPackHistory[state.current_round - 1]) {
        newPackHistory[state.current_round - 1] = [];
      }
      newPackHistory[state.current_round - 1].push(player.current_pack);

      set({
        players: updatedPlayers,
        pack_history: newPackHistory,
        pick_times: [...state.pick_times, pickTime],
        selected_card: null,
      });

      // Update URL and save draft if this was a human pick
      if (player.is_human) {
        setTimeout(() => {
          get().updatePermalink();
          get().saveDraft();
        }, 100);
      }

      // Check if all players have picked from their current pack this round
      // Look for any player (except the one who just picked) who still has cards to pick
      const playersNeedingPicks = updatedPlayers.filter(p => 
        p.current_pack && 
        p.current_pack.cards.length > 0 && 
        p.id !== playerId // Exclude the player who just picked
      );

      const allPlayersPickedThisRound = playersNeedingPicks.length === 0;

      console.log(`Pick check: Round ${state.current_round}, Pick ${state.current_pick}`);
      console.log(`Players needing picks:`, playersNeedingPicks.map(p => `${p.name}: ${p.current_pack?.cards.length || 0} cards`));
      console.log(`All picked this round: ${allPlayersPickedThisRound}`);

      if (allPlayersPickedThisRound) {
        // All players have picked, time to pass packs
        console.log('All players picked, passing packs...');
        setTimeout(() => {
          get().passPacks();
        }, 100);
      } else {
        // Process bot turns
        console.log('Processing bot turns...');
        setTimeout(() => {
          get().processBotTurns();
        }, 100);
      }
    },

    makeBotPick: (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      
      if (!player || player.is_human || !player.current_pack || !player.bot_personality) {
        return;
      }

      const availableCards = player.current_pack.cards;
      if (availableCards.length === 0) return;

      // Convert DraftCard[] to MTGCard[] for bot logic
      const mtgCards: MTGCard[] = availableCards.map(card => ({
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
        image_uris: card.image_uris,
      }));

      // Get bot's picked cards as MTGCard[]
      const pickedMtgCards: MTGCard[] = player.picked_cards.map(card => ({
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
        image_uris: card.image_uris,
      }));

      const chosenCard = chooseBotPick(mtgCards, player.bot_personality, {
        picked_cards: pickedMtgCards,
        pack_position: player.position,
        round: state.current_round,
      });

      if (chosenCard) {
        // Find the corresponding DraftCard
        const draftCard = availableCards.find(c => c.id === chosenCard.id);
        if (draftCard) {
          get().makePickBy(playerId, draftCard);
        }
      }
    },

    processBotTurns: () => {
      const state = get();
      if (!state.draft_started || state.draft_completed) return;

      // Find all bot players who still have cards to pick from
      const botsNeedingPicks = state.players.filter(p => 
        !p.is_human && 
        p.current_pack && 
        p.current_pack.cards.length > 0
      );

      console.log(`Bot processing: ${botsNeedingPicks.length} bots need to pick`);

      if (botsNeedingPicks.length === 0) return;

      // Process bot picks one at a time with small delays
      botsNeedingPicks.forEach((bot, index) => {
        setTimeout(() => {
          get().makeBotPick(bot.id);
        }, index * 50);
      });
    },

    passPacks: () => {
      const state = get();
      const { direction, players, current_round } = state;

      console.log(`Passing packs: Round ${current_round}, Pick ${state.current_pick}, Direction: ${direction}`);

      // Create a map of packs to pass
      const packsToPass: Record<number, GeneratedPack | undefined> = {};
      const playerCount = players.length;

      // Collect all packs that need to be passed
      players.forEach(player => {
        if (player.current_pack && player.current_pack.cards.length > 0) {
          // Calculate next position based on direction
          let nextPosition;
          if (direction === 'clockwise') {
            nextPosition = (player.position + 1) % playerCount;
          } else {
            nextPosition = (player.position - 1 + playerCount) % playerCount;
          }
          packsToPass[nextPosition] = player.current_pack;
        }
      });

      // Update all players with their new packs
      const updatedPlayers = players.map(player => ({
        ...player,
        current_pack: packsToPass[player.position] || undefined,
      }));

      console.log('After pack passing:');
      console.log('Packs to pass:', Object.entries(packsToPass).map(([pos, pack]) => 
        `Position ${pos}: ${pack ? pack.cards.length : 0} cards`
      ));
      console.log('Updated player packs:', updatedPlayers.map(p => 
        `${p.name}: ${p.current_pack ? p.current_pack.cards.length : 0} cards`
      ));

      set({ 
        players: updatedPlayers,
        current_pick: state.current_pick + 1,
      });

      // Check if round is complete (all packs empty)
      const anyPacksRemaining = Object.values(packsToPass).some(pack => 
        pack && pack.cards.length > 0
      );

      console.log(`Any packs remaining: ${anyPacksRemaining}`);

      if (!anyPacksRemaining) {
        console.log('Round complete, advancing to next round');
        get().nextRound();
      } else {
        // Start bot processing for the new packs
        console.log('Starting bot processing for new packs');
        setTimeout(() => {
          get().processBotTurns();
        }, 200);
      }
    },

    nextRound: () => {
      const state = get();
      const nextRound = state.current_round + 1;

      if (nextRound > 3) {
        get().completeDraft();
        return;
      }

      // Switch direction for round 2
      const newDirection = nextRound === 2 ? 'counterclockwise' : 'clockwise';

      console.log(`Starting round ${nextRound} with direction ${newDirection}`);

      // Get the packs for the new round (round is 1-indexed, array is 0-indexed)
      const roundIndex = nextRound - 1;
      const newRoundPacks = state.all_draft_packs.map(playerPacks => playerPacks[roundIndex]).filter(Boolean);

      console.log(`Activating ${newRoundPacks.length} packs for round ${nextRound}`);

      set({
        current_round: nextRound,
        current_pick: 1,
        direction: newDirection,
      });

      // Activate the new round's packs
      if (newRoundPacks.length > 0) {
        get().setActivePacks(newRoundPacks);
        
        // Start bot processing for the new round
        setTimeout(() => {
          get().processBotTurns();
        }, 200);
      } else {
        console.error(`No packs available for round ${nextRound}`);
      }
    },

    completeDraft: () => {
      set({
        draft_completed: true,
        pick_timer: null,
        pick_deadline: null,
      });
    },

    // Pack management
    setActivePacks: (packs: GeneratedPack[]) => {
      const state = get();
      
      // Assign packs to players
      const updatedPlayers = state.players.map((player, index) => ({
        ...player,
        current_pack: packs[index] || undefined,
      }));

      set({
        active_packs: packs,
        players: updatedPlayers,
      });
    },

    setAllDraftPacks: (allPacks: GeneratedPack[][]) => {
      set({ all_draft_packs: allPacks });
    },

    updatePack: (packId: string, pack: GeneratedPack) => {
      const state = get();
      
      const updatedPacks = state.active_packs.map(p => 
        p.id === packId ? pack : p
      );

      const updatedPlayers = state.players.map(player => 
        player.current_pack?.id === packId 
          ? { ...player, current_pack: pack }
          : player
      );

      set({
        active_packs: updatedPacks,
        players: updatedPlayers,
      });
    },

    // UI actions
    selectCard: (card: DraftCard | null) => {
      set({ selected_card: card });
    },

    hoverCard: (card: DraftCard | null) => {
      set({ hovered_card: card });
    },

    togglePackInfo: () => {
      set(state => ({ show_pack_info: !state.show_pack_info }));
    },

    togglePickedCards: () => {
      set(state => ({ show_picked_cards: !state.show_picked_cards }));
    },

    toggleAutoPick: () => {
      set(state => ({ auto_pick_enabled: !state.auto_pick_enabled }));
    },

    // Timer actions
    startPickTimer: (seconds: number) => {
      set({
        pick_timer: seconds,
        pick_deadline: Date.now() + (seconds * 1000),
      });
    },

    stopPickTimer: () => {
      set({
        pick_timer: null,
        pick_deadline: null,
      });
    },

    // Utility actions
    getCurrentPlayer: () => {
      const state = get();
      return state.players.find(p => p.id === state.current_player_id) || null;
    },

    getCurrentPack: () => {
      const currentPlayer = get().getCurrentPlayer();
      return currentPlayer?.current_pack || null;
    },

    getPlayerByPosition: (position: number) => {
      const state = get();
      return state.players.find(p => p.position === position) || null;
    },

    isHumanTurn: () => {
      const currentPlayer = get().getCurrentPlayer();
      return currentPlayer?.is_human || false;
    },

    canMakePick: () => {
      const state = get();
      return state.draft_started && 
             !state.draft_completed && 
             state.selected_card !== null &&
             get().isHumanTurn();
    },

    getDraftProgress: () => {
      const state = get();
      const totalPicks = state.players.length * 3 * 15; // 8 players * 3 packs * 15 cards
      const currentPicks = state.players.reduce((sum, p) => sum + p.total_picks, 0);
      
      return {
        current: currentPicks,
        total: totalPicks,
      };
    },

    // URL management actions
    updatePermalink: () => {
      const state = get();
      
      if (!state.draft_started || !state.draft_id) return;
      
      // Update URL to new routing structure: /draft/[draftId]/p[round]p[pick]
      const newUrl = `/draft/${state.draft_id}/p${state.current_round}p${state.current_pick}`;
      
      // Update browser URL without full page reload
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({}, '', newUrl);
      }
    },

    getShareableUrl: () => {
      const state = get();
      const humanPlayer = state.players.find(p => p.is_human);
      
      if (!humanPlayer) return '';
      
      return createShareableUrl(
        humanPlayer,
        state.current_round,
        state.current_pick,
        state.set_code
      );
    },

    loadFromUrl: (urlState: DraftUrlState) => {
      const state = get();
      
      // Basic validation
      if (!state.set_data || state.set_code !== urlState.set_code) {
        console.warn('Cannot load draft state: set mismatch');
        return false;
      }
      
      // Update draft state to match URL
      set({
        current_round: urlState.round,
        current_pick: urlState.pick,
      });
      
      // TODO: Implement pick replay logic to recreate the exact draft state
      // This would require:
      // 1. Regenerating packs with the same seed
      // 2. Replaying all picks up to the current point
      // 3. Positioning players correctly
      
      return true;
    },

    // Persistence actions
    saveDraft: () => {
      const state = get();
      try {
        const draftId = saveDraftState(state, state.draft_id);
        if (state.draft_id !== draftId) {
          set({ draft_id: draftId });
        }
        return draftId;
      } catch (error) {
        console.error('Failed to save draft:', error);
        return state.draft_id;
      }
    },

    loadDraft: (draftId: string) => {
      try {
        const persistedState = loadDraftState(draftId);
        if (!persistedState) {
          console.warn('Draft not found:', draftId);
          return false;
        }

        // Restore state (excluding set_data which needs to be reloaded)
        const { set_data, ...stateToRestore } = persistedState;
        set(stateToRestore);
        
        // Note: set_data needs to be reloaded from the API
        // This should be handled by the calling component
        
        return true;
      } catch (error) {
        console.error('Failed to load draft:', error);
        return false;
      }
    },

    loadDraftWithData: (draftId: string, setData: MTGSetData, allPacks?: GeneratedPack[][]) => {
      try {
        const persistedState = loadDraftState(draftId);
        if (!persistedState) {
          console.warn('Draft not found:', draftId);
          return false;
        }

        // Restore state with the provided set_data
        const { set_data, ...stateToRestore } = persistedState;
        set({
          ...stateToRestore,
          set_data: setData,
          all_draft_packs: allPacks || [],
        });

        // If packs were provided and we're in an active draft, restore the current round's packs
        if (allPacks && allPacks.length > 0 && stateToRestore.draft_started) {
          const roundIndex = stateToRestore.current_round - 1;
          const currentRoundPacks = allPacks.map(playerPacks => playerPacks[roundIndex]).filter(Boolean);
          
          if (currentRoundPacks.length > 0) {
            // Need to restore pack state based on picks already made
            // For now, just set the packs - TODO: implement proper pick replay
            get().setActivePacks(currentRoundPacks);
          }
        }
        
        return true;
      } catch (error) {
        console.error('Failed to load draft with data:', error);
        return false;
      }
    },

    loadCurrentDraft: () => {
      const currentDraft = loadCurrentDraft();
      if (!currentDraft) return false;
      
      return get().loadDraft(currentDraft.id);
    },

    createNewDraft: (setCode: string, setData: MTGSetData) => {
      get().initializeDraft(setCode, setData);
      const draftId = get().saveDraft();
      return draftId;
    },

    navigateToPosition: (round: number, pick: number) => {
      const state = get();
      
      // Validate position
      if (round < 1 || round > 3 || pick < 1 || pick > 15) {
        console.warn('Invalid draft position:', { round, pick });
        return false;
      }
      
      // Check if position is valid for current draft state
      const totalPicks = (round - 1) * 15 + pick;
      const currentTotalPicks = (state.current_round - 1) * 15 + state.current_pick;
      
      if (totalPicks > currentTotalPicks) {
        console.warn('Cannot navigate to future position:', { round, pick });
        return false;
      }
      
      // Update current position (this is a simplified version)
      // In a full implementation, this would replay the draft to the exact position
      set({
        current_round: round,
        current_pick: pick,
      });
      
      // Update permalink to reflect new position
      get().updatePermalink();
      
      return true;
    },
  }))
);

// Selectors for performance
export const selectCurrentPlayer = (state: DraftStore) => state.getCurrentPlayer();
export const selectCurrentPack = (state: DraftStore) => state.getCurrentPack();
export const selectDraftProgress = (state: DraftStore) => state.getDraftProgress();
export const selectHumanPlayer = (state: DraftStore) => 
  state.players.find(p => p.is_human) || null;