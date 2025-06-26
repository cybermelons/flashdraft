/**
 * FlashDraft - Card Image Component
 * 
 * Handles MTG card image display with loading states and fallbacks.
 */

import React, { useState } from 'react';
import type { DraftCard } from '../../shared/types/card.js';

interface CardImageProps {
  card: DraftCard;
  size: 'small' | 'normal' | 'large';
  onLoad?: () => void;
  onError?: () => void;
}

const MANA_SYMBOLS: Record<string, string> = {
  'W': '⚪', 'U': '🔵', 'B': '⚫', 'R': '🔴', 'G': '🟢', 'C': '⚪', 'X': '❌'
};

const RARITY_COLORS: Record<string, string> = {
  'common': 'text-gray-600',
  'uncommon': 'text-blue-600',
  'rare': 'text-yellow-600',
  'mythic': 'text-orange-600',
  'special': 'text-purple-600',
};

const formatManaCost = (manaCost: string): string => {
  if (!manaCost) return '';
  return manaCost
    .replace(/\{([WUBRGCX])\}/g, (_, symbol) => MANA_SYMBOLS[symbol] || symbol)
    .replace(/\{(\d+)\}/g, '$1');
};

export const CardImage: React.FC<CardImageProps> = ({ card, size, onLoad, onError }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = card.image_uris?.[size === 'small' ? 'small' : 'normal'];

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  // Define classes outside JSX
  const imgOpacityClass = imageLoaded ? 'opacity-100' : 'opacity-0';
  const imgClassName = `w-full h-full object-cover transition-opacity duration-300 ${imgOpacityClass}`;
  
  const rarityColorClass = RARITY_COLORS[card.rarity] || 'text-gray-600';
  const rarityClassName = `font-medium ${rarityColorClass}`;

  if (imageUrl && !imageError) {
    return (
      <div className="relative w-full h-full">
        <img
          src={imageUrl}
          alt={card.name}
          className={imgClassName}
          onLoad={handleLoad}
          onError={handleError}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-xs">Loading...</div>
          </div>
        )}
      </div>
    );
  }

  // Fallback text display
  const formattedManaCost = formatManaCost(card.mana_cost || '');
  
  return (
    <div className="w-full h-full bg-white border border-gray-300 p-2 flex flex-col justify-between">
      <div>
        <div className="text-xs font-semibold mb-1 line-clamp-2">
          {card.name}
        </div>
        <div className="text-xs text-gray-600">
          {formattedManaCost}
        </div>
      </div>
      
      <div className="text-xs">
        <div className="text-gray-600 mb-1 truncate">
          {card.type_line}
        </div>
        <div className={rarityClassName}>
          {card.rarity}
        </div>
      </div>
    </div>
  );
};

export default CardImage;