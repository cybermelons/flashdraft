/**
 * FlashDraft - MTG Card Display Component
 * 
 * Displays a Magic: The Gathering card with image, details,
 * and interactive functionality for draft selection.
 */

import React, { useState, useCallback } from 'react';
import type { DraftCard, MTGColorSymbol } from '../../shared/types/card.js';

// Client-safe utility functions
const getPrimaryColor = (card: DraftCard): MTGColorSymbol | 'colorless' => {
  if (!card.color_identity || card.color_identity.length === 0) {
    return 'colorless';
  }
  if (card.color_identity.length === 1) {
    return card.color_identity[0];
  }
  return card.color_identity[0];
};

const isCreature = (card: DraftCard): boolean => {
  return card.type_line.includes('Creature');
};

const isLand = (card: DraftCard): boolean => {
  return card.type_line.includes('Land');
};

const isSpell = (card: DraftCard): boolean => {
  return card.type_line.includes('Instant') || card.type_line.includes('Sorcery');
};

export interface CardProps {
  card: DraftCard;
  size?: 'small' | 'normal' | 'large';
  selected?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
  onClick?: (card: DraftCard) => void;
  onHover?: (card: DraftCard | null) => void;
  className?: string;
}

// Mana symbol mapping for display
const MANA_SYMBOLS: Record<string, string> = {
  'W': '⚪', // White
  'U': '🔵', // Blue  
  'B': '⚫', // Black
  'R': '🔴', // Red
  'G': '🟢', // Green
  'C': '⚪', // Colorless
  'X': '❌', // Variable
};

// Color class mapping for styling
const COLOR_CLASSES: Record<MTGColorSymbol | 'colorless' | 'multicolor', string> = {
  'W': 'border-yellow-200 bg-yellow-50',
  'U': 'border-blue-200 bg-blue-50', 
  'B': 'border-gray-200 bg-gray-50',
  'R': 'border-red-200 bg-red-50',
  'G': 'border-green-200 bg-green-50',
  'colorless': 'border-gray-300 bg-gray-100',
  'multicolor': 'border-purple-200 bg-purple-50',
};

const RARITY_COLORS: Record<string, string> = {
  'common': 'text-gray-600',
  'uncommon': 'text-blue-600',
  'rare': 'text-yellow-600',
  'mythic': 'text-orange-600',
  'special': 'text-purple-600',
};

export const Card: React.FC<CardProps> = ({
  card,
  size = 'normal',
  selected = false,
  disabled = false,
  showDetails = true,
  onClick,
  onHover,
  className = '',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get card color for styling
  const primaryColor = getPrimaryColor(card);
  const colorClass = card.color_identity.length > 1 
    ? COLOR_CLASSES.multicolor 
    : COLOR_CLASSES[primaryColor];

  // Format mana cost for display
  const formatManaCost = useCallback((manaCost: string) => {
    if (!manaCost) return '';
    
    // Simple formatting - replace mana symbols
    return manaCost
      .replace(/\{([WUBRGCX])\}/g, (_, symbol) => MANA_SYMBOLS[symbol] || symbol)
      .replace(/\{(\d+)\}/g, '$1');
  }, []);

  // Handle card click
  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick(card);
    }
  }, [card, disabled, onClick]);

  // Handle mouse events
  const handleMouseEnter = useCallback(() => {
    if (onHover) onHover(card);
  }, [card, onHover]);

  const handleMouseLeave = useCallback(() => {
    if (onHover) onHover(null);
  }, [onHover]);

  // Image URL - prefer normal size for draft interface
  const imageUrl = card.image_uris?.[size === 'small' ? 'small' : 'normal'];

  // Size classes
  const sizeClasses = {
    small: 'w-20 h-28',
    normal: 'w-32 h-44', 
    large: 'w-48 h-64',
  };

  return (
    <div
      className={`
        relative rounded-lg border-2 transition-all duration-200 cursor-pointer
        ${colorClass}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105'}
        ${sizeClasses[size]}
        ${className}
      `}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card Image */}
      <div className="relative w-full h-full rounded-lg overflow-hidden">
        {imageUrl && !imageError ? (
          <React.Fragment>
            <img
              src={imageUrl}
              alt={card.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                <div className="text-gray-400 text-xs">Loading...</div>
              </div>
            )}
          </React.Fragment>
        ) : (
          <div className="w-full h-full bg-white border border-gray-300 p-2 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold mb-1 overflow-hidden line-clamp-2">
                {card.name}
              </div>
              <div className="text-xs text-gray-600">
                {formatManaCost(card.mana_cost || '')}
              </div>
            </div>
            
            <div className="text-xs">
              <div className="text-gray-600 mb-1 truncate">
                {card.type_line}
              </div>
              <div className={`font-medium ${RARITY_COLORS[card.rarity] || 'text-gray-600'}`}>
                {card.rarity}
              </div>
            </div>
          </div>
        )}

        {/* Selection indicator */}
        {selected && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
              ✓
            </div>
          </div>
        )}

        {/* Quick info overlay (visible on hover for normal+ sizes) */}
        {showDetails && size !== 'small' && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-1 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <div className="text-xs">
              <div className="font-semibold truncate">{card.name}</div>
              <div className="flex justify-between items-center">
                <span>{formatManaCost(card.mana_cost || '')}</span>
                <span className={RARITY_COLORS[card.rarity]}>{card.rarity[0].toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Draft priority indicator (for debugging/analysis) */}
        {card.pick_priority && process.env.NODE_ENV === 'development' && (
          <div className="absolute top-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
            {Math.round(card.pick_priority)}
          </div>
        )}
      </div>

      {/* Card type indicators */}
      <div className="absolute top-1 left-1 flex space-x-1">
        {isCreature(card) && (
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Creature" />
        )}
        {isLand(card) && (
          <div className="w-2 h-2 bg-amber-600 rounded-full" title="Land" />
        )}
        {isSpell(card) && (
          <div className="w-2 h-2 bg-purple-500 rounded-full" title="Spell" />
        )}
      </div>
    </div>
  );
};

// Memoized version for performance
export const MemoizedCard = React.memo(Card);

export default Card;