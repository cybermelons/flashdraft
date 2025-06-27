/** @jsxImportSource react */
/**
 * FlashDraft - Card Overlay Component
 * 
 * Handles selection indicators and hover states for MTG cards.
 */

import * as React from 'react';
import type { DraftCard } from '../../shared/types/card.js';

interface CardOverlayProps {
  card: DraftCard;
  selected: boolean;
  showDetails: boolean;
  size: 'small' | 'normal' | 'large';
}

const RARITY_COLORS: Record<string, string> = {
  'common': 'text-gray-600',
  'uncommon': 'text-blue-600',
  'rare': 'text-yellow-600',
  'mythic': 'text-orange-600',
  'special': 'text-purple-600',
};

const MANA_SYMBOLS: Record<string, string> = {
  'W': '⚪', 'U': '🔵', 'B': '⚫', 'R': '🔴', 'G': '🟢', 'C': '⚪', 'X': '❌'
};

const formatManaCost = (manaCost: string): string => {
  if (!manaCost) return '';
  return manaCost
    .replace(/\{([WUBRGCX])\}/g, (_, symbol) => MANA_SYMBOLS[symbol] || symbol)
    .replace(/\{(\d+)\}/g, '$1');
};

export const CardOverlay: React.FC<CardOverlayProps> = ({ 
  card, 
  selected, 
  showDetails, 
  size 
}) => {
  return (
    <div className="absolute inset-0">
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
              <span className={RARITY_COLORS[card.rarity] || 'text-gray-600'}>{card.rarity[0].toUpperCase()}</span>
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
  );
};

export default CardOverlay;
