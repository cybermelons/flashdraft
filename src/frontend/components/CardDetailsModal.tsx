/** @jsxImportSource react */
/**
 * Card Details Modal Component
 * 
 * Shows detailed card information in a modal overlay.
 * Purely presentational component.
 */

import * as React from 'react';
import { useCallback, useEffect } from 'react';
import type { Card } from '../../engine/types/core';

export interface CardDetailsModalProps {
  card: Card;
  onClose: () => void;
}

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({
  card,
  onClose
}) => {
  // Handle escape key
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Parse mana cost for better display
  const formatManaCost = (manaCost: string) => {
    if (!manaCost) return null;
    
    // Simple formatting for now - could be enhanced with actual mana symbols
    return manaCost.replace(/\{([^}]+)\}/g, '($1)');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-full overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {card.name}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {card.manaCost && (
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {formatManaCost(card.manaCost)}
                </span>
              )}
              <span>{card.typeLine}</span>
              {card.rarity && (
                <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${
                  card.rarity === 'common' ? 'bg-gray-100 text-gray-800' :
                  card.rarity === 'uncommon' ? 'bg-blue-100 text-blue-800' :
                  card.rarity === 'rare' ? 'bg-yellow-100 text-yellow-800' :
                  card.rarity === 'mythic' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {card.rarity}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Image */}
            <div className="flex justify-center">
              <img
                src={card.imageUrl}
                alt={card.name}
                className="max-w-full h-auto rounded-lg shadow-md"
                style={{ maxHeight: '400px' }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = '/placeholder-card.png'; // Fallback image
                }}
              />
            </div>

            {/* Card Details */}
            <div className="space-y-4">
              {/* Oracle Text */}
              {card.oracleText && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Oracle Text</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-700 whitespace-pre-line">
                      {card.oracleText}
                    </p>
                  </div>
                </div>
              )}

              {/* Power/Toughness */}
              {(card.power !== undefined || card.toughness !== undefined) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Power/Toughness</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-700 font-mono text-lg">
                      {card.power}/{card.toughness}
                    </p>
                  </div>
                </div>
              )}

              {/* Converted Mana Cost */}
              {card.cmc !== undefined && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Converted Mana Cost</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-700 font-mono text-lg">
                      {card.cmc}
                    </p>
                  </div>
                </div>
              )}

              {/* Set Information */}
              {card.setCode && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Set</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-700">
                      {card.setCode}
                      {card.collectorNumber && ` #${card.collectorNumber}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Flavor Text */}
              {card.flavorText && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Flavor Text</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 italic">
                      {card.flavorText}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Double-click any card to view details
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetailsModal;