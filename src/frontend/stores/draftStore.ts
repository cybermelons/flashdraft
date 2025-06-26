/**
 * FlashDraft - Draft State Management
 * 
 * Zustand store for managing draft state, including packs,
 * picks, player data, and draft flow control.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { DraftCard, MTGSetData } from '../../shared/types/card.js';
import type { GeneratedPack } from '../utils/clientPackGenerator.js';

export interface DraftPlayer {
  id: string;
  name: string;
  is_human: boolean;
  position: number; // Seat position (0-7)
  picked_cards: DraftCard[];
  current_pack?: GeneratedPack;
  total_picks: number;
}

export interface DraftState {
  // Draft configuration
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
  addPlayer: (name: string, isHuman: boolean) => void;
  removePlayer: (playerId: string) => void;
  setCurrentPlayer: (playerId: string) => void;
  
  // Draft flow actions
  startDraft: () => void;
  makePickBy: (playerId: string, card: DraftCard) => void;
  passPacks: () => void;
  nextRound: () => void;
  completeDraft: () => void;
  
  // Pack management
  setActivePacks: (packs: GeneratedPack[]) => void;
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
}

type DraftStore = DraftState & DraftActions;

const initialState: DraftState = {
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
      set({
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
        pack_history: [],
        selected_card: null,
        pick_times: [],
        draft_start_time: null,
      });

      // Add default players
      const { addPlayer } = get();
      addPlayer('You', true); // Human player
      
      for (let i = 1; i < playerCount; i++) {
        addPlayer(`Bot ${i}`, false);
      }
    },

    resetDraft: () => {
      set(initialState);
    },

    // Player actions
    addPlayer: (name: string, isHuman: boolean) => {
      const state = get();
      const newPlayer: DraftPlayer = {
        id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        is_human: isHuman,
        position: state.players.length,
        picked_cards: [],
        total_picks: 0,
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
        if (p.id === playerId) {
          return {
            ...p,
            picked_cards: [...p.picked_cards, card],
            total_picks: p.total_picks + 1,
            current_pack: {
              ...p.current_pack!,
              cards: p.current_pack!.cards.filter(c => c.id !== card.id),
              pick_number: p.current_pack!.pick_number + 1,
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

      // Auto-advance to next pick or trigger pack passing
      const updatedPlayer = updatedPlayers.find(p => p.id === playerId);
      if (updatedPlayer?.current_pack?.cards.length === 0) {
        // Pack is empty, need to pass or end round
        get().passPacks();
      }
    },

    passPacks: () => {
      const state = get();
      const { direction, players, current_round } = state;

      // Calculate next positions based on direction
      const playerCount = players.length;
      const updatedPlayers = players.map(player => {
        if (!player.current_pack || player.current_pack.cards.length === 0) {
          return { ...player, current_pack: undefined };
        }

        // Find next player position
        let nextPosition;
        if (direction === 'clockwise') {
          nextPosition = (player.position + 1) % playerCount;
        } else {
          nextPosition = (player.position - 1 + playerCount) % playerCount;
        }

        const nextPlayer = players.find(p => p.position === nextPosition);
        return nextPlayer ? { ...nextPlayer, current_pack: player.current_pack } : player;
      });

      set({ players: updatedPlayers });

      // Check if round is complete (all packs empty)
      const anyPacksRemaining = updatedPlayers.some(p => 
        p.current_pack && p.current_pack.cards.length > 0
      );

      if (!anyPacksRemaining) {
        get().nextRound();
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

      set({
        current_round: nextRound,
        current_pick: 1,
        direction: newDirection,
      });

      // This would trigger new pack generation in the UI
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
  }))
);

// Selectors for performance
export const selectCurrentPlayer = (state: DraftStore) => state.getCurrentPlayer();
export const selectCurrentPack = (state: DraftStore) => state.getCurrentPack();
export const selectDraftProgress = (state: DraftStore) => state.getDraftProgress();
export const selectHumanPlayer = (state: DraftStore) => 
  state.players.find(p => p.is_human) || null;