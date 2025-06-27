/**
 * FlashDraft - Data Loading Utilities
 * 
 * Functions for loading and processing MTG set data from
 * downloaded Scryfall JSON files.
 */

import fs from 'fs/promises';
import path from 'path';
import type { MTGSetData, MTGCard, DraftCard } from '../types/card';
import { validateSetData, toDraftCard } from './cardUtils';

// Data directory paths
const DATA_DIR = path.join(process.cwd(), 'data');
const RAW_DATA_DIR = path.join(DATA_DIR, 'raw');
const CARDS_DATA_DIR = path.join(RAW_DATA_DIR, 'cards');
const SETS_DATA_DIR = path.join(RAW_DATA_DIR, 'sets');
const PROCESSED_DATA_DIR = path.join(DATA_DIR, 'processed');

/**
 * Loads raw set data from Scryfall JSON files
 */
export async function loadSetData(setCode: string): Promise<MTGSetData> {
  const filename = `${setCode.toLowerCase()}_cards.json`;
  const filepath = path.join(CARDS_DATA_DIR, filename);
  
  try {
    const data = await fs.readFile(filepath, 'utf-8');
    const parsed = JSON.parse(data);
    
    if (!validateSetData(parsed)) {
      throw new Error(`Invalid set data format in ${filename}`);
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(
        `Set data for ${setCode.toUpperCase()} not found. ` +
        `Run 'python3 scripts/download_scryfall_data.py ${setCode}' to download it.`
      );
    }
    throw error;
  }
}

/**
 * Loads multiple sets and combines them
 */
export async function loadMultipleSets(setCodes: string[]): Promise<MTGSetData[]> {
  const promises = setCodes.map(code => loadSetData(code));
  return Promise.all(promises);
}

/**
 * Processes raw set data into draft-ready format
 */
export async function processSetForDraft(setCode: string): Promise<{
  setInfo: MTGSetData['set_info'];
  draftCards: DraftCard[];
  stats: {
    total: number;
    by_rarity: Record<string, number>;
    by_color: Record<string, number>;
  };
}> {
  const setData = await loadSetData(setCode);
  
  // Filter out non-booster cards for draft
  const draftableCards = setData.cards.filter(card => card.booster);
  
  // Convert to draft cards
  const draftCards = draftableCards.map(toDraftCard);
  
  // Calculate statistics
  const stats = {
    total: draftCards.length,
    by_rarity: {} as Record<string, number>,
    by_color: {} as Record<string, number>
  };
  
  draftCards.forEach(card => {
    // Rarity stats
    stats.by_rarity[card.rarity] = (stats.by_rarity[card.rarity] || 0) + 1;
    
    // Color stats
    if (card.color_identity.length === 0) {
      stats.by_color['colorless'] = (stats.by_color['colorless'] || 0) + 1;
    } else if (card.color_identity.length === 1) {
      const color = card.color_identity[0];
      stats.by_color[color] = (stats.by_color[color] || 0) + 1;
    } else {
      stats.by_color['multicolor'] = (stats.by_color['multicolor'] || 0) + 1;
    }
  });
  
  return {
    setInfo: setData.set_info,
    draftCards,
    stats
  };
}

/**
 * Saves processed data to cache
 */
export async function saveProcessedData(
  setCode: string, 
  data: any, 
  type: 'draft' | 'analysis' | 'cache'
): Promise<void> {
  // Ensure processed data directory exists
  await fs.mkdir(PROCESSED_DATA_DIR, { recursive: true });
  
  const filename = `${setCode.toLowerCase()}_${type}.json`;
  const filepath = path.join(PROCESSED_DATA_DIR, filename);
  
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

/**
 * Loads processed data from cache
 */
export async function loadProcessedData(
  setCode: string, 
  type: 'draft' | 'analysis' | 'cache'
): Promise<any | null> {
  const filename = `${setCode.toLowerCase()}_${type}.json`;
  const filepath = path.join(PROCESSED_DATA_DIR, filename);
  
  try {
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw error;
  }
}

/**
 * Lists available sets
 */
export async function listAvailableSets(): Promise<string[]> {
  try {
    const files = await fs.readdir(CARDS_DATA_DIR);
    return files
      .filter(file => file.endsWith('_cards.json'))
      .map(file => file.replace('_cards.json', '').toUpperCase());
  } catch (error) {
    return [];
  }
}

/**
 * Checks if set data exists
 */
export async function hasSetData(setCode: string): Promise<boolean> {
  const filename = `${setCode.toLowerCase()}_cards.json`;
  const filepath = path.join(CARDS_DATA_DIR, filename);
  
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file stats for set data (for cache invalidation)
 */
export async function getSetDataStats(setCode: string): Promise<{
  size: number;
  modified: Date;
  cards: number;
} | null> {
  const filename = `${setCode.toLowerCase()}_cards.json`;
  const filepath = path.join(CARDS_DATA_DIR, filename);
  
  try {
    const stats = await fs.stat(filepath);
    const data = await loadSetData(setCode);
    
    return {
      size: stats.size,
      modified: stats.mtime,
      cards: data.total_cards
    };
  } catch {
    return null;
  }
}

/**
 * Validates all available set data
 */
export async function validateAllSets(): Promise<{
  valid: string[];
  invalid: string[];
  errors: Record<string, string>;
}> {
  const result = {
    valid: [] as string[],
    invalid: [] as string[],
    errors: {} as Record<string, string>
  };
  
  const availableSets = await listAvailableSets();
  
  for (const setCode of availableSets) {
    try {
      await loadSetData(setCode);
      result.valid.push(setCode);
    } catch (error) {
      result.invalid.push(setCode);
      result.errors[setCode] = error instanceof Error ? error.message : String(error);
    }
  }
  
  return result;
}

/**
 * Creates a data manifest with all available sets and their info
 */
export async function createDataManifest(): Promise<{
  sets: Array<{
    code: string;
    name: string;
    card_count: number;
    set_type: string;
    released_at: string;
    download_timestamp: number;
  }>;
  generated_at: number;
}> {
  const sets = [];
  const availableSets = await listAvailableSets();
  
  for (const setCode of availableSets) {
    try {
      const setData = await loadSetData(setCode);
      sets.push({
        code: setData.set_info.code.toUpperCase(),
        name: setData.set_info.name,
        card_count: setData.total_cards,
        set_type: setData.set_info.set_type,
        released_at: setData.set_info.released_at,
        download_timestamp: setData.download_timestamp
      });
    } catch (error) {
      // Skip invalid sets
      console.warn(`Skipping invalid set ${setCode}:`, error);
    }
  }
  
  return {
    sets,
    generated_at: Date.now()
  };
}

// Export data directory paths for other modules
export const DATA_PATHS = {
  DATA_DIR,
  RAW_DATA_DIR,
  CARDS_DATA_DIR,
  SETS_DATA_DIR,
  PROCESSED_DATA_DIR
} as const;