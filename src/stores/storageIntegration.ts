/**
 * Storage Integration - Connect stores with persistent storage
 * 
 * Automatically saves and loads UI state, preferences, and other
 * persistent data. Handles initialization and cleanup.
 */

import { UIStorageAdapter } from './storage/UIStorageAdapter';
import { $preferences, $sidebarOpen, $cardDetailsOpen, $packViewMode, $sortBy, $filterBy, $keyboardShortcutsEnabled, uiActions } from './uiStore';

class StorageIntegration {
  private uiStorage: UIStorageAdapter;
  private initialized = false;
  private cleanupFunctions: (() => void)[] = [];

  constructor() {
    this.uiStorage = new UIStorageAdapter({
      autoSave: true,
      syncAcrossTabs: true,
    });
  }

  /**
   * Initialize storage integration
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load initial UI state from storage
      await this.loadUIState();
      
      // Set up automatic saving
      this.setupAutoSave();
      
      // Set up multi-tab sync
      this.setupMultiTabSync();
      
      this.initialized = true;
      console.log('Storage integration initialized');
      
    } catch (error) {
      console.error('Failed to initialize storage integration:', error);
      // Continue with defaults if storage fails
    }
  }

  /**
   * Load UI state from storage
   */
  private async loadUIState(): Promise<void> {
    try {
      const uiState = await this.uiStorage.loadUIState();
      
      // Update stores with loaded state
      uiActions.updatePreferences(uiState.preferences);
      $sidebarOpen.set(uiState.sidebarOpen);
      $cardDetailsOpen.set(uiState.cardDetailsOpen);
      $packViewMode.set(uiState.packViewMode);
      $sortBy.set(uiState.sortBy);
      $filterBy.set(uiState.filterBy);
      $keyboardShortcutsEnabled.set(uiState.keyboardShortcutsEnabled);
      
    } catch (error) {
      console.warn('Failed to load UI state:', error);
    }
  }

  /**
   * Save current UI state to storage
   */
  async saveUIState(): Promise<void> {
    if (!this.initialized) return;

    try {
      const currentState = {
        preferences: $preferences.get(),
        lastRoute: window.location.pathname,
        sidebarOpen: $sidebarOpen.get(),
        cardDetailsOpen: $cardDetailsOpen.get(),
        packViewMode: $packViewMode.get(),
        sortBy: $sortBy.get(),
        filterBy: $filterBy.get(),
        keyboardShortcutsEnabled: $keyboardShortcutsEnabled.get(),
      };

      await this.uiStorage.saveUIState(currentState);
      
    } catch (error) {
      console.error('Failed to save UI state:', error);
    }
  }

  /**
   * Set up automatic saving on state changes
   */
  private setupAutoSave(): void {
    // Debounced save function to avoid excessive saves
    let saveTimeout: number | undefined;
    const debouncedSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = window.setTimeout(() => {
        this.saveUIState();
      }, 500); // Save 500ms after last change
    };

    // Listen to preference changes
    const unsubscribePreferences = $preferences.listen(() => {
      debouncedSave();
    });

    // Listen to UI state changes
    const unsubscribeSidebar = $sidebarOpen.listen(() => {
      debouncedSave();
    });

    const unsubscribeCardDetails = $cardDetailsOpen.listen(() => {
      debouncedSave();
    });

    const unsubscribePackViewMode = $packViewMode.listen(() => {
      debouncedSave();
    });

    const unsubscribeSortBy = $sortBy.listen(() => {
      debouncedSave();
    });

    const unsubscribeFilterBy = $filterBy.listen(() => {
      debouncedSave();
    });

    const unsubscribeKeyboardShortcuts = $keyboardShortcutsEnabled.listen(() => {
      debouncedSave();
    });

    // Store cleanup functions
    this.cleanupFunctions.push(
      unsubscribePreferences,
      unsubscribeSidebar,
      unsubscribeCardDetails,
      unsubscribePackViewMode,
      unsubscribeSortBy,
      unsubscribeFilterBy,
      unsubscribeKeyboardShortcuts,
      () => {
        if (saveTimeout) clearTimeout(saveTimeout);
      }
    );
  }

  /**
   * Set up multi-tab synchronization
   */
  private setupMultiTabSync(): void {
    const unsubscribeSync = this.uiStorage.onChange((newState) => {
      // Update stores with state from other tabs
      uiActions.updatePreferences(newState.preferences);
      $sidebarOpen.set(newState.sidebarOpen);
      $cardDetailsOpen.set(newState.cardDetailsOpen);
      $packViewMode.set(newState.packViewMode);
      $sortBy.set(newState.sortBy);
      $filterBy.set(newState.filterBy);
      $keyboardShortcutsEnabled.set(newState.keyboardShortcutsEnabled);
    });

    this.cleanupFunctions.push(unsubscribeSync);
  }

  /**
   * Get storage information for debugging
   */
  getStorageInfo() {
    return {
      ui: this.uiStorage.getStorageInfo(),
      initialized: this.initialized,
    };
  }

  /**
   * Export all data for backup
   */
  async exportData(): Promise<{ ui: string }> {
    return {
      ui: await this.uiStorage.exportState(),
    };
  }

  /**
   * Import data from backup
   */
  async importData(data: { ui?: string }): Promise<void> {
    if (data.ui) {
      await this.uiStorage.importState(data.ui);
      await this.loadUIState();
    }
  }

  /**
   * Clear all stored data
   */
  async clearAllData(): Promise<void> {
    await this.uiStorage.clearAll();
    
    // Reset UI to defaults
    uiActions.resetToDefaults();
  }

  /**
   * Cleanup and destroy storage integration
   */
  destroy(): void {
    // Run all cleanup functions
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    
    // Destroy storage adapters
    this.uiStorage.destroy();
    
    this.initialized = false;
  }
}

// Create singleton instance
export const storageIntegration = new StorageIntegration();

// Auto-initialize when module loads (in browser environment)
if (typeof window !== 'undefined') {
  storageIntegration.initialize().catch(error => {
    console.error('Failed to auto-initialize storage integration:', error);
  });
}

// Export for manual control if needed
export { StorageIntegration };