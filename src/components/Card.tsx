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
  onDoubleClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showBackFace?: boolean; // For dual-sided cards
  responsive?: boolean; // Make card fill container width
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
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  className = '',
  size = 'medium',
  showBackFace = false,
  responsive = false
}: CardProps) {
  const [currentFace, setCurrentFace] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = () => {
    if (canInteract && onClick) {
      onClick();
    }
  };

  const handleDoubleClick = () => {
    if (canInteract && onDoubleClick) {
      onDoubleClick();
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
  
  // Reset image loaded state when card changes
  React.useEffect(() => {
    setImageLoaded(false);
  }, [card.id]);

  // Get image URL with fallback logic
  const getImageUrl = (imageUris?: CardImageUris): string | null => {
    if (!imageUris) return null;
    return imageUris.normal || imageUris.large || imageUris.small || imageUris.png || null;
  };

  const imageUrl = getImageUrl(displayCard.image_uris);
  

  // Simplified border styling - no colors or rarity effects
  const getBorderClasses = () => {
    return 'border border-slate-600';
  };

  // Size classes
  const getSizeClasses = () => {
    if (responsive) {
      // For responsive cards, use full width and aspect ratio
      return 'w-full aspect-[488/680]';
    }
    switch (size) {
      case 'small': return 'w-20 h-28';
      case 'large': return 'w-64 h-90';
      default: return 'w-40 h-56';
    }
  };

  // Format mana cost - simplified to just show symbols
  const formatManaCost = (manaCost?: string) => {
    if (!manaCost) return null;
    
    // Just show the symbols without fancy styling
    return manaCost.replace(/\{([^}]+)\}/g, (match, symbol) => {
      return `<span class="inline-block mx-0.5">${symbol}</span>`;
    });
  };

  const toggleFace = () => {
    if (isDualSided && card.card_faces) {
      setCurrentFace((prev) => (prev + 1) % card.card_faces!.length);
    }
  };

  return (
    <div
      data-card-id={card.id}
      className={`
        relative rounded-lg overflow-hidden
        ${getSizeClasses()}
        ${getBorderClasses()}
        ${canInteract ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `.trim()}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={canInteract ? 0 : -1}
      role={canInteract ? 'button' : 'img'}
      aria-label={`${displayCard.name} - ${displayCard.type_line || card.type} - ${card.rarity}`}
    >

      {/* Dual-sided card flip button */}
      {isDualSided && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFace();
          }}
          className="absolute top-2 right-2 w-6 h-6 bg-slate-800/80 text-white rounded-full flex items-center justify-center text-xs font-bold z-30"
          title="Flip card"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
      )}

      {/* Hover darkening overlay */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/20 z-20 pointer-events-none rounded-lg" />
      )}
      
      {/* Card image or fallback */}
      <div className="relative w-full h-full bg-slate-900">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={displayCard.name}
            loading="eager"
            className={`w-full h-full object-cover transition-opacity duration-150 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
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
            
          </div>
        )}
        
      </div>


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
    <div className={`relative rounded-lg overflow-hidden bg-slate-700/50 border border-slate-600 ${getSizeClasses()} ${className}`}>
      <div className="w-full h-full animate-pulse bg-slate-700" />
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
