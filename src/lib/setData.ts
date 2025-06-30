/**
 * Set Data Loader - Load MTG set data from static JSON files
 * 
 * Loads Scryfall-format set data and converts it to the format expected
 * by the DraftEngine's PackGenerator.
 */

// Import set data as static assets
import finData from '../../data/raw/cards/fin_cards.json';
import dtkData from '../../data/raw/cards/dtk_cards.json';

/**
 * TypeScript interfaces for Scryfall API data format
 */
export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  colors: string[];
  color_identity: string[];
  set: string;
  collector_number: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
  };
  // Additional optional fields that might be present
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  keywords?: string[];
  layout?: string;
  frame?: string;
  border_color?: string;
  lang?: string;
  digital?: boolean;
  foil?: boolean;
  nonfoil?: boolean;
  oversized?: boolean;
  promo?: boolean;
  reprint?: boolean;
  variation?: boolean;
  set_name?: string;
  set_search_uri?: string;
  scryfall_set_uri?: string;
  rulings_uri?: string;
  prints_search_uri?: string;
  collector_number_int?: number;
  preview?: {
    source?: string;
    source_uri?: string;
    previewed_at?: string;
  };
}

export interface ScryfallSetInfo {
  object: string;
  id: string;
  code: string;
  name: string;
  set_type: string;
  card_count: number;
  released_at: string;
  // Additional optional fields
  mtgo_code?: string;
  arena_code?: string;
  tcgplayer_id?: number;
  uri?: string;
  scryfall_uri?: string;
  search_uri?: string;
  icon_svg_uri?: string;
  digital?: boolean;
  foil_only?: boolean;
  nonfoil_only?: boolean;
  block_code?: string;
  block?: string;
  parent_set_code?: string;
}

export interface ScryfallSetData {
  set_info: ScryfallSetInfo;
  cards: ScryfallCard[];
}

/**
 * Validation result interface
 */
export interface SetDataValidation {
  isValid: boolean;
  issues: string[];
  cardCount?: {
    total: number;
    common: number;
    uncommon: number;
    rare: number;
    mythic: number;
  };
}

// Import engine types to ensure compatibility
import type { SetData, Card } from './engine/PackGenerator';

/**
 * Convert Scryfall card to engine Card format
 */
function convertScryfallCard(scryfallCard: ScryfallCard): Card {
  return {
    id: scryfallCard.id,
    name: scryfallCard.name,
    setCode: scryfallCard.set.toUpperCase(),
    rarity: scryfallCard.rarity,
    manaCost: scryfallCard.mana_cost,
    type: scryfallCard.type_line,
    colors: scryfallCard.colors || [],
  };
}

/**
 * Validate set data for pack generation requirements
 */
function validateSetData(setData: SetData): SetDataValidation {
  const issues: string[] = [];
  
  if (!setData.cards || setData.cards.length === 0) {
    issues.push('No cards found in set');
    return { isValid: false, issues };
  }
  
  // Group cards by rarity for validation
  const rarityGroups = {
    common: setData.cards.filter(c => c.rarity === 'common'),
    uncommon: setData.cards.filter(c => c.rarity === 'uncommon'),
    rare: setData.cards.filter(c => c.rarity === 'rare'),
    mythic: setData.cards.filter(c => c.rarity === 'mythic'),
  };
  
  const cardCount = {
    total: setData.cards.length,
    common: rarityGroups.common.length,
    uncommon: rarityGroups.uncommon.length,
    rare: rarityGroups.rare.length,
    mythic: rarityGroups.mythic.length,
  };
  
  // Check minimum requirements for pack generation
  // Standard booster needs: 10-11 commons, 3-4 uncommons, 1 rare/mythic
  if (cardCount.common < 11) {
    issues.push(`Insufficient commons: ${cardCount.common} (need at least 11 for consistent pack generation)`);
  }
  
  if (cardCount.uncommon < 4) {
    issues.push(`Insufficient uncommons: ${cardCount.uncommon} (need at least 4 for consistent pack generation)`);
  }
  
  if (cardCount.rare === 0 && cardCount.mythic === 0) {
    issues.push('No rare or mythic cards found (need at least 1 for pack generation)');
  }
  
  // Validate card data completeness
  const invalidCards = setData.cards.filter(card => 
    !card.id || !card.name || !card.rarity || !card.setCode
  );
  
  if (invalidCards.length > 0) {
    issues.push(`${invalidCards.length} cards missing required fields (id, name, rarity, setCode)`);
  }
  
  // Check for duplicate card IDs
  const cardIds = setData.cards.map(c => c.id);
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) {
    issues.push(`Duplicate card IDs found: ${cardIds.length - uniqueIds.size} duplicates`);
  }
  
  // Validate set code consistency
  const inconsistentSetCodes = setData.cards.filter(card => 
    card.setCode !== setData.setCode
  );
  if (inconsistentSetCodes.length > 0) {
    issues.push(`${inconsistentSetCodes.length} cards have inconsistent set codes`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    cardCount
  };
}

