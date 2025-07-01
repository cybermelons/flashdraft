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

  // Sort and filter cards
  const displayCards = sortAndFilterCards(pack.cards, sortBy, filterBy);

  const handleCardClick = (card: Card) => {
    // In history view, do nothing on click
    if (isViewingHistory) return;
    
    // Normal selection logic only when not in history
    if (selectedCard?.id === card.id && canPick) {
      // Double-click or second click picks the card (only if canPick)
      onCardPick(card.id);
    } else {
      // Select card for highlighting
      uiActions.selectCard(card);
    }
    
    // Quick pick mode only works when canPick
    if (quickPickMode && canPick) {
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
      {/* Pack Header - Fixed height to prevent layout shifts */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 mb-6 h-[108px]">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Current Pack</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="bg-slate-700/50 text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                  {pack.id}
                </span>
                <span className="text-slate-400 text-sm min-w-[120px] inline-block">
                  {displayCards.length} cards remaining
                </span>
              </div>
            </div>
          </div>
          
          {!isViewingHistory && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => uiStoreActions.toggleQuickPickMode()}
                className={`w-[140px] h-[44px] rounded-xl font-medium transition-colors flex items-center justify-center ${
                  quickPickMode 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                    : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white'
                }`}
                title={quickPickMode ? 'Quick pick: ON - Click to pick immediately' : 'Quick pick: OFF - Click to select, double-click to pick'}
              >
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span>Quick Pick</span>
              </button>
              
              {/* Pick button container - always reserve space */}
              <div className="w-[250px] h-[44px]">
                {selectedCard ? (
                  <button
                    onClick={() => onCardPick(selectedCard.id)}
                    disabled={!canPick}
                    className="w-full h-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-slate-600 disabled:to-slate-600 text-white px-6 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="truncate">Pick {selectedCard.name}</span>
                  </button>
                ) : (
                  <div className="w-full h-full bg-slate-700/30 rounded-xl flex items-center justify-center text-slate-500">
                    Select a card
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Pack Cards Grid - Responsive grid that shrinks cards until breakpoint */}
      <div className="flex justify-center">
        <div 
          className={`${
            packViewMode === 'list' 
              ? 'flex flex-col gap-2 max-w-[280px]' 
              : 'grid gap-2 w-full max-w-[1200px]'
          }`}
          style={packViewMode !== 'list' ? {
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gridAutoRows: 'auto'
          } : {}}
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
              {/* Confirm overlay for selected card in normal view */}
              <SelectedCardOverlay 
                isSelected={!isViewingHistory && selectedCard?.id === card.id} 
                label="Confirm"
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
                <div>• <span className="bg-blue-500/20 px-1.5 py-0.5 rounded font-mono">Double-click</span> to pick directly</div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
