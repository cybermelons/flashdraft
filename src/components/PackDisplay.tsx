/**
 * Pack Display - Shows current pack cards with interaction
 * 
 * Displays cards in the current pack, handles selection, hover states,
 * and card picking. Supports different view modes and sorting.
 */

import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { 
  $selectedCard, 
  $hoveredCard,
  uiActions 
} from '@/stores/draftStore';
import { 
  $packViewMode, 
  $sortBy, 
  $cardDisplaySize,
  $filterBy 
} from '@/stores/uiStore';
import type { BoosterPack, Card } from '@/lib/engine/PackGenerator';
import { Card as CardComponent } from './Card';

interface PackDisplayProps {
  pack: BoosterPack;
  onCardPick: (cardId: string) => void;
  canPick: boolean;
  className?: string;
}

/**
 * Display pack cards with interaction support
 */
export function PackDisplay({ pack, onCardPick, canPick, className = '' }: PackDisplayProps) {
  const selectedCard = useStore($selectedCard);
  const hoveredCard = useStore($hoveredCard);
  const packViewMode = useStore($packViewMode);
  const sortBy = useStore($sortBy);
  const cardDisplaySize = useStore($cardDisplaySize);
  const filterBy = useStore($filterBy);
  
  const [quickPickMode, setQuickPickMode] = useState(false);

  // Sort and filter cards
  const displayCards = sortAndFilterCards(pack.cards, sortBy, filterBy);

  const handleCardClick = (card: Card) => {
    if (!canPick) return;
    
    if (quickPickMode) {
      // Quick pick mode: immediately pick card
      onCardPick(card.id);
    } else {
      // Select card first, then pick with confirm
      if (selectedCard?.id === card.id) {
        // Double-click or second click picks the card
        onCardPick(card.id);
      } else {
        uiActions.selectCard(card);
      }
    }
  };

  const handleCardHover = (card: Card | null) => {
    uiActions.hoverCard(card);
  };

  const handleKeyboardPick = (event: KeyboardEvent) => {
    if (!canPick) return;
    
    // Number keys 1-9 for quick card selection
    const keyNum = parseInt(event.key);
    if (keyNum >= 1 && keyNum <= 9 && keyNum <= displayCards.length) {
      const card = displayCards[keyNum - 1];
      onCardPick(card.id);
    }
    
    // Enter to pick selected card
    if (event.key === 'Enter' && selectedCard) {
      onCardPick(selectedCard.id);
    }
    
    // Arrow keys for navigation
    if (selectedCard && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      navigateSelection(event.key);
    }
  };

  const navigateSelection = (direction: string) => {
    if (!selectedCard) {
      // Select first card if none selected
      uiActions.selectCard(displayCards[0]);
      return;
    }
    
    const currentIndex = displayCards.findIndex(card => card.id === selectedCard.id);
    if (currentIndex === -1) return;
    
    let newIndex = currentIndex;
    const cardsPerRow = Math.floor(window.innerWidth / (cardDisplaySize.width + 20)); // Rough estimate
    
    switch (direction) {
      case 'ArrowLeft':
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
        newIndex = Math.min(displayCards.length - 1, currentIndex + 1);
        break;
      case 'ArrowUp':
        newIndex = Math.max(0, currentIndex - cardsPerRow);
        break;
      case 'ArrowDown':
        newIndex = Math.min(displayCards.length - 1, currentIndex + cardsPerRow);
        break;
    }
    
    if (newIndex !== currentIndex) {
      uiActions.selectCard(displayCards[newIndex]);
    }
  };

  // Keyboard event handling
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyboardPick(event);
    };
    
    if (canPick) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [canPick, selectedCard, displayCards]);

  const getViewModeClass = () => {
    switch (packViewMode) {
      case 'spread': return 'pack-spread';
      case 'compact': return 'pack-compact';
      case 'list': return 'pack-list';
      default: return 'pack-spread';
    }
  };

  const getGridStyle = () => {
    const { width } = cardDisplaySize;
    const gap = 16;
    const minCardsPerRow = packViewMode === 'list' ? 1 : 3;
    const maxCardsPerRow = packViewMode === 'list' ? 1 : 6;
    
    return {
      gridTemplateColumns: `repeat(auto-fit, minmax(${width}px, 1fr))`,
      gap: `${gap}px`,
    };
  };

  return (
    <div className={`pack-display ${getViewModeClass()} ${className}`}>
      <div className="pack-header">
        <div className="pack-info">
          <h2>Pack {pack.id}</h2>
          <span className="card-count">{displayCards.length} cards</span>
        </div>
        
        <div className="pack-controls">
          <button
            onClick={() => setQuickPickMode(!quickPickMode)}
            className={`btn btn-sm ${quickPickMode ? 'btn-primary' : 'btn-secondary'}`}
            title={quickPickMode ? 'Quick pick: ON' : 'Quick pick: OFF'}
          >
            Quick Pick
          </button>
          
          {selectedCard && (
            <button
              onClick={() => onCardPick(selectedCard.id)}
              disabled={!canPick}
              className="btn btn-primary"
            >
              Pick {selectedCard.name}
            </button>
          )}
        </div>
      </div>
      
      <div 
        className="pack-cards"
        style={getGridStyle()}
      >
        {displayCards.map((card, index) => (
          <CardComponent
            key={card.id}
            card={card}
            isSelected={selectedCard?.id === card.id}
            isHovered={hoveredCard?.id === card.id}
            canInteract={canPick}
            quickPickNumber={index < 9 ? index + 1 : undefined}
            onClick={() => handleCardClick(card)}
            onMouseEnter={() => handleCardHover(card)}
            onMouseLeave={() => handleCardHover(null)}
            className="pack-card"
          />
        ))}
      </div>
      
      {displayCards.length === 0 && (
        <div className="pack-empty">
          <p>No cards match the current filters.</p>
        </div>
      )}
      
      {canPick && (
        <div className="pack-hints">
          <p>
            Click a card to select, double-click to pick. 
            Use number keys 1-{Math.min(9, displayCards.length)} for quick selection.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Sort and filter cards based on current settings
 */
function sortAndFilterCards(
  cards: Card[], 
  sortBy: string, 
  filterBy: any
): Card[] {
  // Apply filters first
  let filtered = cards.filter(card => {
    // Color filter
    if (filterBy.colors.length > 0) {
      const cardColors = card.colors || [];
      const hasMatchingColor = filterBy.colors.some((color: string) => 
        cardColors.includes(color)
      );
      if (!hasMatchingColor) return false;
    }
    
    // Rarity filter
    if (filterBy.rarities.length > 0) {
      if (!filterBy.rarities.includes(card.rarity)) return false;
    }
    
    // CMC filter (rough implementation - would need proper CMC parsing)
    const cmc = parseCMC(card.manaCost || '');
    if (cmc < filterBy.cmcRange[0] || cmc > filterBy.cmcRange[1]) {
      return false;
    }
    
    return true;
  });
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      
      case 'cmc':
        const cmcA = parseCMC(a.manaCost || '');
        const cmcB = parseCMC(b.manaCost || '');
        return cmcA - cmcB;
      
      case 'color':
        const colorA = (a.colors || [])[0] || 'Colorless';
        const colorB = (b.colors || [])[0] || 'Colorless';
        return colorA.localeCompare(colorB);
      
      case 'rarity':
        const rarityOrder = { common: 0, uncommon: 1, rare: 2, mythic: 3 };
        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
      
      case 'type':
        const typeA = a.type || '';
        const typeB = b.type || '';
        return typeA.localeCompare(typeB);
      
      default:
        return 0;
    }
  });
  
  return filtered;
}

/**
 * Parse CMC from mana cost string (simple implementation)
 */
function parseCMC(manaCost: string): number {
  if (!manaCost) return 0;
  
  // Simple regex to extract numbers from mana cost
  const matches = manaCost.match(/\{(\d+)\}/g);
  if (matches) {
    return matches.reduce((total, match) => {
      const num = parseInt(match.replace(/[{}]/g, ''));
      return total + (isNaN(num) ? 1 : num); // Count non-numeric symbols as 1
    }, 0);
  }
  
  // Count individual mana symbols if no generic cost
  const symbols = manaCost.match(/\{[^}]+\}/g);
  return symbols ? symbols.length : 0;
}