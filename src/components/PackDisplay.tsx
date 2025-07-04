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
  $pickedCardAtPosition,
  $isViewingHistory,
  uiActions 
} from '@/stores/draftStore';
import { 
  $packViewMode, 
  $sortBy, 
  $cardDisplaySize,
  $filterBy,
  $quickPickMode,
  $doubleClickToPick,
  uiActions as uiStoreActions
} from '@/stores/uiStore';
import type { BoosterPack, Card } from '@/lib/engine/PackGenerator';
import { Card as CardComponent } from './Card';
import { SelectedCardOverlay } from './SelectedCardOverlay';

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
  const pickedCardId = useStore($pickedCardAtPosition);
  const isViewingHistory = useStore($isViewingHistory);
  const packViewMode = useStore($packViewMode);
  const sortBy = useStore($sortBy);
  const cardDisplaySize = useStore($cardDisplaySize);
  const filterBy = useStore($filterBy);
  
  const quickPickMode = useStore($quickPickMode);
  const doubleClickToPick = useStore($doubleClickToPick);

  // Sort and filter cards
  const displayCards = sortAndFilterCards(pack.cards, sortBy, filterBy);

  const handleCardClick = (card: Card) => {
    // In history view, do nothing on click
    if (isViewingHistory) return;
    
    // Select card for highlighting
    uiActions.selectCard(card);
    
    // Quick pick mode immediately picks when canPick
    if (quickPickMode && canPick) {
      onCardPick(card.id);
    }
  };

  const handleCardDoubleClick = (card: Card) => {
    // In history view or if double-click is disabled, do nothing
    if (isViewingHistory || !doubleClickToPick) return;
    
    // Double-click to pick when enabled and canPick
    if (canPick) {
      onCardPick(card.id);
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


  return (
    <div className={`${className}`}>
      {/* Desktop Pick button - Floating at top */}
      {!isViewingHistory && selectedCard && canPick && (
        <div className="hidden sm:block fixed top-20 right-4 z-40">
          <button
            onClick={() => onCardPick(selectedCard.id)}
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6 py-3 rounded-xl font-semibold shadow-xl transition-all duration-200 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Pick {selectedCard.name}</span>
          </button>
        </div>
      )}
      
      {/* Pack Cards Grid - Responsive grid with fixed breakpoints */}
      <div className="w-full">
        <div 
          className={`gap-2 ${
            packViewMode === 'list' 
              ? 'flex flex-col max-w-[280px] mx-auto' 
              : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'
          }`}
        >
        {displayCards.map((card, index) => {
          const isPicked = pickedCardId === card.id;
          const showPickNumber = false; // Numbers disabled per requirement
          
          return (
            <div 
              key={card.id} 
              className="relative group w-full"
            >
              {showPickNumber && (
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg">
                  {index + 1}
                </div>
              )}
              {/* Selected overlay for history view */}
              <SelectedCardOverlay isSelected={isViewingHistory && isPicked} />
              {/* Confirm/Selected overlay for selected card in normal view */}
              <SelectedCardOverlay 
                isSelected={!isViewingHistory && selectedCard?.id === card.id} 
                label={doubleClickToPick ? "Confirm" : "Selected"}
                isHovered={hoveredCard?.id === card.id}
              />
              {/* Green checkmark for non-history view */}
              {!isViewingHistory && isPicked && (
                <div className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full p-1.5 z-10 shadow-lg" title="You picked this card">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
              <CardComponent
                card={card}
                isSelected={!isViewingHistory && selectedCard?.id === card.id}
                isHovered={hoveredCard?.id === card.id}
                canInteract={!isViewingHistory}
                quickPickNumber={showPickNumber ? index + 1 : undefined}
                onClick={() => handleCardClick(card)}
                onDoubleClick={() => handleCardDoubleClick(card)}
                onMouseEnter={() => handleCardHover(card)}
                onMouseLeave={() => handleCardHover(null)}
                responsive={packViewMode !== 'list'}
                className={`${
                  isViewingHistory ? 'cursor-default' : ''
                } ${
                  !canPick && !isViewingHistory ? 'opacity-75' : ''
                }`}
              />
            </div>
          );
        })}
        </div>
      </div>
      
      {/* Empty State */}
      {displayCards.length === 0 && (
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/30 text-center">
          <div className="text-slate-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-300 mb-2">No Cards Available</h3>
          <p className="text-slate-400">No cards match the current filters.</p>
        </div>
      )}
      
      {/* Keyboard Hints - Reserve space to prevent layout shift */}
      <div className={`mt-6 ${canPick && displayCards.length > 0 && !isViewingHistory ? '' : 'invisible'}`}>
        <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <div className="text-blue-400 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Keyboard Controls:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-blue-200">
                <div>• Numbers <span className="bg-blue-500/20 px-1.5 py-0.5 rounded font-mono">1-9</span> for quick pick</div>
                <div>• <span className="bg-blue-500/20 px-1.5 py-0.5 rounded font-mono">Enter</span> to pick selected card</div>
                <div>• <span className="bg-blue-500/20 px-1.5 py-0.5 rounded font-mono">Arrow keys</span> to navigate</div>
                <div>• <span className="bg-blue-500/20 px-1.5 py-0.5 rounded font-mono">Click</span> to select card</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Floating Confirm Button - At top */}
      {!isViewingHistory && selectedCard && canPick && (
        <div className="sm:hidden fixed top-24 right-2 z-40">
          <button
            onClick={() => onCardPick(selectedCard.id)}
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-4 py-2.5 rounded-full font-semibold shadow-xl transition-all duration-200 flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Confirm</span>
          </button>
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
  
  // Apply sorting - always sort by rarity first, then by the selected option
  filtered.sort((a, b) => {
    // First sort by rarity
    const rarityOrder = { mythic: 4, rare: 3, uncommon: 2, common: 1 };
    const rarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    
    // If rarities are different, return rarity comparison
    if (rarityDiff !== 0) return rarityDiff;
    
    // If rarities are the same, sort by the selected option
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
        // Already sorted by rarity, so sort by name as secondary
        return a.name.localeCompare(b.name);
      
      case 'type':
        const typeA = a.type_line || '';
        const typeB = b.type_line || '';
        return typeA.localeCompare(typeB);
      
      default:
        return a.name.localeCompare(b.name);
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
