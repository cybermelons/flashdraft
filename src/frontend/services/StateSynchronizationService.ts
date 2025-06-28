/**
 * State Synchronization Service
 * 
 * Manages synchronization between the DraftSession engine state and various
 * UI representations, including URL state, localStorage, and component state.
 */

import { DraftSession } from '../../engine/DraftSession';
import type { DraftState, DraftAction } from '../../engine/types/core';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SyncTarget {
  id: string;
  name: string;
  sync: (state: DraftState) => void;
  isEnabled: () => boolean;
}

export interface SyncOptions {
  enableURLSync?: boolean;
  enableStorageSync?: boolean;
  enableBroadcastSync?: boolean;
  debounceMs?: number;
  enableDeepComparison?: boolean;
}

export interface StateSnapshot {
  timestamp: number;
  round: number;
  pick: number;
  draftId: string;
  status: string;
  checksum: string;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class StateSynchronizationService {
  private targets: Map<string, SyncTarget> = new Map();
  private lastSnapshot: StateSnapshot | null = null;
  private syncTimer: number | null = null;
  private options: Required<SyncOptions>;
  private eventListeners: Set<(event: SyncEvent) => void> = new Set();

  constructor(options: SyncOptions = {}) {
    this.options = {
      enableURLSync: options.enableURLSync ?? true,
      enableStorageSync: options.enableStorageSync ?? true,
      enableBroadcastSync: options.enableBroadcastSync ?? true,
      debounceMs: options.debounceMs ?? 100,
      enableDeepComparison: options.enableDeepComparison ?? true
    };

    this.initializeDefaultTargets();
  }

  // ============================================================================
  // TARGET MANAGEMENT
  // ============================================================================

  registerTarget(target: SyncTarget): void {
    this.targets.set(target.id, target);
  }

  unregisterTarget(targetId: string): void {
    this.targets.delete(targetId);
  }

  listTargets(): SyncTarget[] {
    return Array.from(this.targets.values());
  }

  // ============================================================================
  // SYNCHRONIZATION
  // ============================================================================

  syncState(session: DraftSession): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = window.setTimeout(() => {
      this.performSync(session);
    }, this.options.debounceMs);
  }

