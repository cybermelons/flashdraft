/**
 * Draft Action Types
 * 
 * Named actions with parameters following Redux-style patterns.
 * Each action represents a state transition in the draft.
 */

import type { MTGSetData } from '../../shared/types/seededDraftState';

// Core draft actions (discriminated union for type safety)
export type DraftAction = 
  | { type: 'CREATE_DRAFT'; setCode: string }
  | { type: 'START_DRAFT' }
  | { type: 'HUMAN_PICK'; cardId: string }
  | { type: 'BOT_PICK'; playerId: string; cardId: string }
  | { type: 'PASS_PACKS' }
  | { type: 'ADVANCE_POSITION' }
  | { type: 'START_ROUND'; round: number }
  | { type: 'COMPLETE_DRAFT' };

// Serializable action format for storage
export interface SerializedAction {
  type: DraftAction['type'];
  payload: Record<string, any>;
  timestamp: number;
}

// Action creators for type safety
export const createAction = {
  createDraft: (setCode: string): DraftAction => ({
    type: 'CREATE_DRAFT',
    setCode
  }),
  
  startDraft: (): DraftAction => ({
    type: 'START_DRAFT'
  }),
  
  humanPick: (cardId: string): DraftAction => ({
    type: 'HUMAN_PICK',
    cardId
  }),
  
  botPick: (playerId: string, cardId: string): DraftAction => ({
    type: 'BOT_PICK',
    playerId,
    cardId
  }),
  
  passPacks: (): DraftAction => ({
    type: 'PASS_PACKS'
  }),
  
  advancePosition: (): DraftAction => ({
    type: 'ADVANCE_POSITION'
  }),
  
  startRound: (round: number): DraftAction => ({
    type: 'START_ROUND',
    round
  }),
  
  completeDraft: (): DraftAction => ({
    type: 'COMPLETE_DRAFT'
  })
};

// Utility to serialize actions for storage
export function serializeAction(action: DraftAction): SerializedAction {
  const { type, ...payload } = action;
  return {
    type,
    payload,
    timestamp: Date.now()
  };
}

// Utility to deserialize actions from storage
export function deserializeAction(serialized: SerializedAction): DraftAction {
  const { type, payload } = serialized;
  
  return {
    type,
    ...payload
  } as DraftAction;
}