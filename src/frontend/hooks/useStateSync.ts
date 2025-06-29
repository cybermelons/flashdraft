/**
 * React hook for state synchronization
 * 
 * Integrates the StateSynchronizationService with React components,
 * providing automatic sync of draft engine state to various targets.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { DraftSession } from '../../engine/DraftSession';
import { 
  StateSynchronizationService,
  getSyncService,
  createReactStateSyncTarget,
  createExternalStoreSyncTarget,
  createDebugSyncTarget,
  type SyncOptions,
  type SyncEvent,
  type SyncTarget,
  type StateSnapshot
} from '../services/StateSynchronizationService';
import type { DraftState } from '../../engine/types/core';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UseStateSyncOptions extends SyncOptions {
  enableReactStateSync?: boolean;
  enableExternalStoreSync?: boolean;
  enableDebugSync?: boolean;
  externalStore?: any;
  externalStoreUpdateMethod?: string;
}

export interface StateSyncState {
  isSync: boolean;
  lastSyncTime: number | null;
  syncCount: number;
  errors: string[];
  lastSnapshot: StateSnapshot | null;
}

export interface UseStateSyncReturn extends StateSyncState {
  // Sync control
  syncState: (session: DraftSession) => void;
  forceSyncState: (session: DraftSession) => void;
  
  // Target management
  addSyncTarget: (target: SyncTarget) => void;
  removeSyncTarget: (targetId: string) => void;
  listSyncTargets: () => SyncTarget[];
  
  // Event handling
  onSyncEvent: (listener: (event: SyncEvent) => void) => void;
  offSyncEvent: (listener: (event: SyncEvent) => void) => void;
  
  // State management
  clearErrors: () => void;
  getLastSnapshot: () => StateSnapshot | null;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useStateSync(options: UseStateSyncOptions = {}): UseStateSyncReturn {
  const {
    enableReactStateSync = true,
    enableExternalStoreSync = false,
    enableDebugSync = false,
    externalStore,
    externalStoreUpdateMethod = 'updateFromEngine',
    ...syncOptions
  } = options;

  // Service instance
  const serviceRef = useRef<StateSynchronizationService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = getSyncService(syncOptions);
  }
  const service = serviceRef.current;

  // State
  const [syncState, setSyncState] = useState<StateSyncState>({
    isSync: false,
    lastSyncTime: null,
    syncCount: 0,
    errors: [],
    lastSnapshot: null
  });

  // Event listener refs
  const eventListenersRef = useRef<Set<(event: SyncEvent) => void>>(new Set());

  // ============================================================================
  // SYNC CONTROL
  // ============================================================================

  const syncStateCallback = useCallback((session: DraftSession) => {
    service.syncState(session);
  }, [service]);

  const forceSyncStateCallback = useCallback((session: DraftSession) => {
    service.forceSyncState(session);
  }, [service]);

  // ============================================================================
  // TARGET MANAGEMENT
  // ============================================================================

  const addSyncTarget = useCallback((target: SyncTarget) => {
    service.registerTarget(target);
  }, [service]);

  const removeSyncTarget = useCallback((targetId: string) => {
    service.unregisterTarget(targetId);
  }, [service]);

  const listSyncTargets = useCallback(() => {
    return service.listTargets();
  }, [service]);

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  const onSyncEvent = useCallback((listener: (event: SyncEvent) => void) => {
    eventListenersRef.current.add(listener);
    service.addEventListener(listener);
  }, [service]);

  const offSyncEvent = useCallback((listener: (event: SyncEvent) => void) => {
    eventListenersRef.current.delete(listener);
    service.removeEventListener(listener);
  }, [service]);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const clearErrors = useCallback(() => {
    setSyncState(prev => ({ ...prev, errors: [] }));
  }, []);

  const getLastSnapshot = useCallback(() => {
    return syncState.lastSnapshot;
  }, [syncState.lastSnapshot]);

  // ============================================================================
  // INTERNAL EVENT HANDLING
  // ============================================================================

  const handleSyncEvent = useCallback((event: SyncEvent) => {
    switch (event.type) {
      case 'sync_start':
        setSyncState(prev => ({
          ...prev,
          isSync: true
        }));
        break;

      case 'sync_complete':
        setSyncState(prev => {
          const errors = event.results
            .filter(result => !result.success)
            .map(result => `${result.targetId}: ${result.error || 'Unknown error'}`);

          return {
            ...prev,
            isSync: false,
            lastSyncTime: event.timestamp,
            syncCount: prev.syncCount + 1,
            errors: [...prev.errors, ...errors],
            lastSnapshot: event.snapshot
          };
        });
        break;

      case 'sync_error':
        setSyncState(prev => ({
          ...prev,
          isSync: false,
          errors: [...prev.errors, event.error]
        }));
        break;
    }
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Set up internal event listener
  useEffect(() => {
    service.addEventListener(handleSyncEvent);
    
    return () => {
      service.removeEventListener(handleSyncEvent);
    };
  }, [service, handleSyncEvent]);

  // Set up default sync targets
  useEffect(() => {
    const targetsToAdd: SyncTarget[] = [];

    // React state sync target
    if (enableReactStateSync) {
      targetsToAdd.push(
        createReactStateSyncTarget(
          'react-state',
          (state: DraftState) => {
            // This could trigger additional React state updates if needed
            // For now, we just log for debugging
            console.debug('React state sync:', {
              draftId: state.id,
              round: state.currentRound,
              pick: state.currentPick
            });
          }
        )
      );
    }

    // External store sync target
    if (enableExternalStoreSync && externalStore && externalStoreUpdateMethod) {
      targetsToAdd.push(
        createExternalStoreSyncTarget(
          'external-store',
          externalStore,
          externalStoreUpdateMethod
        )
      );
    }

    // Debug sync target
    if (enableDebugSync) {
      targetsToAdd.push(
        createDebugSyncTarget('debug', console.debug)
      );
    }

    // Register all targets
    targetsToAdd.forEach(target => service.registerTarget(target));

    // Cleanup function
    return () => {
      targetsToAdd.forEach(target => service.unregisterTarget(target.id));
    };
  }, [service, enableReactStateSync, enableExternalStoreSync, enableDebugSync, externalStore, externalStoreUpdateMethod]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      eventListenersRef.current.forEach(listener => {
        service.removeEventListener(listener);
      });
      eventListenersRef.current.clear();
    };
  }, [service]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // State
    ...syncState,
    
    // Actions
    syncState: syncStateCallback,
    forceSyncState: forceSyncStateCallback,
    addSyncTarget,
    removeSyncTarget,
    listSyncTargets,
    onSyncEvent,
    offSyncEvent,
    clearErrors,
    getLastSnapshot
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for automatic sync with draft engine changes
 */
