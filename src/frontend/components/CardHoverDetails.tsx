/**
 * FlashDraft - Card Hover Details Component
 * 
 * Clean card preview popup like 17lands/Arena - shows card image and basic stats
 */

import * as React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { DraftCard } from '../../shared/types/card.js';

interface CardHoverDetailsProps {
  card: DraftCard;
  children: React.ReactNode;
}

const MANA_SYMBOLS: Record<string, string> = {
  'W': '⚪', 'U': '🔵', 'B': '⚫', 'R': '🔴', 'G': '🟢', 'C': '⚪', 'X': '❌'
};

function formatManaCost(manaCost: string): string {
  if (!manaCost) return '';
  return manaCost
    .replace(/\{([WUBRGCX])\}/g, (_, symbol) => MANA_SYMBOLS[symbol] || symbol)
    .replace(/\{(\d+)\}/g, '$1');
}

function CardHoverDetails({ card, children }: CardHoverDetailsProps) {
  const imageUrl = card.image_uris?.normal;
  const formattedManaCost = formatManaCost(card.mana_cost || '');

  // Rarity color classes
  const rarityColors = {
    'common': 'text-gray-600',
    'uncommon': 'text-blue-600', 
    'rare': 'text-yellow-600',
    'mythic': 'text-orange-600',
    'special': 'text-purple-600',
  };

  const rarityColor = rarityColors[card.rarity] || 'text-gray-600';

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side="right" 
        align="start"
        className="w-80 p-0 bg-white border border-gray-200 shadow-xl"
      >
        <div className="flex flex-col">
          {/* Card Image */}
          <div className="relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={card.name}
                className="w-full h-auto rounded-t-md"
                style={{ aspectRatio: '63/88' }}
              />
            ) : (
              <div 
                className="w-full bg-gray-100 flex items-center justify-center rounded-t-md"
                style={{ aspectRatio: '63/88' }}
              >
                <span className="text-gray-400 text-sm">No Image</span>
              </div>
            )}
          </div>

          {/* Card Stats */}
          <div className="p-3 space-y-2">
            {/* Basic Info */}
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 truncate">
                  {card.name}
                </h3>
                <p className="text-xs text-gray-600">
                  {card.type_line}
                </p>
              </div>
              {formattedManaCost && (
                <div className="ml-2 text-sm font-medium text-gray-700">
                  {formattedManaCost}
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex space-x-3">
                <span className="text-gray-600">
                  CMC: <span className="font-medium">{card.cmc}</span>
                </span>
                <span className={`capitalize font-medium ${rarityColor}`}>
                  {card.rarity}
                </span>
              </div>
              
              {/* Power/Toughness for creatures */}
              {card.power && card.toughness && (
                <div className="text-gray-700 font-medium">
                  {card.power}/{card.toughness}
                </div>
              )}
            </div>

            {/* Pick Priority (dev only) */}
            {card.pick_priority && process.env.NODE_ENV === 'development' && (
              <div className="pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Pick Priority: <span className="font-medium text-gray-700">{Math.round(card.pick_priority)}</span>
                </span>
              </div>
            )}

            {/* Set info */}
            <div className="pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {card.set.toUpperCase()} #{card.collector_number}
              </span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export { CardHoverDetails };
export default CardHoverDetails;