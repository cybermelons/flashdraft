/** @jsxImportSource react */
/**
 * Pick Confirmation Bar Component
 * 
 * Shows selected card and provides confirmation controls.
 * Purely presentational component.
 */

import * as React from 'react';
import type { Card } from '../../engine/types/core';
import NewCard from './NewCard';

export interface PickConfirmationBarProps {
  selectedCard: Card;
  onConfirm: () => void;
  onCancel: () => void;
  canMakePick: boolean;
}

export const PickConfirmationBar: React.FC<PickConfirmationBarProps> = ({
  selectedCard,
  onConfirm,
  onCancel,
  canMakePick
}) => {
  return (
    <div className="bg-blue-50 border-t border-blue-200 p-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Selected Card Preview */}
        <div className="flex items-center space-x-4">
          <NewCard
            card={selectedCard}
            size="small"
            canInteract={false}
            className="flex-shrink-0"
          />
          
          <div>
            <h3 className="font-semibold text-gray-900">
              {selectedCard.name}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedCard.manaCost && (
                <span className="mr-2">{selectedCard.manaCost}</span>
              )}
              {selectedCard.typeLine}
            </p>
            {selectedCard.oracleText && (
              <p className="text-xs text-gray-500 mt-1 max-w-md truncate">
                {selectedCard.oracleText}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirm}
            disabled={!canMakePick}
            className={`px-6 py-2 rounded font-medium transition-colors flex items-center gap-2 ${
              canMakePick
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Confirm Pick</span>
            <span className="text-xs opacity-75">(or click card again)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PickConfirmationBar;