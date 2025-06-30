/**
 * Card Component - Individual MTG card display
 * 
 * Renders a Magic: The Gathering card with proper styling,
 * interaction states, and accessibility features.
 */

import React from 'react';
import type { Card as CardData } from '@/lib/engine/PackGenerator';

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
  size = 'medium'
}: CardProps) {
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

  const getRarityClass = () => {
    switch (card.rarity) {
      case 'common': return 'rarity-common';
      case 'uncommon': return 'rarity-uncommon';
      case 'rare': return 'rarity-rare';
      case 'mythic': return 'rarity-mythic';
      default: return 'rarity-common';
    }
  };

  const getColorClass = () => {
    if (!card.colors || card.colors.length === 0) {
      return 'color-colorless';
    }
    
    if (card.colors.length === 1) {
      switch (card.colors[0]) {
        case 'W': return 'color-white';
        case 'U': return 'color-blue';
        case 'B': return 'color-black';
        case 'R': return 'color-red';
        case 'G': return 'color-green';
        default: return 'color-colorless';
      }
    }
    
    return 'color-multicolor';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'card-small';
      case 'large': return 'card-large';
      default: return 'card-medium';
    }
  };

  const formatManaCost = (manaCost?: string) => {
    if (!manaCost) return null;
    
    // Simple mana symbol rendering - would need proper symbol assets
    return manaCost.replace(/\{([^}]+)\}/g, '[$1]');
  };

  const getCardImageUrl = (card: CardData) => {
    // Placeholder for card images - would integrate with Scryfall API
    return `https://via.placeholder.com/200x280/333/fff?text=${encodeURIComponent(card.name)}`;
  };

  return (
    <div
      className={`
        mtg-card
        ${getSizeClass()}
        ${getRarityClass()}
        ${getColorClass()}
        ${isSelected ? 'card-selected' : ''}
        ${isHovered ? 'card-hovered' : ''}
        ${canInteract ? 'card-interactive' : 'card-static'}
        ${className}
      `.trim()}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={canInteract ? 0 : -1}
      role={canInteract ? 'button' : 'img'}
      aria-label={`${card.name} - ${card.type} - ${card.rarity}`}
    >
      {/* Quick pick number indicator */}
      {quickPickNumber && (
        <div className="quick-pick-number">
          {quickPickNumber}
        </div>
      )}
      
      {/* Card image */}
      <div className="card-image">
        <img
          src={getCardImageUrl(card)}
          alt={card.name}
          loading="lazy"
          onError={(e) => {
            // Fallback to text representation on image error
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.classList.add('card-image-fallback');
            }
          }}
        />
        
        {/* Fallback text display */}
        <div className="card-text-fallback">
          <div className="card-name">{card.name}</div>
          <div className="card-mana-cost">{formatManaCost(card.manaCost)}</div>
          <div className="card-type">{card.type}</div>
          <div className="card-rarity">{card.rarity}</div>
        </div>
      </div>
      
      {/* Card info overlay */}
      <div className="card-overlay">
        <div className="card-name-overlay">{card.name}</div>
        {card.manaCost && (
          <div className="card-mana-overlay">{formatManaCost(card.manaCost)}</div>
        )}
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="selection-indicator">
          <div className="selection-border" />
          <div className="selection-checkmark">✓</div>
        </div>
      )}
      
      {/* Interaction states */}
      {canInteract && (
        <div className="interaction-states">
          {isHovered && <div className="hover-glow" />}
          <div className="click-ripple" />
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
      className={`card-list-item ${props.className || ''}`}
    />
  );
}

/**
 * Card placeholder for loading states
 */
export function CardPlaceholder({ className = '', size = 'medium' }: { 
  className?: string; 
  size?: 'small' | 'medium' | 'large';
}) {
  return (
    <div className={`mtg-card card-placeholder ${size} ${className}`}>
      <div className="card-image">
        <div className="placeholder-shimmer" />
      </div>
    </div>
  );
}