/**
 * Convert Scryfall set data to engine SetData format
 */
function convertScryfallSetData(scryfallData: ScryfallSetData): SetData {
  const cards = scryfallData.cards.map(convertScryfallCard);
  
  const setData: SetData = {
    setCode: scryfallData.set_info.code.toUpperCase(),
    name: scryfallData.set_info.name,
    cards,
  };
  
  // Validate the converted data
  const validation = validateSetData(setData);
  if (!validation.isValid) {
    console.warn(`⚠️  Set data validation failed for ${setData.setCode}:`, validation.issues);
    
    // Still return the data but with warnings - pack generation might fail
    if (validation.cardCount) {
      console.warn(`Card distribution: ${validation.cardCount.total} total (C:${validation.cardCount.common}, U:${validation.cardCount.uncommon}, R:${validation.cardCount.rare}, M:${validation.cardCount.mythic})`);
    }
  } else {
    if (validation.cardCount) {
      console.log(`✅ Set data validated: ${setData.setCode} - ${validation.cardCount.total} cards (C:${validation.cardCount.common}, U:${validation.cardCount.uncommon}, R:${validation.cardCount.rare}, M:${validation.cardCount.mythic})`);
    }
  }
  
  return setData;
}

/**
 * Available sets registry
 */
const AVAILABLE_SETS = {
  'FIN': finData as ScryfallSetData,
  'DTK': dtkData as ScryfallSetData,
} as const;

/**
 * Load set data for a specific set code
 */
export function loadSetData(setCode: string): SetData | null {
  const upperSetCode = setCode.toUpperCase() as keyof typeof AVAILABLE_SETS;
  const scryfallData = AVAILABLE_SETS[upperSetCode];
  
  if (!scryfallData) {
    console.warn(`Set data not found for: ${setCode}`);
    return null;
  }
  
  try {
    return convertScryfallSetData(scryfallData);
  } catch (error) {
    console.error(`Failed to convert set data for ${setCode}:`, error);
    return null;
  }
}

/**
 * Load all available sets
 */
export function loadAllSets(): Record<string, SetData> {
  const sets: Record<string, SetData> = {};
  
  for (const setCode of Object.keys(AVAILABLE_SETS)) {
    const setData = loadSetData(setCode);
    if (setData) {
      sets[setCode] = setData;
    }
  }
  
  return sets;
}

/**
 * Get list of available set codes
 */
export function getAvailableSetCodes(): string[] {
  return Object.keys(AVAILABLE_SETS);
}

/**
 * Check if a set is available
 */
export function isSetAvailable(setCode: string): boolean {
  return setCode.toUpperCase() in AVAILABLE_SETS;
}

/**
 * Validate a specific set's data for pack generation
 */
export function validateSetForPackGeneration(setCode: string): SetDataValidation | null {
  const setData = loadSetData(setCode);
  if (!setData) {
    return null;
  }
  
  return validateSetData(setData);
}

/**
 * Get validation report for all available sets
 */
export function validateAllSets(): Record<string, SetDataValidation> {
  const validationResults: Record<string, SetDataValidation> = {};
  
  for (const setCode of Object.keys(AVAILABLE_SETS)) {
    const validation = validateSetForPackGeneration(setCode);
    if (validation) {
      validationResults[setCode] = validation;
    }
  }
  
  return validationResults;
}