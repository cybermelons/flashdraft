/**
 * Error handling types for the Draft Session Engine
 * 
 * Comprehensive error types for validation and user feedback.
 */

export type DraftError = 
  // Pick validation errors
  | { type: 'INVALID_PICK'; message: string; cardId: string; playerId: string }
  | { type: 'CARD_NOT_AVAILABLE'; message: string; cardId: string; availableCardIds: string[] }
  | { type: 'WRONG_PLAYER_TURN'; message: string; playerId: string; expectedPlayerId: string }
  
  // Player errors
  | { type: 'PLAYER_NOT_FOUND'; message: string; playerId: string }
  | { type: 'PLAYER_ALREADY_EXISTS'; message: string; playerId: string }
  | { type: 'INVALID_PLAYER_COUNT'; message: string; count: number; min: number; max: number }
  
  // Draft state errors
  | { type: 'DRAFT_NOT_ACTIVE'; message: string; currentStatus: string }
  | { type: 'DRAFT_ALREADY_STARTED'; message: string }
  | { type: 'DRAFT_COMPLETE'; message: string }
  | { type: 'INVALID_DRAFT_STATE'; message: string; details: string }
  
  // Pack/round errors
  | { type: 'NO_PACK_AVAILABLE'; message: string; playerId: string; round: number }
  | { type: 'INVALID_ROUND'; message: string; round: number; maxRounds: number }
  | { type: 'PACK_EMPTY'; message: string; packId: string }
  
  // Action/validation errors
  | { type: 'INVALID_ACTION'; message: string; action: string }
  | { type: 'ACTION_NOT_ALLOWED'; message: string; action: string; reason: string }
  | { type: 'VALIDATION_FAILED'; message: string; field: string; value: any }
  
  // Serialization errors
  | { type: 'SERIALIZATION_ERROR'; message: string; details: string }
  | { type: 'DESERIALIZATION_ERROR'; message: string; details: string }
  | { type: 'INCOMPATIBLE_VERSION'; message: string; version: string; supportedVersions: string[] }
  
  // Bot errors
  | { type: 'BOT_ERROR'; message: string; botId: string; details: string }
  | { type: 'INVALID_BOT_PERSONALITY'; message: string; personality: string; validPersonalities: string[] };

export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: DraftError };

// ============================================================================
// ERROR CREATION HELPERS
// ============================================================================

export const DraftErrors = {
  invalidPick: (cardId: string, playerId: string, reason: string): DraftError => ({
    type: 'INVALID_PICK',
    message: `Invalid pick: ${reason}`,
    cardId,
    playerId
  }),

  cardNotAvailable: (cardId: string, availableCardIds: string[]): DraftError => ({
    type: 'CARD_NOT_AVAILABLE',
    message: `Card ${cardId} is not available in current pack`,
    cardId,
    availableCardIds
  }),

  wrongPlayerTurn: (playerId: string, expectedPlayerId: string): DraftError => ({
    type: 'WRONG_PLAYER_TURN',
    message: `It's not ${playerId}'s turn. Expected ${expectedPlayerId}`,
    playerId,
    expectedPlayerId
  }),

  playerNotFound: (playerId: string): DraftError => ({
    type: 'PLAYER_NOT_FOUND',
    message: `Player ${playerId} not found in draft`,
    playerId
  }),

  draftNotActive: (currentStatus: string): DraftError => ({
    type: 'DRAFT_NOT_ACTIVE',
    message: `Draft is not active. Current status: ${currentStatus}`,
    currentStatus
  }),

  noPackAvailable: (playerId: string, round: number): DraftError => ({
    type: 'NO_PACK_AVAILABLE',
    message: `No pack available for player ${playerId} in round ${round}`,
    playerId,
    round
  }),

  invalidAction: (action: string, reason: string): DraftError => ({
    type: 'INVALID_ACTION',
    message: `Invalid action ${action}: ${reason}`,
    action
  })
};

// ============================================================================
// ERROR UTILITIES
// ============================================================================

export function isUserFacingError(error: DraftError): boolean {
  const userFacingTypes = [
    'INVALID_PICK',
    'CARD_NOT_AVAILABLE', 
    'WRONG_PLAYER_TURN',
    'DRAFT_NOT_ACTIVE',
    'NO_PACK_AVAILABLE'
  ];
  return userFacingTypes.includes(error.type);
}

export function getErrorMessage(error: DraftError): string {
  return error.message;
}

export function getErrorDetails(error: DraftError): Record<string, any> {
  const { type, message, ...details } = error;
  return details;
}