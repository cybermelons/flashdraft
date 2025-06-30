/**
 * Seeded Draft Storage
 * 
 * Optimized storage system for seeded drafts using minimal data.
 * Stores only seed + deltas, achieving 90%+ size reduction vs current system.
 */

import type { 
  SeededDraftState, 
  MTGSetData 
} from '../types/seededDraftState';
import type { 
  StoredDraftData, 
  StoredDraftDelta,
  DraftDelta 
} from '../types/draftDelta';
import { 
  replayDraftToPosition, 
  createSeededDraft,
  startSeededDraft 
} from './draftReplayEngine';

/**
 * Save seeded draft to localStorage with optimal compression
 */
export function saveSeededDraft(draft: SeededDraftState): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Convert to storage format (minimal data only)
    const storedData: StoredDraftData = {
      id: draft.seed, // Use seed as ID
      seed: draft.seed,
      set_code: draft.setData.set_code || draft.setData.set_info?.code || 'UNKNOWN',
      set_name: draft.setData.name || draft.setData.set_info?.name || 'Unknown Set',
      created_at: draft.createdAt,
      player_count: 8,
      round_count: 3,
      deltas: draft.deltas.map(delta => ({
        event_type: delta.event_type,
        pack_number: delta.pack_number,
        pick_number: delta.pick_number,
        pick: delta.pick,
        player_id: delta.player_id,
        timestamp: delta.timestamp,
        pick_time_ms: delta.pick_time_ms
      })),
      status: draft.status,
      current_pick: draft.deltas.length
    };
    
    const dataString = JSON.stringify(storedData);
    const key = `flashdraft_seeded_${draft.seed}`;
    
    console.log(`[SeededStorage] Saving draft ${draft.seed}, size: ${dataString.length} chars`);
    
    // Check if we're approaching localStorage limits
    if (dataString.length > 100000) {
      console.warn(`[SeededStorage] Draft size unusually large: ${dataString.length} chars`);
    }
    
    localStorage.setItem(key, dataString);
    
    // Also save metadata for quick listing
    updateDraftMetadata(draft.seed, {
      id: draft.seed,
      created_at: draft.createdAt,
      set_code: storedData.set_code,
      set_name: storedData.set_name,
      status: draft.status,
      pick_count: draft.deltas.length
    });
    
    return true;
  } catch (error) {
    console.error('[SeededStorage] Failed to save draft:', error);
    
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      // Try to free up space by removing old drafts
      cleanupOldDrafts();
      
      // Retry once
      try {
        const storedData: StoredDraftData = draftToStorageFormat(draft);
        localStorage.setItem(`flashdraft_seeded_${draft.seed}`, JSON.stringify(storedData));
        return true;
      } catch (retryError) {
        console.error('[SeededStorage] Failed to save after cleanup:', retryError);
      }
    }
    
    return false;
  }
}

/**
 * Load seeded draft from localStorage
 */
export function loadSeededDraft(seed: string): SeededDraftState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `flashdraft_seeded_${seed}`;
    const data = localStorage.getItem(key);
    
    if (!data) {
      console.log(`[SeededStorage] No draft found for seed: ${seed}`);
      return null;
    }
    
    const storedData: StoredDraftData = JSON.parse(data);
    console.log(`[SeededStorage] Loaded draft ${seed}, ${storedData.deltas.length} deltas`);
    
    // We need set data to recreate the draft, but it's not stored
    // This will need to be provided by the caller or fetched from API
    return null; // Will be completed by loadSeededDraftWithSetData
  } catch (error) {
    console.error('[SeededStorage] Failed to load draft:', error);
    return null;
  }
}

/**
 * Load seeded draft with set data and replay to current position
 */
export async function loadSeededDraftWithSetData(
  seed: string,
  setData: MTGSetData
): Promise<SeededDraftState | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `flashdraft_seeded_${seed}`;
    const data = localStorage.getItem(key);
    
    if (!data) {
      console.log(`[SeededStorage] No draft found for seed: ${seed}`);
      return null;
    }
    
    const storedData: StoredDraftData = JSON.parse(data);
    console.log(`[SeededStorage] Loaded draft ${seed}, replaying ${storedData.deltas.length} deltas`);
    
    // Convert stored deltas back to full format
    const fullDeltas: DraftDelta[] = storedData.deltas.map((stored, index) => ({
      ...stored,
      event_id: `${stored.player_id}_${index + 1}`,
      overall_pick: index + 1,
      is_bot: stored.player_id.startsWith('bot'),
      bot_difficulty: extractBotDifficulty(stored.player_id)
    }));
    
    // Replay the draft to its current state
    const replayedDraft = replayDraftToPosition({
      seed: storedData.seed,
      setData,
      deltas: fullDeltas,
      targetPosition: storedData.deltas.length
    });
    
    // Update metadata to match stored data
    const finalDraft: SeededDraftState = {
      ...replayedDraft,
      id: storedData.seed,
      status: storedData.status as 'setup' | 'active' | 'complete',
      createdAt: storedData.created_at,
      setData
    };
    
    return finalDraft;
  } catch (error) {
    console.error('[SeededStorage] Failed to load draft with set data:', error);
    return null;
  }
}

/**
 * Convert draft to storage format
 */
function draftToStorageFormat(draft: SeededDraftState): StoredDraftData {
  return {
    id: draft.seed,
    seed: draft.seed,
    set_code: draft.setData.set_code || draft.setData.set_info?.code || 'UNKNOWN',
    set_name: draft.setData.name || draft.setData.set_info?.name || 'Unknown Set',
    created_at: draft.createdAt,
    player_count: 8,
    round_count: 3,
    deltas: draft.deltas.map(delta => ({
      event_type: delta.event_type,
      pack_number: delta.pack_number,
      pick_number: delta.pick_number,
      pick: delta.pick,
      player_id: delta.player_id,
      timestamp: delta.timestamp,
      pick_time_ms: delta.pick_time_ms
    })),
    status: draft.status,
    current_pick: draft.deltas.length
  };
}

