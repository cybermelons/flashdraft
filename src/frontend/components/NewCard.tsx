/** @jsxImportSource react */
/**
 * New Card Component
 * 
 * Enhanced card component using the new engine architecture.
 * Displays MTG cards with hover effects, selection states, and interaction handling.
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import type { Card } from '../../engine/types/core';

export interface NewCardProps {
  card: Card;
  size?: 'small' | 'medium' | 'large';
  isSelected?: boolean;
  isHovered?: boolean;
  canInteract?: boolean;
  showSelectionIndicator?: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
  onDoubleClick?: () => void;
  className?: string;
}

export const NewCard: React.FC<NewCardProps> = ({
  card,
  size = 'medium',
  isSelected = false,
  isHovered = false,
  canInteract = true,
  showSelectionIndicator = false,
  onClick,
  onHover,
  onDoubleClick,
  className = ''
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleMouseEnter = useCallback(() => {
    // Temporarily disabled for debugging
    // if (canInteract && onHover) {
    //   onHover(true);
    // }
  }, [canInteract, onHover]);

  const handleMouseLeave = useCallback(() => {
    // Temporarily disabled for debugging  
    // if (onHover) {
    //   onHover(false);
    // }
  }, [onHover]);

  const handleClick = useCallback(() => {
    if (canInteract && onClick) {
      onClick();
    }
  }, [canInteract, onClick]);

  const handleDoubleClick = useCallback(() => {
    if (canInteract && onDoubleClick) {
      onDoubleClick();
    }
  }, [canInteract, onDoubleClick]);

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-16 h-22',
      image: 'w-full h-full',
      text: 'text-xs'
    },
    medium: {
      container: 'w-32 h-44',
      image: 'w-full h-full',
      text: 'text-sm'
    },
    large: {
      container: 'w-48 h-66',
      image: 'w-full h-full',
      text: 'text-base'
    }
  };

  const config = sizeConfig[size];

  // Determine mana cost colors for display
  const getManaCostColors = (manaCost: string) => {
    if (!manaCost) return [];
    
    const colorMatches = manaCost.match(/\{([WUBRG])\}/g);
    return colorMatches ? colorMatches.map(match => match.slice(1, -1)) : [];
  };

  const manaColors = getManaCostColors(card.manaCost || '');

  // Debug logging
  React.useEffect(() => {
    console.log('NewCard received card data:', {
      id: card.id,
      name: card.name,
      imageUrl: card.imageUrl,
      manaCost: card.manaCost,
      image_uris: (card as any).image_uris,
      mana_cost: (card as any).mana_cost,
      hasImageUrl: !!card.imageUrl,
      imageUrlLength: card.imageUrl?.length || 0
    });
  }, [card]);

  return (
    <div
      className={`
        relative rounded-lg overflow-hidden bg-gray-200 shadow-md
        ${config.container}
        ${canInteract ? 'cursor-pointer' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${className}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card Image */}
      {!imageError ? (
        <img
          src={card.imageUrl}
          alt={card.name}
          className={`${config.image} object-cover`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
      ) : null}

      {/* Loading/Error Fallback */}
      {(!imageLoaded || imageError) && (
        <div className={`${config.image} bg-gray-300 flex flex-col items-center justify-center p-2`}>
          {imageError ? (
            <>
              <div className="text-gray-500 text-center">
                <div className="text-2xl mb-1">🎴</div>
                <div className={`${config.text} font-semibold leading-tight mb-1`}>
                  {card.name}
                </div>
                <div className={`${config.text} opacity-75`}>
                  {card.manaCost}
                </div>
              </div>
              
              {/* Mana cost colored indicators */}
              {manaColors.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {manaColors.map((color, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full ${
                        color === 'W' ? 'bg-yellow-200' :
                        color === 'U' ? 'bg-blue-400' :
                        color === 'B' ? 'bg-gray-800' :
                        color === 'R' ? 'bg-red-500' :
                        color === 'G' ? 'bg-green-500' :
                        'bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={`${config.text} text-gray-500 animate-pulse`}>
              Loading...
            </div>
          )}
        </div>
      )}

      {/* Selection Indicator */}
      {showSelectionIndicator && isSelected && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded-lg pointer-events-none">
          <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            ✓
          </div>
        </div>
      )}

      {/* Hover Overlay */}
      {isHovered && canInteract && (
        <div className="absolute inset-0 bg-white bg-opacity-10 pointer-events-none" />
      )}

      {/* Disabled Overlay */}
      {!canInteract && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-50 pointer-events-none" />
      )}

      {/* Card Name Tooltip for Small Size */}
      {size === 'small' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate opacity-0 hover:opacity-100 transition-opacity">
          {card.name}
        </div>
      )}
    </div>
  );
};

export default NewCard;