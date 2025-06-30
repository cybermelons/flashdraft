/**
 * Draft Actions - Event Sourcing Action Types
 * 
 * Pure action definitions for the draft state machine.
 * All state changes in the draft engine go through these actions.
 */

export interface BaseAction {
  type: string;
  timestamp: number;
  id: string;
}

export interface CreateDraftAction extends BaseAction {
  type: 'CREATE_DRAFT';
  payload: {
    draftId: string;
    seed: string;
    setCode: string;
    playerCount: number;
    humanPlayerIndex: number;
  };
}

export interface StartDraftAction extends BaseAction {
  type: 'START_DRAFT';
  payload: {
    draftId: string;
  };
}

export interface HumanPickAction extends BaseAction {
  type: 'HUMAN_PICK';
  payload: {
    draftId: string;
    cardId: string;
    packIndex: number;
    pickIndex: number;
  };
}

export interface BotPickAction extends BaseAction {
  type: 'BOT_PICK';
  payload: {
    draftId: string;
    playerIndex: number;
    cardId: string;
    packIndex: number;
    pickIndex: number;
  };
}

export interface PassPacksAction extends BaseAction {
  type: 'PASS_PACKS';
  payload: {
    draftId: string;
    round: number;
  };
}

export interface AdvancePositionAction extends BaseAction {
  type: 'ADVANCE_POSITION';
  payload: {
    draftId: string;
    newRound: number;
    newPick: number;
  };
}

export interface StartRoundAction extends BaseAction {
  type: 'START_ROUND';
  payload: {
    draftId: string;
    round: number;
  };
}

export interface CompleteDraftAction extends BaseAction {
  type: 'COMPLETE_DRAFT';
  payload: {
    draftId: string;
    finalDecks: Record<number, string[]>; // playerIndex -> cardIds
  };
}

export type DraftAction = 
  | CreateDraftAction
  | StartDraftAction
  | HumanPickAction
  | BotPickAction
  | PassPacksAction
  | AdvancePositionAction
  | StartRoundAction
  | CompleteDraftAction;

// Action creators
export const createDraft = (
  draftId: string,
  seed: string,
  setCode: string,
  playerCount: number = 8,
  humanPlayerIndex: number = 0
): CreateDraftAction => ({
  type: 'CREATE_DRAFT',
  timestamp: Date.now(),
  id: `create_${draftId}_${Date.now()}`,
  payload: {
    draftId,
    seed,
    setCode,
    playerCount,
    humanPlayerIndex,
  },
});

export const startDraft = (draftId: string): StartDraftAction => ({
  type: 'START_DRAFT',
  timestamp: Date.now(),
  id: `start_${draftId}_${Date.now()}`,
  payload: { draftId },
});

export const humanPick = (
  draftId: string,
  cardId: string,
  packIndex: number,
  pickIndex: number
): HumanPickAction => ({
  type: 'HUMAN_PICK',
  timestamp: Date.now(),
  id: `human_pick_${draftId}_${packIndex}_${pickIndex}`,
  payload: {
    draftId,
    cardId,
    packIndex,
    pickIndex,
  },
});

export const botPick = (
  draftId: string,
  playerIndex: number,
  cardId: string,
  packIndex: number,
  pickIndex: number
): BotPickAction => ({
  type: 'BOT_PICK',
  timestamp: Date.now(),
  id: `bot_pick_${draftId}_${playerIndex}_${packIndex}_${pickIndex}`,
  payload: {
    draftId,
    playerIndex,
    cardId,
    packIndex,
    pickIndex,
  },
});

export const passPacks = (draftId: string, round: number): PassPacksAction => ({
  type: 'PASS_PACKS',
  timestamp: Date.now(),
  id: `pass_packs_${draftId}_${round}`,
  payload: {
    draftId,
    round,
  },
});

export const advancePosition = (
  draftId: string,
  newRound: number,
  newPick: number
): AdvancePositionAction => ({
  type: 'ADVANCE_POSITION',
  timestamp: Date.now(),
  id: `advance_${draftId}_${newRound}_${newPick}`,
  payload: {
    draftId,
    newRound,
    newPick,
  },
});

export const startRound = (draftId: string, round: number): StartRoundAction => ({
  type: 'START_ROUND',
  timestamp: Date.now(),
  id: `start_round_${draftId}_${round}`,
  payload: {
    draftId,
    round,
  },
});

export const completeDraft = (
  draftId: string,
  finalDecks: Record<number, string[]>
): CompleteDraftAction => ({
  type: 'COMPLETE_DRAFT',
  timestamp: Date.now(),
  id: `complete_${draftId}_${Date.now()}`,
  payload: {
    draftId,
    finalDecks,
  },
});