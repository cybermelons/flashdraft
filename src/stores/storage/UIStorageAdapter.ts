/**
 * UI Storage Adapter - Persist UI state and preferences
 * 
 * Handles localStorage persistence for UI-specific state like:
 * - User preferences (theme, card size, etc.)
 * - UI state (modals, sidebar, filters)
 * - View settings and layout preferences
 */

import type { UIPreferences } from '../uiStore';

export interface UIState {
  preferences: UIPreferences;
  lastRoute: string;
  sidebarOpen: boolean;
  cardDetailsOpen: boolean;
  packViewMode: 'spread' | 'compact' | 'list';
  sortBy: 'cmc' | 'color' | 'rarity' | 'name' | 'type';
  filterBy: {
    colors: string[];
    types: string[];
    rarities: string[];
    cmcRange: [number, number];
  };
  keyboardShortcutsEnabled: boolean;
  quickPickMode: boolean;
}

export interface UIStorageOptions {
  autoSave?: boolean;
  syncAcrossTabs?: boolean;
}

export class UIStorageAdapter {
  private static readonly UI_STATE_KEY = 'flashdraft_ui_state';
  private static readonly UI_PREFERENCES_KEY = 'flashdraft_ui_preferences';
  
  private autoSave: boolean;
  private syncAcrossTabs: boolean;
  private changeHandlers: ((state: UIState) => void)[] = [];
  private storageEventHandler?: (event: StorageEvent) => void;

  constructor(options: UIStorageOptions = {}) {
    this.autoSave = options.autoSave ?? true;
    this.syncAcrossTabs = options.syncAcrossTabs ?? true;
    
    if (this.syncAcrossTabs) {
      this.setupStorageEventListener();
    }
  }

