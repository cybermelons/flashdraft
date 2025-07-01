/**
 * Centralized URL management for draft navigation
 * 
 * Rules:
 * - pushState: User-initiated navigation (creates history)
 * - replaceState: Automatic progression (no history)
 * - All URL updates trigger storage event for computed stores
 */

export const urlManager = {
  /**
   * Navigate to a position (user action - creates history)
   */
  navigateToPosition(draftId: string, round: number, pick: number): void {
    if (typeof window === 'undefined') return;
    
    const url = `/draft/${draftId}/p${round}p${pick}`;
    window.history.pushState({}, '', url);
    
    // Notify computed stores of URL change
    window.dispatchEvent(new StorageEvent('storage'));
  },

  /**
   * Update position after draft progression (automatic - no history)
   */
  updatePositionAfterProgression(draftId: string, round: number, pick: number): void {
    if (typeof window === 'undefined') return;
    
    const url = `/draft/${draftId}/p${round}p${pick}`;
    window.history.replaceState({}, '', url);
    
    // Notify computed stores of URL change
    window.dispatchEvent(new StorageEvent('storage'));
  },

  /**
   * Navigate to draft overview
   */
  navigateToOverview(draftId: string): void {
    if (typeof window === 'undefined') return;
    
    const url = `/draft/${draftId}`;
    // Use actual navigation for Astro SSR
    window.location.href = url;
  },

  /**
   * Navigate to draft list
   */
  navigateToDraftList(): void {
    if (typeof window === 'undefined') return;
    
    // Use actual navigation for Astro SSR
    window.location.href = '/draft';
  },

  /**
   * Go back in browser history
   */
  goBack(): void {
    if (typeof window === 'undefined') return;
    
    window.history.back();
  }
};