/**
 * Extract bot difficulty from player ID
 */
function extractBotDifficulty(playerId: string): 'bronze' | 'silver' | 'gold' | 'mythic' | undefined {
  if (!playerId.startsWith('bot')) return undefined;
  
  const botNumber = parseInt(playerId.replace(/\D/g, ''));
  const difficulties: Array<'bronze' | 'silver' | 'gold' | 'mythic'> = 
    ['bronze', 'silver', 'gold', 'mythic'];
  
  return difficulties[(botNumber - 1) % 4];
}

/**
 * Interface for draft metadata
 */
interface DraftMetadata {
  id: string;
  created_at: number;
  set_code: string;
  set_name: string;
  status: 'setup' | 'active' | 'complete';
  pick_count: number;
}

/**
 * Update draft metadata index for quick listing
 */
function updateDraftMetadata(seed: string, metadata: DraftMetadata): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = getDraftMetadataList();
    const updated = existing.filter(m => m.id !== seed);
    updated.push(metadata);
    
    // Keep only most recent 10 drafts to save space
    updated.sort((a, b) => b.created_at - a.created_at);
    const trimmed = updated.slice(0, 10);
    
    localStorage.setItem('flashdraft_seeded_metadata', JSON.stringify(trimmed));
  } catch (error) {
    console.error('[SeededStorage] Failed to update metadata:', error);
  }
}

/**
 * Get list of all draft metadata
 */
export function getDraftMetadataList(): DraftMetadata[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem('flashdraft_seeded_metadata');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[SeededStorage] Failed to load metadata:', error);
    return [];
  }
}

/**
 * Check if a draft exists
 */
export function draftExists(seed: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`flashdraft_seeded_${seed}`) !== null;
}

/**
 * Delete a draft
 */
export function deleteSeededDraft(seed: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const key = `flashdraft_seeded_${seed}`;
    localStorage.removeItem(key);
    
    // Remove from metadata
    const metadata = getDraftMetadataList();
    const filtered = metadata.filter(m => m.id !== seed);
    localStorage.setItem('flashdraft_seeded_metadata', JSON.stringify(filtered));
    
    console.log(`[SeededStorage] Deleted draft: ${seed}`);
    return true;
  } catch (error) {
    console.error('[SeededStorage] Failed to delete draft:', error);
    return false;
  }
}

/**
 * Clean up old drafts to free storage space
 */
export function cleanupOldDrafts(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const metadata = getDraftMetadataList();
    
    // Sort by age and keep only 5 most recent
    metadata.sort((a, b) => b.created_at - a.created_at);
    const toDelete = metadata.slice(5);
    
    let deletedCount = 0;
    for (const draft of toDelete) {
      if (deleteSeededDraft(draft.id)) {
        deletedCount++;
      }
    }
    
    console.log(`[SeededStorage] Cleaned up ${deletedCount} old drafts`);
    return deletedCount;
  } catch (error) {
    console.error('[SeededStorage] Failed to cleanup old drafts:', error);
    return 0;
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  totalDrafts: number;
  totalSize: number;
  averageSize: number;
  oldestDraft?: Date;
  newestDraft?: Date;
} {
  if (typeof window === 'undefined') {
    return { totalDrafts: 0, totalSize: 0, averageSize: 0 };
  }
  
  try {
    const metadata = getDraftMetadataList();
    let totalSize = 0;
    
    // Calculate total size
    for (const draft of metadata) {
      const data = localStorage.getItem(`flashdraft_seeded_${draft.id}`);
      if (data) {
        totalSize += data.length;
      }
    }
    
    const timestamps = metadata.map(m => m.created_at).filter(Boolean);
    
    return {
      totalDrafts: metadata.length,
      totalSize,
      averageSize: metadata.length > 0 ? totalSize / metadata.length : 0,
      oldestDraft: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
      newestDraft: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined
    };
  } catch (error) {
    console.error('[SeededStorage] Failed to get storage stats:', error);
    return { totalDrafts: 0, totalSize: 0, averageSize: 0 };
  }
}

/**
 * Export draft as JSON for sharing
 */
export function exportDraft(seed: string): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(`flashdraft_seeded_${seed}`);
    if (!data) return null;
    
    const storedData = JSON.parse(data);
    
    // Create export format with additional metadata
    const exportData = {
      version: '1.0',
      exported_at: Date.now(),
      draft: storedData
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('[SeededStorage] Failed to export draft:', error);
    return null;
  }
}

/**
 * Import draft from JSON
 */
export function importDraft(jsonData: string): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const importData = JSON.parse(jsonData);
    
    if (!importData.draft || !importData.draft.seed) {
      throw new Error('Invalid draft format');
    }
    
    const storedData: StoredDraftData = importData.draft;
    const key = `flashdraft_seeded_${storedData.seed}`;
    
    // Check if draft already exists
    if (localStorage.getItem(key)) {
      throw new Error(`Draft with seed ${storedData.seed} already exists`);
    }
    
    localStorage.setItem(key, JSON.stringify(storedData));
    
    // Update metadata
    updateDraftMetadata(storedData.seed, {
      id: storedData.seed,
      created_at: storedData.created_at,
      set_code: storedData.set_code,
      set_name: storedData.set_name,
      status: storedData.status,
      pick_count: storedData.deltas.length
    });
    
    console.log(`[SeededStorage] Imported draft: ${storedData.seed}`);
    return storedData.seed;
  } catch (error) {
    console.error('[SeededStorage] Failed to import draft:', error);
    return null;
  }
}