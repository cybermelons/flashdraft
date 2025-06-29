/**
 * Utility to clear corrupted localStorage data for FlashDraft
 * 
 * Provides functions to safely clear corrupted drafts and reset the application state.
 */

/**
 * Clear all FlashDraft data from localStorage
 */
export function clearAllFlashDraftData(): void {
  try {
    const keys = Object.keys(localStorage);
    const flashdraftKeys = keys.filter(key => key.startsWith('flashdraft_'));
    
    console.log(`Clearing ${flashdraftKeys.length} FlashDraft localStorage entries...`);
    
    flashdraftKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed: ${key}`);
    });
    
    console.log('FlashDraft localStorage data cleared successfully');
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Clear only corrupted drafts (those that fail to deserialize)
 */
export function clearCorruptedDrafts(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const keys = Object.keys(localStorage);
      const draftKeys = keys.filter(key => 
        key.startsWith('flashdraft_') && 
        !key.endsWith('_list') &&
        key !== 'flashdraft_list'
      );
      
      let clearedCount = 0;
      
      draftKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            // Try to parse the data
            JSON.parse(data);
            // If it parses, validate the structure
            const parsed = JSON.parse(data);
            if (!parsed.id || !parsed.config || !parsed.history) {
              throw new Error('Invalid draft structure');
            }
          }
        } catch (error) {
          console.log(`Removing corrupted draft: ${key}`);
          localStorage.removeItem(key);
          clearedCount++;
        }
      });
      
      // Update the draft list to remove any references to cleared drafts
      const listKey = 'flashdraft_list';
      const listData = localStorage.getItem(listKey);
      if (listData) {
        try {
          const draftIds = JSON.parse(listData);
          const validIds = draftIds.filter((id: string) => {
            const draftKey = `flashdraft_${id}`;
            return localStorage.getItem(draftKey) !== null;
          });
          localStorage.setItem(listKey, JSON.stringify(validIds));
        } catch (error) {
          console.log('Resetting draft list due to corruption');
          localStorage.setItem(listKey, JSON.stringify([]));
        }
      }
      
      console.log(`Cleared ${clearedCount} corrupted drafts`);
      resolve();
    } catch (error) {
      console.error('Failed to clear corrupted drafts:', error);
      resolve();
    }
  });
}

/**
 * Add to window object for debugging in browser console
 */
if (typeof window !== 'undefined') {
  (window as any).clearFlashDraftData = clearAllFlashDraftData;
  (window as any).clearCorruptedDrafts = clearCorruptedDrafts;
}