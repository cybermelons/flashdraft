/**
 * FlashDraft - Card Utility Functions
 * 
 * Helper functions for working with MTG card data, filtering,
 * sorting, and validation.
 */

import type { 
  MTGCard, 
  MTGSetData, 
  DraftCard, 
  CardFilter, 
  CardSort,
  MTGColorSymbol,
  MTGRarity,
  VALID_COLORS,
  VALID_RARITIES
} from '../types/card';

/**
 * Validates if a card object has the required fields for draft simulation
 */
export function validateCard(card: any): card is MTGCard {
  if (!card || typeof card !== 'object') return false;
  
  const requiredFields = ['id', 'name', 'set', 'rarity', 'type_line', 'cmc'];
  
  return requiredFields.every(field => {
    const value = card[field];
    return value !== undefined && value !== null;
  });
}

/**
 * Validates set data structure
 */
export function validateSetData(data: any): data is MTGSetData {
  if (!data || typeof data !== 'object') return false;
  
  return (
    data.set_info &&
    Array.isArray(data.cards) &&
    typeof data.total_cards === 'number' &&
    data.cards.every((card: any) => validateCard(card))
  );
}

/**
 * Extracts main card types from type line
 */
export function getCardTypes(typeLine: string): string[] {
  const types = typeLine.split('—')[0].trim().split(' ');
  return types.filter(type => type && type !== '//' && type !== '');
}

/**
 * Checks if a card is a creature
 */
export function isCreature(card: MTGCard): boolean {
  return getCardTypes(card.type_line).includes('Creature');
}

/**
 * Checks if a card is a land
 */
export function isLand(card: MTGCard): boolean {
  return getCardTypes(card.type_line).includes('Land');
}

/**
 * Checks if a card is an instant or sorcery
 */
export function isSpell(card: MTGCard): boolean {
  const types = getCardTypes(card.type_line);
  return types.includes('Instant') || types.includes('Sorcery');
}

/**
 * Gets the primary color identity of a card
 */
export function getPrimaryColor(card: MTGCard): MTGColorSymbol | 'colorless' {
  if (!card.color_identity || card.color_identity.length === 0) {
    return 'colorless';
  }
  
  if (card.color_identity.length === 1) {
    return card.color_identity[0];
  }
  
  // For multicolored cards, return the first color for simplicity
  // Could be enhanced with more sophisticated color priority logic
  return card.color_identity[0];
}

/**
 * Checks if a card matches color requirements
 */
export function matchesColors(card: MTGCard, colors: MTGColorSymbol[]): boolean {
  if (colors.length === 0) return true;
  
  return card.color_identity.some(color => colors.includes(color));
}

/**
 * Parses mana cost for converted mana cost calculation
 */
export function parseManaSymbols(manaCost: string): Record<MTGColorSymbol | 'generic', number> {
  const symbols: Record<MTGColorSymbol | 'generic', number> = {
    W: 0, U: 0, B: 0, R: 0, G: 0, generic: 0
  };
  
  if (!manaCost) return symbols;
  
  // Remove braces and split by individual mana symbols
  const cost = manaCost.replace(/[{}]/g, '');
  
  for (const symbol of cost) {
    if (['W', 'U', 'B', 'R', 'G'].includes(symbol)) {
      symbols[symbol as MTGColorSymbol]++;
    } else if (/\d/.test(symbol)) {
      symbols.generic += parseInt(symbol, 10);
    }
  }
  
  return symbols;
}

/**
 * Filters cards based on criteria
 */
