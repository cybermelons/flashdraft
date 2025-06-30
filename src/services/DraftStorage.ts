/**
 * Draft Storage - Compact Action-Based Persistence
 * 
 * Stores only seed + action history for 90%+ size reduction.
 * Uses localStorage with efficient serialization.
 * Replays actions to reconstruct full state when needed.
 */

import type { DraftAction, SerializedAction } from './types/DraftActions';
import { serializeAction, deserializeAction } from './types/DraftActions';

export interface DraftStorageConfig {
  // Maximum number of drafts to keep in storage
  maxDrafts?: number;
  // Storage key prefix
  keyPrefix?: string;
}

export interface StoredDraft {
  seed: string;
  actions: SerializedAction[];
  metadata: {
    created: number;
    lastModified: number;
    setCode: string;
    setName?: string;
    totalPicks: number;
    currentRound: number;
    currentPick: number;
    status: 'setup' | 'active' | 'complete';
  };
}

export interface DraftMetadata {
  seed: string;
  created: number;
  lastModified: number;
  setCode: string;
  setName?: string;
  totalPicks: number;
  currentRound: number;
  currentPick: number;
  status: 'setup' | 'active' | 'complete';
}

/**
 * Storage interface for draft persistence
 */
export interface DraftStorage {
  save(seed: string, actions: DraftAction[], metadata?: Partial<DraftMetadata>): Promise<void>;
  load(seed: string): Promise<{ actions: DraftAction[] } | null>;
  list(): Promise<DraftMetadata[]>;
  delete(seed: string): Promise<boolean>;
  clear(): Promise<void>;
}

/**
 * LocalStorage-based draft storage implementation
 */
export class LocalDraftStorage implements DraftStorage {
  private config: Required<DraftStorageConfig>;

  constructor(config: DraftStorageConfig = {}) {
    this.config = {
      maxDrafts: config.maxDrafts || 10,
      keyPrefix: config.keyPrefix || 'flashdraft_v2_'
    };
  }