export function useAutoSync(session: DraftSession | null, options: UseStateSyncOptions = {}) {
  const stateSync = useStateSync(options);
  
  useEffect(() => {
    if (session) {
      stateSync.syncState(session);
    }
  }, [session?.state.currentRound, session?.state.currentPick, session?.state.status, stateSync]);

  return stateSync;
}

/**
 * Hook for URL synchronization specifically
 */
export function useURLSync(session: DraftSession | null) {
  return useStateSync({
    enableURLSync: true,
    enableStorageSync: false,
    enableBroadcastSync: false,
    enableReactStateSync: false,
    enableExternalStoreSync: false,
    enableDebugSync: false
  });
}

/**
 * Hook for legacy store synchronization
 */
export function useLegacyStoreSync(session: DraftSession | null, legacyStore: any) {
  return useStateSync({
    enableURLSync: false,
    enableStorageSync: false,
    enableBroadcastSync: false,
    enableReactStateSync: false,
    enableExternalStoreSync: true,
    enableDebugSync: false,
    externalStore: legacyStore,
    externalStoreUpdateMethod: 'syncFromEngine'
  });
}

/**
 * Hook for multi-tab synchronization
 */
export function useMultiTabSync(session: DraftSession | null) {
  const stateSync = useStateSync({
    enableURLSync: true,
    enableStorageSync: true,
    enableBroadcastSync: true,
    enableReactStateSync: false,
    enableExternalStoreSync: false,
    enableDebugSync: false
  });

  // Listen for broadcast messages from other tabs
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('flashdraft_sync');
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'state_update') {
        // Handle incoming state updates from other tabs
        console.log('Received state update from another tab:', event.data);
        // Optionally trigger a reload or state refresh here
      }
    };

    channel.addEventListener('message', handleMessage);
    
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  return stateSync;
}

/**
 * Hook for comprehensive sync with all targets
 */
export function useFullSync(session: DraftSession | null, legacyStore?: any) {
  return useStateSync({
    enableURLSync: true,
    enableStorageSync: true,
    enableBroadcastSync: true,
    enableReactStateSync: true,
    enableExternalStoreSync: !!legacyStore,
    enableDebugSync: process.env.NODE_ENV === 'development',
    externalStore: legacyStore,
    externalStoreUpdateMethod: 'syncFromEngine'
  });
}