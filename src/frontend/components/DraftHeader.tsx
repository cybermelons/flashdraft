/** @jsxImportSource react */
/**
 * Draft Header Component
 * 
 * Header bar showing draft progress, controls, and current state.
 * Purely presentational component.
 */

import * as React from 'react';
import type { DraftStatus, Player, Card } from '../../engine/types/core';

export interface DraftHeaderProps {
  currentRound: number;
  currentPick: number;
  draftStatus: DraftStatus;
  players: Player[];
  playerCards: Card[];
  showPickedCards: boolean;
  onTogglePickedCards: () => void;
  onShowDeckList: () => void;
  onShare: () => void;
}

export const DraftHeader: React.FC<DraftHeaderProps> = ({
  currentRound,
  currentPick,
  draftStatus,
  players,
  playerCards,
  showPickedCards,
  onTogglePickedCards,
  onShowDeckList,
  onShare
}) => {
  // Calculate draft progress
  const totalPicks = 3 * 15; // 3 packs, 15 cards each
  const currentPickNumber = (currentRound - 1) * 15 + currentPick;
  const progressPercent = Math.min((currentPickNumber / totalPicks) * 100, 100);

  // Find human player
  const humanPlayer = players.find(p => p.isHuman);
  const currentPlayer = players.find(p => p.position === currentPick % players.length);

  return (
    <div className="bg-gray-800 text-white p-4 flex-shrink-0">
      <div className="flex justify-between items-center">
        {/* Left: Draft Info */}
        <div>
          <h1 className="text-xl font-bold">
            FlashDraft - Round {currentRound}
          </h1>
          <p className="text-gray-300">
            Pack {currentRound}, Pick {currentPick}
            {currentPlayer && ` • ${currentPlayer.name}'s turn`}
            {draftStatus === 'waiting' && ' • Waiting...'}
          </p>
        </div>

        {/* Right: Progress and Controls */}
        <div className="flex items-center space-x-6">
          {/* Progress Bar */}
          <div className="w-48">
            <div className="flex justify-between text-xs text-gray-300 mb-1">
              <span>Progress</span>
              <span>{currentPickNumber}/{totalPicks}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex space-x-2">
            <button
              onClick={onTogglePickedCards}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                showPickedCards ? 'bg-blue-600' : 'bg-gray-600'
              } hover:bg-opacity-80`}
            >
              Picks ({playerCards.length})
            </button>
            
            <button
              onClick={onShowDeckList}
              className="px-3 py-1 rounded text-sm bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              title="View deck list"
            >
              📋 Deck
            </button>
            
            <button
              onClick={onShare}
              className="px-3 py-1 rounded text-sm bg-green-600 hover:bg-green-700 text-white transition-colors"
              title="Share draft URL"
            >
              🔗 Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftHeader;