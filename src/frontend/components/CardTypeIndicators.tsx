/** @jsxImportSource react */
/**
 * FlashDraft - Card Type Indicators Component
 * 
 * Displays small colored dots to indicate card types (creature, land, spell).
 */

import * as React from 'react';
import type { DraftCard } from '../../shared/types/card';

interface CardTypeIndicatorsProps {
  card: DraftCard;
}

const isCreature = (card: DraftCard): boolean => {
  return card.type_line.includes('Creature');
};

const isLand = (card: DraftCard): boolean => {
  return card.type_line.includes('Land');
};

const isSpell = (card: DraftCard): boolean => {
  return card.type_line.includes('Instant') || card.type_line.includes('Sorcery');
};

export const CardTypeIndicators: React.FC<CardTypeIndicatorsProps> = ({ card }) => {
  return (
    <div className="absolute top-1 left-1 flex space-x-1">
      {isCreature(card) && (
        <div className="w-2 h-2 bg-green-500 rounded-full" title="Creature" />
      )}
      {isLand(card) && (
        <div className="w-2 h-2 bg-amber-600 rounded-full" title="Land" />
      )}
      {isSpell(card) && (
        <div className="w-2 h-2 bg-purple-500 rounded-full" title="Spell" />
      )}
    </div>
  );
};

export default CardTypeIndicators;