export function filterCards(cards: MTGCard[], filter: CardFilter): MTGCard[] {
  return cards.filter(card => {
    // Set filter
    if (filter.sets && filter.sets.length > 0) {
      if (!filter.sets.includes(card.set)) return false;
    }
    
    // Color filter
    if (filter.colors && filter.colors.length > 0) {
      if (!matchesColors(card, filter.colors)) return false;
    }
    
    // Rarity filter
    if (filter.rarities && filter.rarities.length > 0) {
      if (!filter.rarities.includes(card.rarity)) return false;
    }
    
    // Type filter
    if (filter.types && filter.types.length > 0) {
      const cardTypes = getCardTypes(card.type_line);
      if (!filter.types.some(type => cardTypes.includes(type))) return false;
    }
    
    // CMC filter
    if (filter.cmc_min !== undefined && card.cmc < filter.cmc_min) return false;
    if (filter.cmc_max !== undefined && card.cmc > filter.cmc_max) return false;
    
    // Text search
    if (filter.text_contains) {
      const searchText = filter.text_contains.toLowerCase();
      const cardText = (card.oracle_text || '').toLowerCase();
      if (!cardText.includes(searchText)) return false;
    }
    
    // Name search
    if (filter.name_contains) {
      const searchName = filter.name_contains.toLowerCase();
      if (!card.name.toLowerCase().includes(searchName)) return false;
    }
    
    return true;
  });
}

/**
 * Sorts cards based on criteria
 */
export function sortCards(cards: MTGCard[], sort: CardSort): MTGCard[] {
  const sorted = [...cards].sort((a, b) => {
    const aValue = a[sort.field];
    const bValue = b[sort.field];
    
    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sort.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sort.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    }
    
    // Convert to string for other types
    const aStr = String(aValue || '');
    const bStr = String(bValue || '');
    
    return sort.direction === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });
  
  return sorted;
}

/**
 * Groups cards by rarity for pack generation
 */
export function groupCardsByRarity(cards: MTGCard[]): Record<MTGRarity, MTGCard[]> {
  const groups: Record<MTGRarity, MTGCard[]> = {
    common: [],
    uncommon: [],
    rare: [],
    mythic: [],
    special: [],
    bonus: []
  };
  
  cards.forEach(card => {
    if (groups[card.rarity]) {
      groups[card.rarity].push(card);
    }
  });
  
  return groups;
}

/**
 * Generates a randomized booster pack from a set
 */
export function generateBoosterPack(
  setData: MTGSetData,
  packId: string,
  pickNumber: number = 1
): { cards: MTGCard[], id: string } {
  const rarityGroups = groupCardsByRarity(setData.cards);
  
  // Standard booster configuration (15 cards)
  // 1 rare/mythic, 3 uncommons, 11 commons
  const pack: MTGCard[] = [];
  
  // Add rare/mythic (1:8 chance for mythic)
  const rarePool = Math.random() < 0.125 ? rarityGroups.mythic : rarityGroups.rare;
  if (rarePool.length > 0) {
    pack.push(rarePool[Math.floor(Math.random() * rarePool.length)]);
  }
  
  // Add uncommons
  for (let i = 0; i < 3; i++) {
    if (rarityGroups.uncommon.length > 0) {
      pack.push(rarityGroups.uncommon[Math.floor(Math.random() * rarityGroups.uncommon.length)]);
    }
  }
  
  // Add commons
  for (let i = 0; i < 11; i++) {
    if (rarityGroups.common.length > 0) {
      pack.push(rarityGroups.common[Math.floor(Math.random() * rarityGroups.common.length)]);
    }
  }
  
  // Shuffle the pack
  for (let i = pack.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pack[i], pack[j]] = [pack[j], pack[i]];
  }
  
  return {
    id: packId,
    cards: pack
  };
}

/**
 * Ensures a draft card has a valid instanceId
 */
