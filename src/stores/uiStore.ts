/**
 * UI Store - General UI state management
 * 
 * Manages UI preferences, themes, loading states, and other
 * interface-specific state that persists across sessions.
 */

import { atom, map, computed } from 'nanostores';

// Theme and appearance
export type Theme = 'light' | 'dark' | 'system';
export type CardSize = 'small' | 'medium' | 'large';
export type ViewLayout = 'grid' | 'list' | 'fan';

export const $theme = atom<Theme>('system');
export const $cardSize = atom<CardSize>('medium');
export const $viewLayout = atom<ViewLayout>('grid');

// UI preferences
export interface UIPreferences {
  theme: Theme;
  cardSize: CardSize;
  viewLayout: ViewLayout;
  showCardDetails: boolean;
  autoAdvanceAfterPick: boolean;
  confirmPicks: boolean;
  showPackStats: boolean;
  showManaSymbols: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

export const $preferences = map<UIPreferences>({
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
});

// Loading and status states
export const $appLoading = atom<boolean>(false);
export const $connectionStatus = atom<'online' | 'offline'>('online');

// Modal and overlay states
export const $activeModal = atom<string | null>(null);
export const $sidebarOpen = atom<boolean>(true); // Default to open
export const $cardDetailsOpen = atom<boolean>(false);

// Navigation and routing
export const $currentRoute = atom<string>('/');
export const $navigationHistory = atom<string[]>([]);

// Draft-specific UI state
export const $packViewMode = atom<'spread' | 'compact' | 'list'>('spread');
export const $sortBy = atom<'cmc' | 'color' | 'rarity' | 'name' | 'type'>('cmc');
export const $quickPickMode = atom<boolean>(false);
export const $filterBy = atom<{
  colors: string[];
  types: string[];
  rarities: string[];
  cmcRange: [number, number];
}>({
  colors: [],
  types: [],
  rarities: [],
  cmcRange: [0, 20],
});

// Keyboard shortcuts state
export const $keyboardShortcutsEnabled = atom<boolean>(true);
export const $activeShortcuts = map<Record<string, string>>({
  'p': 'Pick selected card',
  'u': 'Undo last action',
  'r': 'Replay from start',
  '1-9': 'Select card by position',
  'escape': 'Cancel/close modal',
  'space': 'Toggle card details',
  'tab': 'Cycle through cards',
});

// Computed values
export const $isDarkMode = computed([$theme], (theme) => {
  if (theme === 'system') {
    return typeof window !== 'undefined' && 
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return theme === 'dark';
});

export const $isCompactView = computed([$viewLayout], (layout) => {
  return layout === 'list';
});

export const $cardDisplaySize = computed([$cardSize, $viewLayout], (size, layout) => {
  const baseSizes = {
    small: { width: 150, height: 210 },
    medium: { width: 200, height: 280 },
    large: { width: 250, height: 350 },
  };
  
  const baseSize = baseSizes[size];
  
  // Adjust for layout
  if (layout === 'list') {
    return {
      width: baseSize.width * 0.7,
      height: baseSize.height * 0.7,
    };
  }
  
  return baseSize;
});

// UI Actions
export const uiActions = {
  /**
   * Update user preferences
   */
  updatePreferences(updates: Partial<UIPreferences>): void {
    const current = $preferences.get();
    $preferences.set({ ...current, ...updates });
    
    // Update individual atoms for reactive UI
    if (updates.theme) $theme.set(updates.theme);
    if (updates.cardSize) $cardSize.set(updates.cardSize);
    if (updates.viewLayout) $viewLayout.set(updates.viewLayout);
  },

  /**
   * Set theme
   */
  setTheme(theme: Theme): void {
    $theme.set(theme);
    uiActions.updatePreferences({ theme });
  },

  /**
   * Set card size
   */
  setCardSize(size: CardSize): void {
    $cardSize.set(size);
    uiActions.updatePreferences({ cardSize: size });
  },

  /**
   * Set view layout
   */
  setViewLayout(layout: ViewLayout): void {
    $viewLayout.set(layout);
    uiActions.updatePreferences({ viewLayout: layout });
  },

  /**
   * Show/hide modal
   */
  showModal(modalId: string): void {
    $activeModal.set(modalId);
  },

  hideModal(): void {
    $activeModal.set(null);
  },

  /**
   * Toggle sidebar
   */
  toggleSidebar(): void {
    $sidebarOpen.set(!$sidebarOpen.get());
  },

  /**
   * Toggle card details panel
   */
  toggleCardDetails(): void {
    $cardDetailsOpen.set(!$cardDetailsOpen.get());
  },

  /**
   * Set pack view mode
   */
  setPackViewMode(mode: 'spread' | 'compact' | 'list'): void {
    $packViewMode.set(mode);
  },

  /**
   * Set sort criteria
   */
  setSortBy(criteria: 'cmc' | 'color' | 'rarity' | 'name' | 'type'): void {
    $sortBy.set(criteria);
  },

  /**
   * Update filters
   */
  updateFilters(filters: Partial<typeof $filterBy.value>): void {
    const current = $filterBy.get();
    $filterBy.set({ ...current, ...filters });
  },

  /**
   * Clear all filters
   */
  clearFilters(): void {
    $filterBy.set({
      colors: [],
      types: [],
      rarities: [],
      cmcRange: [0, 20],
    });
  },

  /**
   * Navigate to route
   */
  navigate(route: string): void {
    const history = $navigationHistory.get();
    const currentRoute = $currentRoute.get();
    
    if (currentRoute !== route) {
      $navigationHistory.set([...history, currentRoute]);
      $currentRoute.set(route);
    }
  },

  /**
   * Go back in navigation
   */
  goBack(): void {
    const history = $navigationHistory.get();
    if (history.length > 0) {
      const previousRoute = history.pop()!;
      $navigationHistory.set(history);
      $currentRoute.set(previousRoute);
    }
  },

  /**
   * Set app loading state
   */
  setAppLoading(loading: boolean): void {
    $appLoading.set(loading);
  },

  /**
   * Set connection status
   */
  setConnectionStatus(status: 'online' | 'offline'): void {
    $connectionStatus.set(status);
  },

  /**
   * Toggle keyboard shortcuts
   */
  toggleKeyboardShortcuts(): void {
    $keyboardShortcutsEnabled.set(!$keyboardShortcutsEnabled.get());
  },

  /**
   * Toggle quick pick mode
   */
  toggleQuickPickMode(): void {
    $quickPickMode.set(!$quickPickMode.get());
  },

  /**
   * Set quick pick mode
   */
  setQuickPickMode(enabled: boolean): void {
    $quickPickMode.set(enabled);
  },

  /**
   * Reset all UI state to defaults
   */
  resetToDefaults(): void {
    $preferences.set({
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
    });
    
    $theme.set('system');
    $cardSize.set('medium');
    $viewLayout.set('grid');
    $packViewMode.set('spread');
    $sortBy.set('cmc');
    $filterBy.set({
      colors: [],
      types: [],
      rarities: [],
      cmcRange: [0, 20],
    });
    
    $activeModal.set(null);
    $sidebarOpen.set(true); // Default to open
    $cardDetailsOpen.set(false);
    $keyboardShortcutsEnabled.set(true);
  }
};

// Initialize theme detection for system preference
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    // Trigger reactivity for system theme
    if ($theme.get() === 'system') {
      $theme.notify();
    }
  });
  
  // Set initial connection status
  window.addEventListener('online', () => uiActions.setConnectionStatus('online'));
  window.addEventListener('offline', () => uiActions.setConnectionStatus('offline'));
  uiActions.setConnectionStatus(navigator.onLine ? 'online' : 'offline');
}