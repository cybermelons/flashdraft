/**
 * Card Component - Individual MTG card display
 * 
 * Renders a Magic: The Gathering card with proper styling,
 * interaction states, and accessibility features.
 * Supports single-faced and dual-sided cards (transform, flip, etc.)
 */

import React, { useState } from 'react';
import type { Card as CardData, CardFace, CardImageUris } from '@/lib/engine/PackGenerator';

interface CardProps {
  card: CardData;
  isSelected?: boolean;
  isHovered?: boolean;
  canInteract?: boolean;
  quickPickNumber?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showBackFace?: boolean; // For dual-sided cards
}

/**
 * MTG Card component with interaction support
 */
export function Card({
  card,
  isSelected = false,
  isHovered = false,
  canInteract = true,
  quickPickNumber,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = '',
  size = 'medium',
  showBackFace = false
}: CardProps) {
  const [currentFace, setCurrentFace] = useState(0);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (canInteract && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (canInteract && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  };

  const isDualSided = card.card_faces && card.card_faces.length > 0;
  const activeFace = isDualSided && showBackFace ? card.card_faces[currentFace] : null;
  const displayCard = activeFace || card;

  // Get image URL with fallback logic
  const getImageUrl = (imageUris?: CardImageUris): string | null => {
    if (!imageUris) return null;
    return imageUris.normal || imageUris.large || imageUris.small || imageUris.png || null;
  };

  const imageUrl = getImageUrl(displayCard.image_uris);
  

  // Color-based styling
  const getColorClasses = () => {
    const colors = displayCard.colors || [];
    if (colors.length === 0) {
      return 'border-slate-400';
    } else if (colors.length === 1) {
      switch (colors[0]) {
        case 'W': return 'border-yellow-400';
        case 'U': return 'border-blue-400';
        case 'B': return 'border-gray-400';
        case 'R': return 'border-red-400';
        case 'G': return 'border-green-400';
        default: return 'border-slate-400';
      }
    } else {
      return 'border-gradient-to-br from-yellow-400 via-blue-400 to-red-400 border-4 bg-gradient-to-br from-yellow-500/20 via-blue-500/20 to-red-500/20';
    }
  };

  // Rarity-based styling
  const getRarityClasses = () => {
    switch (card.rarity) {
      case 'common': return 'shadow-md';
      case 'uncommon': return 'shadow-lg shadow-green-500/20';
      case 'rare': return 'shadow-xl shadow-yellow-500/30';
      case 'mythic': return 'shadow-2xl shadow-red-500/40';
      default: return 'shadow-md';
    }
  };

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'w-20 h-28';
      case 'large': return 'w-64 h-90';
      default: return 'w-40 h-56';
    }
  };

  // Format mana cost with proper symbols
  const formatManaCost = (manaCost?: string) => {
    if (!manaCost) return null;
    
    // Replace mana symbols with styled spans
    return manaCost.replace(/\{([^}]+)\}/g, (match, symbol) => {
      const colorClass = symbol === 'W' ? 'bg-yellow-400 text-black' :
                       symbol === 'U' ? 'bg-blue-400 text-white' :
                       symbol === 'B' ? 'bg-gray-800 text-white' :
                       symbol === 'R' ? 'bg-red-400 text-white' :
                       symbol === 'G' ? 'bg-green-400 text-white' :
                       /^\d+$/.test(symbol) ? 'bg-slate-400 text-white' :
                       'bg-slate-500 text-white';
      
      return `<span class="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold ${colorClass} mx-0.5">${symbol}</span>`;
    });
  };

  const toggleFace = () => {
    if (isDualSided && card.card_faces) {
      setCurrentFace((prev) => (prev + 1) % card.card_faces!.length);
    }
  };

  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden transition-all duration-200
        ${getSizeClasses()}
        ${getRarityClasses()}
        ${getColorClasses()}
        ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-105 z-10' : ''}
        ${isHovered ? 'scale-105 shadow-2xl z-20' : ''}
        ${canInteract ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-75'}
        ${className}
      `.trim()}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={canInteract ? 0 : -1}
      role={canInteract ? 'button' : 'img'}
      aria-label={`${displayCard.name} - ${displayCard.type_line || card.type} - ${card.rarity}`}
    >
      {/* Quick pick number indicator */}
      {quickPickNumber && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold z-30 shadow-lg border-2 border-white">
          {quickPickNumber}
        </div>
      )}

      {/* Dual-sided card flip button */}
      {isDualSided && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFace();
          }}
          className="absolute top-2 right-2 w-6 h-6 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-full flex items-center justify-center text-xs font-bold z-30 transition-colors"
          title="Flip card"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
      )}

      {/* Card image or fallback */}
      <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={displayCard.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Text fallback when image fails or unavailable */
          <div className="w-full h-full p-3 flex flex-col bg-gradient-to-br from-slate-700 to-slate-800 text-white">
            <div className="flex-1 flex flex-col">
              {/* Card name */}
              <div className="text-sm font-bold text-center mb-2 leading-tight">
                {displayCard.name}
              </div>
              
              {/* Mana cost */}
              {displayCard.mana_cost && (
                <div 
                  className="text-xs text-center mb-2 flex items-center justify-center flex-wrap"
                  dangerouslySetInnerHTML={{ __html: formatManaCost(displayCard.mana_cost) || '' }}
                />
              )}
              
              {/* Type line */}
              <div className="text-xs text-slate-300 text-center mb-2">
                {displayCard.type_line || card.type}
              </div>
              
              {/* Power/Toughness or Loyalty */}
              {(displayCard.power && displayCard.toughness) && (
                <div className="text-xs font-bold text-center bg-slate-600/50 rounded px-1 py-0.5 mt-auto">
                  {displayCard.power}/{displayCard.toughness}
                </div>
              )}
              
              {displayCard.loyalty && (
                <div className="text-xs font-bold text-center bg-slate-600/50 rounded px-1 py-0.5 mt-auto">
                  ◊{displayCard.loyalty}
                </div>
              )}
            </div>
            
            {/* Rarity indicator */}
            <div className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${
              card.rarity === 'common' ? 'bg-gray-400' :
              card.rarity === 'uncommon' ? 'bg-green-400' :
              card.rarity === 'rare' ? 'bg-yellow-400' :
              'bg-red-400'
            }`} />
          </div>
        )}
        
        {/* Card name overlay (always visible) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="text-white text-xs font-semibold truncate">
            {displayCard.name}
          </div>
          {displayCard.mana_cost && size !== 'small' && (
            <div 
              className="text-white text-xs flex items-center mt-1"
              dangerouslySetInnerHTML={{ __html: formatManaCost(displayCard.mana_cost) || '' }}
            />
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500/20 border-4 border-blue-500 rounded-2xl">
          <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
            ✓
          </div>
        </div>
      )}

      {/* Hover glow effect */}
      {isHovered && (
        <div className="absolute inset-0 bg-white/10 rounded-2xl pointer-events-none" />
      )}

      {/* Face indicator for dual-sided cards */}
      {isDualSided && card.card_faces && (
        <div className="absolute bottom-2 left-2 flex gap-1">
          {card.card_faces.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentFace ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Simplified card component for lists
 */
export function CardListItem({ card, ...props }: CardProps) {
  return (
    <Card 
      {...props}
      card={card}
      size="small"
      className={`${props.className || ''}`}
    />
  );
}

/**
 * Card placeholder for loading states
 */
export function CardPlaceholder({ 
  className = '', 
  size = 'medium' 
}: { 
  className?: string; 
  size?: 'small' | 'medium' | 'large';
}) {
  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'w-20 h-28';
      case 'large': return 'w-64 h-90';
      default: return 'w-40 h-56';
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-slate-700/50 ${getSizeClasses()} ${className}`}>
      <div className="w-full h-full animate-pulse bg-gradient-to-br from-slate-600 to-slate-800">
        <div className="w-full h-3/4 bg-slate-500/50" />
        <div className="p-2 space-y-1">
          <div className="h-2 bg-slate-400/50 rounded" />
          <div className="h-2 bg-slate-400/30 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Dual-sided card viewer component
 */
export function DualSidedCardViewer({ 
  card, 
  className = '' 
}: { 
  card: CardData; 
  className?: string; 
}) {
  const [showBackFace, setShowBackFace] = useState(false);

  if (!card.card_faces || card.card_faces.length === 0) {
    return <Card card={card} className={className} />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Dual-Sided Card</h3>
        <button
          onClick={() => setShowBackFace(!showBackFace)}
          className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
        >
          Show {showBackFace ? 'Front' : 'Back'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium text-slate-300 mb-2">Front Face</div>
          <Card card={card} showBackFace={false} size="large" />
        </div>
        
        <div>
          <div className="text-sm font-medium text-slate-300 mb-2">Back Face</div>
          <Card card={card} showBackFace={true} size="large" />
        </div>
      </div>
    </div>
  );
}