  forceSyncState(session: DraftSession): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.performSync(session);
  }

  private performSync(session: DraftSession): void {
    const state = session.state;
    const currentSnapshot = this.createSnapshot(state);

    // Skip sync if state hasn't changed (when deep comparison is enabled)
    if (this.options.enableDeepComparison && this.isSnapshotEqual(currentSnapshot, this.lastSnapshot)) {
      return;
    }

    // Emit sync start event
    this.emitEvent({
      type: 'sync_start',
      timestamp: Date.now(),
      draftId: state.id,
      snapshot: currentSnapshot
    });

    // Sync to all enabled targets
    const enabledTargets = Array.from(this.targets.values()).filter(target => target.isEnabled());
    const syncResults: { targetId: string; success: boolean; error?: string }[] = [];

    for (const target of enabledTargets) {
      try {
        target.sync(state);
        syncResults.push({ targetId: target.id, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        syncResults.push({ targetId: target.id, success: false, error: errorMessage });
        console.warn(`Sync failed for target ${target.id}:`, error);
      }
    }

    // Update last snapshot
    this.lastSnapshot = currentSnapshot;

    // Emit sync complete event
    this.emitEvent({
      type: 'sync_complete',
      timestamp: Date.now(),
      draftId: state.id,
      snapshot: currentSnapshot,
      results: syncResults
    });
  }

  // ============================================================================
  // SNAPSHOT MANAGEMENT
  // ============================================================================

  private createSnapshot(state: DraftState): StateSnapshot {
    const checksum = this.calculateStateChecksum(state);
    
    return {
      timestamp: Date.now(),
      round: state.currentRound,
      pick: state.currentPick,
      draftId: state.id,
      status: state.status,
      checksum
    };
  }

  private isSnapshotEqual(current: StateSnapshot, previous: StateSnapshot | null): boolean {
    if (!previous) return false;
    return current.checksum === previous.checksum;
  }

  private calculateStateChecksum(state: DraftState): string {
    // Create a simple checksum of key state properties
    const key = `${state.id}-${state.currentRound}-${state.currentPick}-${state.status}-${state.history.length}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ============================================================================
  // DEFAULT SYNC TARGETS
  // ============================================================================

  private initializeDefaultTargets(): void {
    // URL synchronization target
    if (this.options.enableURLSync) {
      this.registerTarget({
        id: 'url',
        name: 'URL State',
        sync: (state) => this.syncToURL(state),
        isEnabled: () => this.options.enableURLSync && typeof window !== 'undefined'
      });
    }

    // Local storage synchronization target
    if (this.options.enableStorageSync) {
      this.registerTarget({
        id: 'storage',
        name: 'Local Storage',
        sync: (state) => this.syncToStorage(state),
        isEnabled: () => this.options.enableStorageSync && typeof localStorage !== 'undefined'
      });
    }

    // Broadcast channel synchronization (for multi-tab sync)
    if (this.options.enableBroadcastSync) {
      this.registerTarget({
        id: 'broadcast',
        name: 'Broadcast Channel',
        sync: (state) => this.syncToBroadcast(state),
        isEnabled: () => this.options.enableBroadcastSync && typeof BroadcastChannel !== 'undefined'
      });
    }
  }

  private syncToURL(state: DraftState): void {
    const expectedURL = `/draft/${state.id}/p${state.currentRound}p${state.currentPick}`;
    
    if (window.location.pathname !== expectedURL) {
      window.history.replaceState(
        { draftId: state.id, round: state.currentRound, pick: state.currentPick },
        '',
        expectedURL
      );
    }
  }

  private syncToStorage(state: DraftState): void {
    const syncData = {
      draftId: state.id,
      currentRound: state.currentRound,
      currentPick: state.currentPick,
      status: state.status,
      timestamp: Date.now()
    };
    
    localStorage.setItem('flashdraft_current_state', JSON.stringify(syncData));
  }

  private broadcastChannel: BroadcastChannel | null = null;

  private syncToBroadcast(state: DraftState): void {
    if (!this.broadcastChannel) {
      this.broadcastChannel = new BroadcastChannel('flashdraft_sync');
    }

    const syncMessage = {
      type: 'state_update',
      draftId: state.id,
      currentRound: state.currentRound,
      currentPick: state.currentPick,
      status: state.status,
      timestamp: Date.now()
    };

    this.broadcastChannel.postMessage(syncMessage);
  }

  // ============================================================================
  // EVENT MANAGEMENT
  // ============================================================================

  addEventListener(listener: (event: SyncEvent) => void): void {
    this.eventListeners.add(listener);
  }

  removeEventListener(listener: (event: SyncEvent) => void): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(event: SyncEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn('Sync event listener error:', error);
      }
    });
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  dispose(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.targets.clear();
    this.eventListeners.clear();
  }
}

// ============================================================================
// SYNC EVENT TYPES
// ============================================================================

export type SyncEvent = 
  | {
      type: 'sync_start';
      timestamp: number;
      draftId: string;
      snapshot: StateSnapshot;
    }
  | {
      type: 'sync_complete';
      timestamp: number;
      draftId: string;
      snapshot: StateSnapshot;
      results: { targetId: string; success: boolean; error?: string }[];
    }
  | {
      type: 'sync_error';
      timestamp: number;
      draftId: string;
      error: string;
      targetId?: string;
    };

// ============================================================================
// SPECIALIZED SYNC TARGETS
// ============================================================================

/**
 * Create a sync target for React component state updates
 */
export function createReactStateSyncTarget(
  id: string,
  updateFunction: (state: DraftState) => void,
  enabled = true
): SyncTarget {
  return {
    id,
    name: `React Component (${id})`,
    sync: updateFunction,
    isEnabled: () => enabled
  };
}

/**
 * Create a sync target for external state management (e.g., Zustand)
 */
export function createExternalStoreSyncTarget(
  id: string,
  store: any,
  updateMethod: string,
  enabled = true
): SyncTarget {
  return {
    id,
    name: `External Store (${id})`,
    sync: (state) => {
      if (store && typeof store[updateMethod] === 'function') {
        store[updateMethod](state);
      }
    },
    isEnabled: () => enabled && store && typeof store[updateMethod] === 'function'
  };
}

/**
 * Create a sync target for debugging/logging
 */
export function createDebugSyncTarget(
  id: string,
  logger: (message: string, data: any) => void = console.log,
  enabled = true
): SyncTarget {
  return {
    id,
    name: `Debug Logger (${id})`,
    sync: (state) => {
      logger('Draft state sync:', {
        draftId: state.id,
        round: state.currentRound,
        pick: state.currentPick,
        status: state.status,
        players: state.players.length
      });
    },
    isEnabled: () => enabled
  };
}

// ============================================================================
// SINGLETON SERVICE INSTANCE
// ============================================================================

let syncService: StateSynchronizationService | null = null;

export function getSyncService(options?: SyncOptions): StateSynchronizationService {
  if (!syncService) {
    syncService = new StateSynchronizationService(options);
  }
  return syncService;
}

export function resetSyncService(): void {
  if (syncService) {
    syncService.dispose();
    syncService = null;
  }
}