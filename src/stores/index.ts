/**
 * Stores Index - Centralized exports for all stores
 * 
 * Provides convenient imports for React components and other modules.
 */

// Draft store exports
export {
  // State atoms
  $currentDraftId,
  $currentDraft,
  $isLoading,
  $error,
  $selectedCard,
  $hoveredCard,
  $isPickingCard,
  
  // Computed values
  $currentPack,
  $humanDeck,
  $draftProgress,
  $canPick,
  $currentPosition,
  
  // Actions
  draftActions,
  uiActions,
  setDataActions,
  
  // Set data
  $setData,
  
  // Engine instance
  draftEngine,
} from './draftStore';

// UI store exports
export {
  // Theme and appearance
  $theme,
  $cardSize,
  $viewLayout,
  
  // Preferences
  $preferences,
  type UIPreferences,
  type Theme,
  type CardSize,
  type ViewLayout,
  
  // App state
  $appLoading,
  $connectionStatus,
  
  // Modal and overlay state
  $activeModal,
  $sidebarOpen,
  $cardDetailsOpen,
  
  // Navigation
  $currentRoute,
  $navigationHistory,
  
  // Draft UI state
  $packViewMode,
  $sortBy,
  $filterBy,
  
  // Keyboard shortcuts
  $keyboardShortcutsEnabled,
  $activeShortcuts,
  
  // Computed values
  $isDarkMode,
  $isCompactView,
  $cardDisplaySize,
  
  // UI actions (renamed to avoid conflicts)
  uiActions as uiStateActions,
} from './uiStore';

// Storage integration
export {
  storageIntegration,
  StorageIntegration,
} from './storageIntegration';

// Storage adapters
export {
  UIStorageAdapter,
  type UIState,
  type UIStorageOptions,
} from './storage/UIStorageAdapter';