/**
 * Storage Cleanup Utilities
 * 
 * Functions to detect and clean up corrupted localStorage data
 */

export function clearCorruptedDraftData(): void {
  if (typeof window === 'undefined') return;
  
  const keysToCheck: string[] = [];
  
  // Find all flashdraft-related keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('flashdraft_')) {
      keysToCheck.push(key);
    }
  }
  
  // Check each key for corruption
  let clearedCount = 0;
  for (const key of keysToCheck) {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        JSON.parse(value); // Test if it's valid JSON
      }
    } catch (error) {
      console.warn(`Removing corrupted localStorage key: ${key}`, error);
      localStorage.removeItem(key);
      clearedCount++;
    }
  }
  
  if (clearedCount > 0) {
    console.log(`Cleared ${clearedCount} corrupted localStorage entries`);
  }
}

export function resetAllDraftData(): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  
  // Find all flashdraft-related keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('flashdraft_')) {
      keysToRemove.push(key);
    }
  }
  
  // Remove all keys
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
  
  console.log(`Reset ${keysToRemove.length} localStorage entries`);
}

// Auto-cleanup on import (in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  clearCorruptedDraftData();
}