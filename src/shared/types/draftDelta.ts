/**
 * Draft Delta Types
 * 
 * Compatible with 17lands data format for future analysis capabilities.
 * Each delta represents a single action in the draft.
 */

export interface DraftDelta {
  // Event identification
  event_type: 'pick' | 'pass' | 'timeout';
  event_id: string;        // Unique ID for this event
  
  // Draft position
  pack_number: number;     // 1-3 (round)
  pick_number: number;     // 1-15 (pick within round)
  overall_pick: number;    // 1-45 (absolute position in draft)
  
  // Pick data
  pick: string;            // Card name/id that was picked
  player_id: string;       // Who made the pick
  
  // Context for analysis (minimal for storage)
  pool_snapshot?: string[];     // Card IDs in pool before pick (optional for storage)
  pack_snapshot?: string[];     // Card IDs available in pack (optional for storage)
  
  // Metadata
  timestamp: number;       // When the pick was made
  pick_time_ms?: number;   // Time taken to make the pick
  
  // Additional 17lands compatibility
  is_bot?: boolean;        // Whether this was a bot pick
  bot_difficulty?: 'bronze' | 'silver' | 'gold' | 'mythic';
}

/**
 * Compressed delta for storage (only essential data)
 */
export interface StoredDraftDelta {
  event_type: 'pick' | 'pass' | 'timeout';
  pack_number: number;
  pick_number: number;
  pick: string;
  player_id: string;
  timestamp: number;
  pick_time_ms?: number;
}

/**
 * Full draft replay data structure for storage
 */
export interface StoredDraftData {
  // Draft identification
  id: string;              // Same as seed for new system
  seed: string;            // Deterministic seed
  
  // Set information
  set_code: string;
  set_name: string;
  
  // Draft metadata
  created_at: number;
  player_count: number;    // Always 8 for now
  round_count: number;     // Always 3 for now
  
  // The actual draft history
  deltas: StoredDraftDelta[];
  
  // Status
  status: 'setup' | 'active' | 'complete';
  current_pick?: number;   // Last pick made (1-45)
}

/**
 * Convert full delta to storage format
 */
export function deltaToStorageFormat(delta: DraftDelta): StoredDraftDelta {
  return {
    event_type: delta.event_type,
    pack_number: delta.pack_number,
    pick_number: delta.pick_number,
    pick: delta.pick,
    player_id: delta.player_id,
    timestamp: delta.timestamp,
    pick_time_ms: delta.pick_time_ms
  };
}

/**
 * Expand storage delta to full format (for analysis)
 */
export function deltaFromStorageFormat(
  stored: StoredDraftDelta, 
  overallPick: number,
  eventId?: string
): DraftDelta {
  return {
    ...stored,
    event_id: eventId || `${stored.player_id}_${overallPick}`,
    overall_pick: overallPick,
    is_bot: stored.player_id.startsWith('bot'),
    bot_difficulty: extractBotDifficulty(stored.player_id)
  };
}

/**
 * Extract bot difficulty from player ID
 */
function extractBotDifficulty(playerId: string): 'bronze' | 'silver' | 'gold' | 'mythic' | undefined {
  if (!playerId.startsWith('bot')) return undefined;
  
  // For now, assign difficulties in order
  const botNumber = parseInt(playerId.replace('bot', ''));
  const difficulties: Array<'bronze' | 'silver' | 'gold' | 'mythic'> = 
    ['bronze', 'silver', 'gold', 'mythic'];
  
  return difficulties[(botNumber - 1) % 4];
}

/**
 * Calculate storage size for a complete draft
 */
export function estimateStorageSize(deltaCount: number): {
  current: number;  // Current system size
  new: number;      // New system size  
  savings: number;  // Bytes saved
} {
  // Current system: ~40KB full state
  const current = 40 * 1024;
  
  // New system: seed (12 bytes) + deltas
  const seedSize = 12;
  const deltaSize = 80; // Estimated bytes per stored delta
  const metadataSize = 100; // Draft metadata
  
  const newSize = seedSize + (deltaCount * deltaSize) + metadataSize;
  
  return {
    current,
    new: newSize,
    savings: current - newSize
  };
}

/**
 * Validate delta structure
 */
export function isValidDelta(delta: any): delta is DraftDelta {
  return (
    typeof delta === 'object' &&
    typeof delta.event_type === 'string' &&
    ['pick', 'pass', 'timeout'].includes(delta.event_type) &&
    typeof delta.pack_number === 'number' &&
    delta.pack_number >= 1 && delta.pack_number <= 3 &&
    typeof delta.pick_number === 'number' &&
    delta.pick_number >= 1 && delta.pick_number <= 15 &&
    typeof delta.overall_pick === 'number' &&
    delta.overall_pick >= 1 && delta.overall_pick <= 45 &&
    typeof delta.pick === 'string' &&
    typeof delta.player_id === 'string' &&
    typeof delta.timestamp === 'number'
  );
}

/**
 * Create a new draft delta
 */
export function createDraftDelta(
  eventType: 'pick' | 'pass' | 'timeout',
  packNumber: number,
  pickNumber: number,
  overallPick: number,
  pick: string,
  playerId: string,
  pickTimeMs?: number
): DraftDelta {
  return {
    event_type: eventType,
    event_id: `${playerId}_${overallPick}`,
    pack_number: packNumber,
    pick_number: pickNumber,
    overall_pick: overallPick,
    pick: pick,
    player_id: playerId,
    timestamp: Date.now(),
    pick_time_ms: pickTimeMs,
    is_bot: playerId.startsWith('bot'),
    bot_difficulty: extractBotDifficulty(playerId)
  };
}