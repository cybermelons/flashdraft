/**
 * FlashDraft - MTG Card Display Component
 * 
 * Displays a Magic: The Gathering card with image, details,
 * and interactive functionality for draft selection.
 */

import React, { useState, useCallback } from 'react';
import type { DraftCard, MTGColorSymbol } from '../../shared/types/card';
import CardImage from './CardImage';
import CardOverlay from './CardOverlay';
import { CardTypeIndicators } from './CardTypeIndicators';
import { CardHoverDetails } from './CardHoverDetails';

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


  // Size classes - mobile responsive
  const sizeClasses = {
    small: 'w-16 h-22 sm:w-20 sm:h-28',
    normal: 'w-24 h-32 sm:w-28 sm:h-40 md:w-32 md:h-44', 
    large: 'w-32 h-44 sm:w-40 sm:h-56 md:w-48 md:h-64',
  };

  return (
    <CardHoverDetails card={card}>
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
          <CardImage 
            card={card}
            size={size}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          
          <CardOverlay 
            card={card}
            selected={selected}
            showDetails={showDetails}
            size={size}
          />
        </div>

        <CardTypeIndicators card={card} />
      </div>
    </CardHoverDetails>
  );
};

// Memoized version for performance
export const MemoizedCard = React.memo(Card);

export default Card;
