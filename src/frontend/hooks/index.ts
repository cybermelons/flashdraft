/**
 * Main export file for draft engine hooks
 * 
 * Re-exports all hooks and provides combined interfaces for common use cases.
 */

// Base hooks
export { useDraftEngine, useDraftList } from './useDraftEngine';
export { useDraftSetup, getAvailableBotPersonalities, generateRandomBotPersonalities, getBalancedBotPersonalities } from './useDraftSetup';
export { useDraftRouter, useDraftLifecycle, useDraftEngineRouter } from './useDraftRouter';
export { useDraftPersistence, useAutoSave, useDraftListManager } from './useDraftPersistence';
export { useStateSync, useAutoSync, useURLSync, useLegacyStoreSync, useMultiTabSync, useFullSync } from './useStateSync';
export { useErrorHandling, useDraftErrorHandling, useComponentErrorHandling, useAsyncErrorHandling, useFormErrorHandling } from './useErrorHandling';

// Combined hook for full draft management
export { useFlashDraft } from './useFlashDraft';

// Type exports
export type { 
  DraftEngineState, 
  DraftEngineActions, 
  UseDraftEngineReturn 
} from './useDraftEngine';

export type { 
  DraftSetupConfig, 
  UseDraftSetupReturn 
} from './useDraftSetup';

export type { 
  DraftURLParams, 
  RouterState, 
  UseDraftRouterReturn 
} from './useDraftRouter';

export type {
  DraftPersistenceState,
  DraftPersistenceActions,
  UseDraftPersistenceReturn,
  UseDraftPersistenceOptions
} from './useDraftPersistence';