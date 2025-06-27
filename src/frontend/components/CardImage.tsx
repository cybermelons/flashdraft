/** @jsxImportSource react */
/**
 * FlashDraft - Card Image Component
 * 
 * Handles MTG card image display with loading states and fallbacks.
 */

import * as React from 'react';

interface CardImageProps {
  card: {
    name: string;
    image_uris?: {
      small?: string;
      normal?: string;
      large?: string;
    };
    mana_cost?: string;
    type_line: string;
    rarity: string;
  };
  size: 'small' | 'normal' | 'large';
  onLoad?: () => void;
  onError?: () => void;
}

const MANA_SYMBOLS: Record<string, string> = {
  'W': '⚪', 'U': '🔵', 'B': '⚫', 'R': '🔴', 'G': '🟢', 'C': '⚪', 'X': '❌'
};

const RARITY_COLORS: Record<string, string> = {
  'common': 'text-gray-600',
  'uncommon': 'text-blue-600',
  'rare': 'text-yellow-600',
  'mythic': 'text-orange-600',
  'special': 'text-purple-600',
};

function formatManaCost(manaCost: string): string {
  if (!manaCost) return '';
  return manaCost
    .replace(/\{([WUBRGCX])\}/g, (_, symbol) => MANA_SYMBOLS[symbol] || symbol)
    .replace(/\{(\d+)\}/g, '$1');
}

const CardImage: React.FC<CardImageProps> = React.memo(function CardImage({ card, size, onLoad, onError }) {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const imageUrl = card.image_uris?.[size === 'small' ? 'small' : 'normal'];

  const handleLoad = React.useCallback(() => {
    setImageLoaded(true);
    if (onLoad) onLoad();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setImageError(true);
    if (onError) onError();
  }, [onError]);

  const imgOpacityClass = imageLoaded ? 'opacity-100' : 'opacity-0';
  const imgClassName = 'w-full h-full object-cover transition-opacity duration-300 ' + imgOpacityClass;
  
  const rarityColorClass = RARITY_COLORS[card.rarity] || 'text-gray-600';
  const rarityClassName = 'font-medium ' + rarityColorClass;

  if (imageUrl && !imageError) {
    return React.createElement('div', {
      className: 'relative w-full h-full'
    }, [
      React.createElement('img', {
        key: 'image',
        src: imageUrl,
        alt: card.name,
        className: imgClassName,
        onLoad: handleLoad,
        onError: handleError
      }),
      !imageLoaded && React.createElement('div', {
        key: 'loading',
        className: 'absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center'
      }, React.createElement('div', {
        className: 'text-gray-400 text-xs'
      }, 'Loading...'))
    ]);
  }

  const formattedManaCost = formatManaCost(card.mana_cost || '');
  
  return React.createElement('div', {
    className: 'w-full h-full bg-white border border-gray-300 p-2 flex flex-col justify-between'
  }, [
    React.createElement('div', { key: 'top' }, [
      React.createElement('div', {
        key: 'name',
        className: 'text-xs font-semibold mb-1 line-clamp-2'
      }, card.name),
      React.createElement('div', {
        key: 'mana',
        className: 'text-xs text-gray-600'
      }, formattedManaCost)
    ]),
    React.createElement('div', {
      key: 'bottom',
      className: 'text-xs'
    }, [
      React.createElement('div', {
        key: 'type',
        className: 'text-gray-600 mb-1 truncate'
      }, card.type_line),
      React.createElement('div', {
        key: 'rarity',
        className: rarityClassName
      }, card.rarity)
    ])
  ]);
});

export default CardImage;