  /**
   * Save draft as seed + action history
   * 90%+ smaller than storing full state
   */
  async save(seed: string, actions: DraftAction[], metadata?: Partial<DraftMetadata>): Promise<void> {
    if (typeof window === 'undefined') return; // Server-side safety

    try {
      // Serialize actions for compact storage
      const serializedActions = actions.map(serializeAction);
      
      // Create storage-optimized metadata
      const defaultMetadata: DraftMetadata = {
        seed,
        created: Date.now(),
        lastModified: Date.now(),
        setCode: 'UNKNOWN',
        totalPicks: 0,
        currentRound: 1,
        currentPick: 1,
        status: 'setup'
      };

      // Extract metadata from actions if not provided
      const extractedMetadata = this.extractMetadataFromActions(actions);
      const finalMetadata = { ...defaultMetadata, ...extractedMetadata, ...metadata };

      const storedDraft: StoredDraft = {
        seed,
        actions: serializedActions,
        metadata: finalMetadata
      };

      const key = this.getStorageKey(seed);
      const dataString = JSON.stringify(storedDraft);
      
      console.log(`[DraftStorage] Saving draft ${seed}, size: ${dataString.length} chars`);
      
      // Save to localStorage
      localStorage.setItem(key, dataString);
      
      // Cleanup old drafts if over limit
      await this.cleanupOldDrafts();
      
    } catch (error) {
      console.error('[DraftStorage] Failed to save draft:', error);
      
      // Handle quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.log('[DraftStorage] Storage quota exceeded, cleaning up...');
        await this.cleanupOldDrafts(true); // Force cleanup
        
        // Retry save
        try {
          const key = this.getStorageKey(seed);
          const storedDraft: StoredDraft = {
            seed,
            actions: actions.map(serializeAction),
            metadata: { ...this.extractMetadataFromActions(actions), ...metadata } as DraftMetadata
          };
          localStorage.setItem(key, JSON.stringify(storedDraft));
        } catch (retryError) {
          console.error('[DraftStorage] Failed to save draft after cleanup:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Load draft action history
   */
  async load(seed: string): Promise<{ actions: DraftAction[] } | null> {
    if (typeof window === 'undefined') return null; // Server-side safety

    try {
      const key = this.getStorageKey(seed);
      const dataString = localStorage.getItem(key);
      
      if (!dataString) {
        console.log(`[DraftStorage] No draft found for seed: ${seed}`);
        return null;
      }

      const storedDraft: StoredDraft = JSON.parse(dataString);
      const actions = storedDraft.actions.map(deserializeAction);
      
      console.log(`[DraftStorage] Loaded draft ${seed} with ${actions.length} actions`);
      
      return { actions };
    } catch (error) {
      console.error(`[DraftStorage] Failed to load draft ${seed}:`, error);
      return null;
    }
  }

  /**
   * List all stored drafts with metadata
   */
  async list(): Promise<DraftMetadata[]> {
    if (typeof window === 'undefined') return []; // Server-side safety

    try {
      const drafts: DraftMetadata[] = [];
      const prefix = this.config.keyPrefix;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          try {
            const dataString = localStorage.getItem(key);
            if (dataString) {
              const storedDraft: StoredDraft = JSON.parse(dataString);
              drafts.push(storedDraft.metadata);
            }
          } catch (error) {
            console.warn(`[DraftStorage] Failed to parse draft from key ${key}:`, error);
          }
        }
      }
      
      // Sort by last modified (newest first)
      drafts.sort((a, b) => b.lastModified - a.lastModified);
      
      return drafts;
    } catch (error) {
      console.error('[DraftStorage] Failed to list drafts:', error);
      return [];
    }
  }

  /**
   * Delete a specific draft
   */
  async delete(seed: string): Promise<boolean> {
    if (typeof window === 'undefined') return false; // Server-side safety

    try {
      const key = this.getStorageKey(seed);
      localStorage.removeItem(key);
      console.log(`[DraftStorage] Deleted draft: ${seed}`);
      return true;
    } catch (error) {
      console.error(`[DraftStorage] Failed to delete draft ${seed}:`, error);
      return false;
    }
  }

  /**
   * Clear all drafts
   */
  async clear(): Promise<void> {
    if (typeof window === 'undefined') return; // Server-side safety

    try {
      const prefix = this.config.keyPrefix;
      const keysToDelete: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => localStorage.removeItem(key));
      console.log(`[DraftStorage] Cleared ${keysToDelete.length} drafts`);
    } catch (error) {
      console.error('[DraftStorage] Failed to clear drafts:', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getStorageKey(seed: string): string {
    return `${this.config.keyPrefix}${seed}`;
  }

  private extractMetadataFromActions(actions: DraftAction[]): Partial<DraftMetadata> {
    const metadata: Partial<DraftMetadata> = {
      lastModified: Date.now()
    };

    // Extract set code from CREATE_DRAFT action
    const createAction = actions.find(a => a.type === 'CREATE_DRAFT');
    if (createAction && createAction.type === 'CREATE_DRAFT') {
      metadata.setCode = createAction.setCode;
    }

    // Count human picks to determine progress
    const humanPicks = actions.filter(a => a.type === 'HUMAN_PICK').length;
    metadata.totalPicks = humanPicks;

    // Calculate current position
    if (humanPicks > 0) {
      metadata.currentRound = Math.min(3, Math.floor((humanPicks - 1) / 15) + 1);
      metadata.currentPick = ((humanPicks - 1) % 15) + 1;
    }

    // Determine status
    if (actions.some(a => a.type === 'COMPLETE_DRAFT')) {
      metadata.status = 'complete';
    } else if (actions.some(a => a.type === 'START_DRAFT')) {
      metadata.status = 'active';
    } else {
      metadata.status = 'setup';
    }

    return metadata;
  }

  private async cleanupOldDrafts(force = false): Promise<void> {
    try {
      const drafts = await this.list();
      const maxDrafts = force ? Math.floor(this.config.maxDrafts / 2) : this.config.maxDrafts;
      
      if (drafts.length > maxDrafts) {
        // Sort by last modified (oldest first for deletion)
        const sortedDrafts = [...drafts].sort((a, b) => a.lastModified - b.lastModified);
        const toDelete = sortedDrafts.slice(0, drafts.length - maxDrafts);
        
        for (const draft of toDelete) {
          await this.delete(draft.seed);
        }
        
        console.log(`[DraftStorage] Cleaned up ${toDelete.length} old drafts`);
      }
    } catch (error) {
      console.error('[DraftStorage] Failed to cleanup old drafts:', error);
    }
  }
}

/**
 * Storage utilities for development and debugging
 */
export const storageUtils = {
  /**
   * Get storage usage statistics
   */
  getStorageStats: async (storage: DraftStorage): Promise<{
    totalDrafts: number;
    totalSize: number;
    averageSize: number;
    oldestDraft: Date | null;
    newestDraft: Date | null;
  }> => {
    if (typeof window === 'undefined') {
      return { totalDrafts: 0, totalSize: 0, averageSize: 0, oldestDraft: null, newestDraft: null };
    }

    const drafts = await storage.list();
    let totalSize = 0;
    
    // Calculate total storage size for draft keys
    const prefix = 'flashdraft_v2_';
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }

    const oldestDraft = drafts.length > 0 ? new Date(Math.min(...drafts.map(d => d.created))) : null;
    const newestDraft = drafts.length > 0 ? new Date(Math.max(...drafts.map(d => d.lastModified))) : null;

    return {
      totalDrafts: drafts.length,
      totalSize,
      averageSize: drafts.length > 0 ? totalSize / drafts.length : 0,
      oldestDraft,
      newestDraft
    };
  },

  /**
   * Export drafts to JSON for backup
   */
  exportDrafts: async (storage: DraftStorage): Promise<string> => {
    const drafts = await storage.list();
    const exportData = [];

    for (const metadata of drafts) {
      const draftData = await storage.load(metadata.seed);
      if (draftData) {
        exportData.push({
          metadata,
          actions: draftData.actions
        });
      }
    }

    return JSON.stringify(exportData, null, 2);
  }
};

/**
 * Default storage instance
 */
export const draftStorage = new LocalDraftStorage();