  /**
   * Save complete UI state
   */
  async saveUIState(state: UIState): Promise<void> {
    try {
      const serialized = JSON.stringify({
        ...state,
        lastSaved: Date.now(),
      });
      
      localStorage.setItem(UIStorageAdapter.UI_STATE_KEY, serialized);
      
      // Also save preferences separately for quick access
      await this.savePreferences(state.preferences);
      
    } catch (error) {
      console.error('Failed to save UI state:', error);
      throw new Error(`UI state save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load complete UI state
   */
  async loadUIState(): Promise<UIState> {
    try {
      const serialized = localStorage.getItem(UIStorageAdapter.UI_STATE_KEY);
      
      if (!serialized) {
        return this.getDefaultUIState();
      }
      
      const parsed = JSON.parse(serialized);
      
      // Validate and merge with defaults to handle schema changes
      return this.validateAndMergeUIState(parsed);
      
    } catch (error) {
      console.warn('Failed to load UI state, using defaults:', error);
      return this.getDefaultUIState();
    }
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences: UIPreferences): Promise<void> {
    try {
      const serialized = JSON.stringify({
        ...preferences,
        lastSaved: Date.now(),
      });
      
      localStorage.setItem(UIStorageAdapter.UI_PREFERENCES_KEY, serialized);
      
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw new Error(`Preferences save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load user preferences
   */
  async loadPreferences(): Promise<UIPreferences> {
    try {
      const serialized = localStorage.getItem(UIStorageAdapter.UI_PREFERENCES_KEY);
      
      if (!serialized) {
        return this.getDefaultPreferences();
      }
      
      const parsed = JSON.parse(serialized);
      
      // Validate and merge with defaults
      return this.validateAndMergePreferences(parsed);
      
    } catch (error) {
      console.warn('Failed to load preferences, using defaults:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Save specific preference
   */
  async savePreference<K extends keyof UIPreferences>(
    key: K, 
    value: UIPreferences[K]
  ): Promise<void> {
    try {
      const currentPreferences = await this.loadPreferences();
      const updatedPreferences = { ...currentPreferences, [key]: value };
      await this.savePreferences(updatedPreferences);
      
    } catch (error) {
      console.error(`Failed to save preference ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all UI state
   */
  async clearAll(): Promise<void> {
    try {
      localStorage.removeItem(UIStorageAdapter.UI_STATE_KEY);
      localStorage.removeItem(UIStorageAdapter.UI_PREFERENCES_KEY);
      
    } catch (error) {
      console.error('Failed to clear UI state:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { 
    totalSize: number; 
    stateSize: number; 
    preferencesSize: number; 
  } {
    const stateData = localStorage.getItem(UIStorageAdapter.UI_STATE_KEY);
    const preferencesData = localStorage.getItem(UIStorageAdapter.UI_PREFERENCES_KEY);
    
    const stateSize = stateData ? stateData.length : 0;
    const preferencesSize = preferencesData ? preferencesData.length : 0;
    
    return {
      totalSize: stateSize + preferencesSize,
      stateSize,
      preferencesSize,
    };
  }

  /**
   * Listen for state changes (for multi-tab sync)
   */
  onChange(callback: (state: UIState) => void): () => void {
    this.changeHandlers.push(callback);
    
    return () => {
      const index = this.changeHandlers.indexOf(callback);
      if (index > -1) {
        this.changeHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Export UI state for backup/migration
   */
  async exportState(): Promise<string> {
    const state = await this.loadUIState();
    return JSON.stringify({
      version: '1.0',
      exported: Date.now(),
      state,
    }, null, 2);
  }

  /**
   * Import UI state from backup
   */
  async importState(exportedData: string): Promise<void> {
    try {
      const parsed = JSON.parse(exportedData);
      
      if (!parsed.state) {
        throw new Error('Invalid export format');
      }
      
      const validatedState = this.validateAndMergeUIState(parsed.state);
      await this.saveUIState(validatedState);
      
    } catch (error) {
      console.error('Failed to import UI state:', error);
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private getDefaultPreferences(): UIPreferences {
    return {
      theme: 'system',
      cardSize: 'medium',
      viewLayout: 'grid',
      showCardDetails: true,
      autoAdvanceAfterPick: true,
      confirmPicks: false,
      showPackStats: true,
      showManaSymbols: true,
      soundEnabled: true,
      animationsEnabled: true,
    };
  }

  private getDefaultUIState(): UIState {
    return {
      preferences: this.getDefaultPreferences(),
      lastRoute: '/',
      sidebarOpen: false,
      cardDetailsOpen: false,
      packViewMode: 'spread',
      sortBy: 'cmc',
      filterBy: {
        colors: [],
        types: [],
        rarities: [],
        cmcRange: [0, 20],
      },
      keyboardShortcutsEnabled: true,
    };
  }

  private validateAndMergePreferences(loaded: any): UIPreferences {
    const defaults = this.getDefaultPreferences();
    
    return {
      theme: this.isValidTheme(loaded.theme) ? loaded.theme : defaults.theme,
      cardSize: this.isValidCardSize(loaded.cardSize) ? loaded.cardSize : defaults.cardSize,
      viewLayout: this.isValidViewLayout(loaded.viewLayout) ? loaded.viewLayout : defaults.viewLayout,
      showCardDetails: typeof loaded.showCardDetails === 'boolean' ? loaded.showCardDetails : defaults.showCardDetails,
      autoAdvanceAfterPick: typeof loaded.autoAdvanceAfterPick === 'boolean' ? loaded.autoAdvanceAfterPick : defaults.autoAdvanceAfterPick,
      confirmPicks: typeof loaded.confirmPicks === 'boolean' ? loaded.confirmPicks : defaults.confirmPicks,
      showPackStats: typeof loaded.showPackStats === 'boolean' ? loaded.showPackStats : defaults.showPackStats,
      showManaSymbols: typeof loaded.showManaSymbols === 'boolean' ? loaded.showManaSymbols : defaults.showManaSymbols,
      soundEnabled: typeof loaded.soundEnabled === 'boolean' ? loaded.soundEnabled : defaults.soundEnabled,
      animationsEnabled: typeof loaded.animationsEnabled === 'boolean' ? loaded.animationsEnabled : defaults.animationsEnabled,
    };
  }

  private validateAndMergeUIState(loaded: any): UIState {
    const defaults = this.getDefaultUIState();
    
    return {
      preferences: loaded.preferences ? this.validateAndMergePreferences(loaded.preferences) : defaults.preferences,
      lastRoute: typeof loaded.lastRoute === 'string' ? loaded.lastRoute : defaults.lastRoute,
      sidebarOpen: typeof loaded.sidebarOpen === 'boolean' ? loaded.sidebarOpen : defaults.sidebarOpen,
      cardDetailsOpen: typeof loaded.cardDetailsOpen === 'boolean' ? loaded.cardDetailsOpen : defaults.cardDetailsOpen,
      packViewMode: this.isValidPackViewMode(loaded.packViewMode) ? loaded.packViewMode : defaults.packViewMode,
      sortBy: this.isValidSortBy(loaded.sortBy) ? loaded.sortBy : defaults.sortBy,
      filterBy: this.validateFilterBy(loaded.filterBy) || defaults.filterBy,
      keyboardShortcutsEnabled: typeof loaded.keyboardShortcutsEnabled === 'boolean' ? loaded.keyboardShortcutsEnabled : defaults.keyboardShortcutsEnabled,
    };
  }

  private isValidTheme(value: any): value is 'light' | 'dark' | 'system' {
    return ['light', 'dark', 'system'].includes(value);
  }

  private isValidCardSize(value: any): value is 'small' | 'medium' | 'large' {
    return ['small', 'medium', 'large'].includes(value);
  }

  private isValidViewLayout(value: any): value is 'grid' | 'list' | 'fan' {
    return ['grid', 'list', 'fan'].includes(value);
  }

  private isValidPackViewMode(value: any): value is 'spread' | 'compact' | 'list' {
    return ['spread', 'compact', 'list'].includes(value);
  }

  private isValidSortBy(value: any): value is 'cmc' | 'color' | 'rarity' | 'name' | 'type' {
    return ['cmc', 'color', 'rarity', 'name', 'type'].includes(value);
  }

  private validateFilterBy(value: any): UIState['filterBy'] | null {
    if (!value || typeof value !== 'object') return null;
    
    const colors = Array.isArray(value.colors) ? value.colors.filter((c: any) => typeof c === 'string') : [];
    const types = Array.isArray(value.types) ? value.types.filter((t: any) => typeof t === 'string') : [];
    const rarities = Array.isArray(value.rarities) ? value.rarities.filter((r: any) => typeof r === 'string') : [];
    
    const cmcRange = Array.isArray(value.cmcRange) && 
                     value.cmcRange.length === 2 &&
                     typeof value.cmcRange[0] === 'number' &&
                     typeof value.cmcRange[1] === 'number'
                     ? value.cmcRange as [number, number]
                     : [0, 20] as [number, number];
    
    return { colors, types, rarities, cmcRange };
  }

  private setupStorageEventListener(): void {
    if (typeof window === 'undefined') return;
    
    this.storageEventHandler = (event: StorageEvent) => {
      if (event.key === UIStorageAdapter.UI_STATE_KEY && event.newValue) {
        try {
          const parsedState = JSON.parse(event.newValue);
          const validatedState = this.validateAndMergeUIState(parsedState);
          
          // Notify all change handlers
          this.changeHandlers.forEach(handler => {
            try {
              handler(validatedState);
            } catch (error) {
              console.error('Error in UI state change handler:', error);
            }
          });
          
        } catch (error) {
          console.warn('Failed to parse UI state from storage event:', error);
        }
      }
    };
    
    window.addEventListener('storage', this.storageEventHandler);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.storageEventHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageEventHandler);
    }
    this.changeHandlers = [];
  }
}