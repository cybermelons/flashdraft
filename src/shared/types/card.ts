/**
 * FlashDraft - MTG Card Type Definitions
 * 
 * TypeScript interfaces for Magic: The Gathering card data
 * based on Scryfall API structure.
 */

export interface MTGColor {
  white: 'W';
  blue: 'U';
  black: 'B';
  red: 'R';
  green: 'G';
}

export type MTGColorSymbol = keyof MTGColor | MTGColor[keyof MTGColor];

export type MTGRarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';

export type MTGCardType = 
  | 'Artifact'
  | 'Creature'
  | 'Enchantment'
  | 'Instant'
  | 'Land'
  | 'Planeswalker'
  | 'Sorcery'
  | 'Tribal'
  | 'Battle';

export interface MTGImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export interface MTGCardFace {
  object: 'card_face';
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  colors?: MTGColorSymbol[];
  color_indicator?: MTGColorSymbol[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  flavor_text?: string;
  artist?: string;
  illustration_id?: string;
  image_uris?: MTGImageUris;
}

export interface MTGCard {
  // Core identifiers
  object: 'card';
  id: string;
  oracle_id: string;
  multiverse_ids?: number[];
  mtgo_id?: number;
  tcgplayer_id?: number;
  cardmarket_id?: number;
  
  // Basic card information
  name: string;
  lang: string;
  released_at: string;
  uri: string;
  scryfall_uri: string;
  layout: string;
  
  // Gameplay properties
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  
  // Colors and identity
  colors?: MTGColorSymbol[];
  color_identity: MTGColorSymbol[];
  color_indicator?: MTGColorSymbol[];
  
  // Set information
  set: string;
  set_name: string;
  set_type: string;
  set_uri: string;
  set_search_uri: string;
  scryfall_set_uri: string;
  rulings_uri: string;
  prints_search_uri: string;
  
  // Collectibility
  collector_number: string;
  digital: boolean;
  rarity: MTGRarity;
  
  // Card faces (for double-faced cards)
  card_faces?: MTGCardFace[];
  
  // Images
  image_uris?: MTGImageUris;
  
  // Flavor and artistic
  flavor_text?: string;
  artist?: string;
  artist_ids?: string[];
  illustration_id?: string;
  border_color: string;
  frame: string;
  security_stamp?: string;
  full_art: boolean;
  textless: boolean;
  booster: boolean;
  story_spotlight: boolean;
  
  // Pricing (optional, for reference)
  prices?: {
    usd?: string;
    usd_foil?: string;
    usd_etched?: string;
    eur?: string;
    eur_foil?: string;
    tix?: string;
  };
  
  // Additional metadata
  keywords?: string[];
  legalities: Record<string, 'legal' | 'not_legal' | 'restricted' | 'banned'>;
  games: string[];
  reserved: boolean;
  foil: boolean;
  nonfoil: boolean;
  finishes: string[];
  oversized: boolean;
  promo: boolean;
  reprint: boolean;
  variation: boolean;
}

export interface MTGSetInfo {
  object: 'set';
  id: string;
  code: string;
  name: string;
  uri: string;
  scryfall_uri: string;
  search_uri: string;
  released_at: string;
  set_type: string;
  card_count: number;
  digital: boolean;
  nonfoil_only: boolean;
  foil_only: boolean;
  icon_svg_uri: string;
  
  // Booster configuration for draft
  booster?: Record<string, any>;
}

export interface MTGSetData {
  set_info: MTGSetInfo;
  cards: MTGCard[];
  download_timestamp: number;
  total_cards: number;
}

// Draft-specific types
export interface DraftCard extends MTGCard {
  // Additional properties for draft simulation
  pick_priority?: number;
  archetype_scores?: Record<string, number>;
  synergy_tags?: string[];
}

export interface DraftPack {
  id: string;
  set_code: string;
  cards: DraftCard[];
  pick_number: number;
  created_at: number;
}

export interface DraftBoosterSlot {
  rarity: MTGRarity;
  count: number;
  foil_chance?: number;
  special_conditions?: string[];
}

export interface DraftBoosterConfig {
  set_code: string;
  total_cards: number;
  slots: DraftBoosterSlot[];
  special_sheets?: Record<string, DraftCard[]>;
}

// Card filtering and search
export interface CardFilter {
  sets?: string[];
  colors?: MTGColorSymbol[];
  rarities?: MTGRarity[];
  types?: string[];
  cmc_min?: number;
  cmc_max?: number;
  text_contains?: string;
  name_contains?: string;
}

export interface CardSort {
  field: keyof MTGCard;
  direction: 'asc' | 'desc';
}

// Draft analytics
export interface CardStats {
  id: string;
  name: string;
  games_in_hand: number;
  games_not_in_hand: number;
  win_rate_in_hand: number;
  win_rate_not_in_hand: number;
  improvement_when_drawn: number;
  pick_rate: number;
  average_pick: number;
}

// Export convenience types
export type CardCollection = MTGCard[];
export type SetCollection = Record<string, MTGSetData>;

// Validation helpers
export const VALID_RARITIES: MTGRarity[] = ['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus'];
export const VALID_COLORS: MTGColorSymbol[] = ['W', 'U', 'B', 'R', 'G'];
export const CARD_TYPES = [
  'Artifact', 'Creature', 'Enchantment', 'Instant', 'Land', 
  'Planeswalker', 'Sorcery', 'Tribal', 'Battle'
] as const;