export function ensureDraftCardInstanceId(card: DraftCard, context: string = 'migrated'): DraftCard {
  if (!card.instanceId) {
    return {
      ...card,
      instanceId: `${context}-${card.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };
  }
  return card;
}

/**
 * Converts a regular MTG card to a draft card with additional metadata
 */
export function toDraftCard(card: MTGCard, context: string = 'card'): DraftCard {
  // Handle image URLs for both normal cards and double-faced cards
  let imageUrl = '';
  if (card.image_uris?.normal) {
    imageUrl = card.image_uris.normal;
  } else if (card.image_uris?.large) {
    imageUrl = card.image_uris.large;
  } else if (card.image_uris?.small) {
    imageUrl = card.image_uris.small;
  } else if (card.card_faces && card.card_faces[0]?.image_uris?.normal) {
    // Handle double-faced cards - use the front face image
    imageUrl = card.card_faces[0].image_uris.normal;
  } else if (card.card_faces && card.card_faces[0]?.image_uris?.large) {
    imageUrl = card.card_faces[0].image_uris.large;
  } else if (card.card_faces && card.card_faces[0]?.image_uris?.small) {
    imageUrl = card.card_faces[0].image_uris.small;
  }

  // Handle mana cost for both normal cards and double-faced cards
  let manaCost = card.mana_cost || '';
  if (!manaCost && card.card_faces && card.card_faces[0]?.mana_cost) {
    manaCost = card.card_faces[0].mana_cost;
  }

  // Generate unique instance ID
  const instanceId = `${context}-${card.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  return {
    ...card,
    // Unique instance ID for React keys
    instanceId,
    // Convert snake_case to camelCase for component compatibility
    imageUrl,
    manaCost,
    pick_priority: calculateBasicPickPriority(card),
    synergy_tags: generateSynergyTags(card)
  } as DraftCard;
}

/**
 * Enhanced pick priority calculation based on common draft principles
 */
function calculateBasicPickPriority(card: MTGCard): number {
  let priority = 50; // Base priority
  const text = card.oracle_text?.toLowerCase() || '';
  const types = getCardTypes(card.type_line);
  
  // Rarity-based base value
  switch (card.rarity) {
    case 'mythic': priority = 85; break;
    case 'rare': priority = 75; break;
    case 'uncommon': priority = 60; break;
    case 'common': priority = 45; break;
  }
  
  // Card type adjustments
  if (isCreature(card)) {
    priority += 5; // Creatures are generally good
    
    // Power/toughness evaluation for creatures
    const power = parseFloat(card.power || '0');
    const toughness = parseFloat(card.toughness || '0');
    const cmc = card.cmc || 0;
    
    if (!isNaN(power) && !isNaN(toughness)) {
      // Vanilla test: good stats for cost
      const statSum = power + toughness;
      const expectedStats = (cmc * 2) + 1;
      const statBonus = Math.min(10, Math.max(-10, (statSum - expectedStats) * 2));
      priority += statBonus;
      
      // Flying creatures get bonus
      if (text.includes('flying')) priority += 8;
      
      // Other evasion abilities
      if (text.includes('trample') || text.includes('menace') || 
          text.includes('unblockable') || text.includes("can't be blocked")) {
        priority += 5;
      }
    }
  }
  
  // Removal spells (high priority)
  if (text.includes('destroy target creature') || 
      text.includes('destroy target permanent') ||
      text.includes('exile target creature')) {
    priority += 20;
  }
  
  // Direct damage spells
  if (text.includes('damage to any target') || 
      text.includes('damage to target creature') ||
      (text.includes('damage') && types.includes('Instant'))) {
    priority += 12;
  }
  
  // Card advantage (draw spells)
  if (text.includes('draw') && text.includes('card')) {
    priority += 10;
  }
  
  // Counterspells
  if (text.includes('counter target spell')) {
    priority += 8;
  }
  
  // Expensive spells get penalty unless they're bombs
  if (card.cmc >= 6) {
    priority -= 5;
    // But big creatures with good stats are still valuable
    if (isCreature(card)) {
      const power = parseFloat(card.power || '0');
      if (power >= 6) priority += 8; // Big threats
    }
  }
  
  // Cheap efficient spells get bonus
  if (card.cmc <= 2 && !isLand(card)) {
    priority += 3;
  }
  
  // Lands are generally lower priority in limited
  if (isLand(card)) {
    priority = 25;
    // Non-basic lands can be more valuable
    if (!text.includes('basic') && !types.includes('Basic')) {
      priority = 35;
    }
  }
  
  // Artifacts often provide utility
  if (types.includes('Artifact') && !isCreature(card)) {
    priority += 3;
  }
  
  // Auras and equipment that boost creatures
  if (types.includes('Aura') || types.includes('Equipment')) {
    if (text.includes('+') && (text.includes('/+') || text.includes('+'))) {
      priority += 5;
    }
  }
  
  return Math.max(0, Math.min(100, priority));
}

/**
 * Bot personality types with different drafting behaviors
 */
export interface BotPersonality {
  name: string;
  skill_level: number; // 0-1, how close to optimal picks
  randomness: number; // 0-1, how much noise to add
  rare_bias: number; // Multiplier for rare card values
  color_commitment: number; // 0-1, how well they stick to colors
  description: string;
}

export const BOT_PERSONALITIES: Record<string, BotPersonality> = {
  bronze: {
    name: 'Bronze Bot',
    skill_level: 0.3,
    randomness: 0.4,
    rare_bias: 1.5, // Overvalues rares
    color_commitment: 0.5, // Poor color discipline
    description: 'New player - picks rares highly, poor signals'
  },
  silver: {
    name: 'Silver Bot',
    skill_level: 0.5,
    randomness: 0.3,
    rare_bias: 1.2,
    color_commitment: 0.7,
    description: 'Intermediate - decent card evaluation, some signals'
  },
  gold: {
    name: 'Gold Bot',
    skill_level: 0.7,
    randomness: 0.2,
    rare_bias: 1.0,
    color_commitment: 0.85,
    description: 'Experienced - good evaluation, reads signals'
  },
  mythic: {
    name: 'Mythic Bot',
    skill_level: 0.9,
    randomness: 0.1,
    rare_bias: 0.9, // Knows when to pass rares
    color_commitment: 0.95,
    description: 'Expert - optimal picks, excellent signals'
  }
};

/**
 * Calculate pick priority with bot personality adjustments
 */
export function calculateBotPickPriority(
  card: MTGCard, 
  personality: BotPersonality,
  context?: {
    picked_cards?: MTGCard[];
    pack_position?: number;
    round?: number;
  }
): number {
  let priority = calculateBasicPickPriority(card);
  
  // Apply rare bias
  if (card.rarity === 'rare' || card.rarity === 'mythic') {
    priority *= personality.rare_bias;
  }
  
  // Color commitment logic
  if (context?.picked_cards) {
    const pickedColors = getPickedColors(context.picked_cards);
    const cardColors = new Set(card.color_identity || []);
    
    if (pickedColors.size > 0 && cardColors.size > 0) {
      const colorMatch = hasColorOverlap(pickedColors, cardColors);
      const colorBonus = colorMatch ? 
        personality.color_commitment * 15 : 
        -personality.color_commitment * 10;
      priority += colorBonus;
    }
  }
  
  // Skill level adjustment (how close to optimal)
  const skillAdjustment = (1 - personality.skill_level) * Math.random() * 20 - 10;
  priority += skillAdjustment;
  
  // Add randomness
  const noise = (Math.random() - 0.5) * personality.randomness * 30;
  priority += noise;
  
  return Math.max(0, Math.min(100, priority));
}

/**
 * Get the colors that have been picked so far
 */
function getPickedColors(cards: MTGCard[]): Set<MTGColorSymbol> {
  const colors = new Set<MTGColorSymbol>();
  
  cards.forEach(card => {
    if (card.color_identity) {
      card.color_identity.forEach(color => colors.add(color));
    }
  });
  
  return colors;
}

/**
 * Check if there's overlap between picked colors and card colors
 */
function hasColorOverlap(pickedColors: Set<MTGColorSymbol>, cardColors: Set<MTGColorSymbol>): boolean {
  for (const color of cardColors) {
    if (pickedColors.has(color)) return true;
  }
  return false;
}

/**
 * Choose the best card for a bot to pick from available options
 */
export function chooseBotPick(
  availableCards: MTGCard[],
  personalityType: keyof typeof BOT_PERSONALITIES = 'silver',
  context?: {
    picked_cards?: MTGCard[];
    pack_position?: number;
    round?: number;
  }
): MTGCard | null {
  if (availableCards.length === 0) return null;
  
  const personality = BOT_PERSONALITIES[personalityType];
  
  // Calculate priority for each card
  const cardPriorities = availableCards.map(card => ({
    card,
    priority: calculateBotPickPriority(card, personality, context)
  }));
  
  // Sort by priority (highest first)
  cardPriorities.sort((a, b) => b.priority - a.priority);
  
  // Sometimes pick a lower-ranked card based on skill level
  const pickRange = Math.min(3, cardPriorities.length);
  const weights = [0.7, 0.2, 0.1].slice(0, pickRange);
  
  // Higher skill = more likely to pick the best card
  if (Math.random() < personality.skill_level) {
    return cardPriorities[0].card;
  } else {
    // Pick from top 3 with weights
    const randomValue = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < pickRange; i++) {
      cumulativeWeight += weights[i];
      if (randomValue <= cumulativeWeight) {
        return cardPriorities[i].card;
      }
    }
    
    return cardPriorities[0].card;
  }
}

/**
 * Generate basic synergy tags for a card
 */
function generateSynergyTags(card: MTGCard): string[] {
  const tags: string[] = [];
  const text = card.oracle_text?.toLowerCase() || '';
  const types = getCardTypes(card.type_line);
  
  // Add type-based tags
  tags.push(...types.map(type => type.toLowerCase()));
  
  // Add color tags
  if (card.color_identity) {
    card.color_identity.forEach(color => {
      tags.push(`color-${color.toLowerCase()}`);
    });
  }
  
  // Add mechanic tags (basic)
  if (text.includes('flying')) tags.push('flying');
  if (text.includes('trample')) tags.push('trample');
  if (text.includes('lifelink')) tags.push('lifelink');
  if (text.includes('first strike')) tags.push('first-strike');
  if (text.includes('vigilance')) tags.push('vigilance');
  if (text.includes('haste')) tags.push('haste');
  
  return tags;
}

/**
 * Calculate mana curve statistics for a deck
 */
export function calculateManaCurve(cards: MTGCard[]): Record<number, number> {
  const curve: Record<number, number> = {};
  
  cards.forEach(card => {
    const cmc = Math.min(card.cmc, 7); // Cap at 7+ for curve display
    curve[cmc] = (curve[cmc] || 0) + 1;
  });
  
  return curve;
}

/**
 * Calculate basic deck statistics
 */
export interface DeckStats {
  total_cards: number;
  creatures: number;
  spells: number;
  lands: number;
  average_cmc: number;
  mana_curve: Record<number, number>;
  color_distribution: Record<MTGColorSymbol | 'colorless', number>;
}

export function calculateDeckStats(cards: MTGCard[]): DeckStats {
  const stats: DeckStats = {
    total_cards: cards.length,
    creatures: 0,
    spells: 0,
    lands: 0,
    average_cmc: 0,
    mana_curve: calculateManaCurve(cards),
    color_distribution: { W: 0, U: 0, B: 0, R: 0, G: 0, colorless: 0 }
  };
  
  let totalCmc = 0;
  
  cards.forEach(card => {
    // Count by type
    if (isCreature(card)) stats.creatures++;
    else if (isLand(card)) stats.lands++;
    else if (isSpell(card)) stats.spells++;
    
    // CMC calculation (exclude lands)
    if (!isLand(card)) {
      totalCmc += card.cmc;
    }
    
    // Color distribution
    const primaryColor = getPrimaryColor(card);
    if (primaryColor === 'colorless') {
      stats.color_distribution.colorless++;
    } else {
      stats.color_distribution[primaryColor]++;
    }
  });
  
  // Calculate average CMC (excluding lands)
  const nonLandCards = cards.filter(card => !isLand(card));
  stats.average_cmc = nonLandCards.length > 0 ? totalCmc / nonLandCards.length : 0;
  
  return stats;
}