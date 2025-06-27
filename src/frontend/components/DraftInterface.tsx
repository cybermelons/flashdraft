/** @jsxImportSource react */
/**
 * FlashDraft - Main Draft Interface Component
 * 
 * The primary interface for conducting MTG drafts, combining
 * pack display, player state, and draft flow control.
 */

import * as React from 'react';
import { useEffect, useCallback, useState } from 'react';
import type { DraftCard } from '../../shared/types/card';
import { useDraftStore, selectCurrentPlayer, selectCurrentPack } from '../stores/draftStore';
import PackDisplay from './PackDisplay';
import Card from './Card';

export interface DraftInterfaceProps {
  className?: string;
}

export const DraftInterface: React.FC<DraftInterfaceProps> = ({ className = '' }) => {
  const [confirmPick, setConfirmPick] = useState(false);
  
  // Draft store state
  const {
    draft_started,
    draft_completed,
    current_round,
    current_pick,
    players,
    selected_card,
    show_pack_info,
    show_picked_cards,
    pick_timer,
    pick_deadline,
    makePickBy,
    selectCard,
    hoverCard,
    togglePackInfo,
    togglePickedCards,
    startPickTimer,
    canMakePick,
    isHumanTurn,
    getDraftProgress,
    getShareableUrl,
  } = useDraftStore();

  const currentPlayer = useDraftStore(selectCurrentPlayer);
  const currentPack = useDraftStore(selectCurrentPack);
  const humanPlayer = players.find(p => p.is_human);

  // Handle pick confirmation
  const handleConfirmPick = useCallback(() => {
    if (!canMakePick() || !selected_card || !currentPlayer) return;
    
    makePickBy(currentPlayer.id, selected_card);
    setConfirmPick(false);
  }, [canMakePick, selected_card, currentPlayer, makePickBy]);

  // Handle card selection
  const handleCardSelect = useCallback((card: DraftCard) => {
    if (!isHumanTurn()) return;
    
    // If clicking the already selected card, confirm the pick
    if (selected_card?.id === card.id) {
      handleConfirmPick();
    } else {
      selectCard(card);
      setConfirmPick(false);
    }
  }, [isHumanTurn, selectCard, selected_card, handleConfirmPick]);

  // Handle card hover
  const handleCardHover = useCallback((card: DraftCard | null) => {
    hoverCard(card);
  }, [hoverCard]);

  // Handle share functionality
  const handleShare = useCallback(async () => {
    const shareableUrl = getShareableUrl();
    
    if (navigator.share) {
      // Use native share API if available
      try {
        await navigator.share({
          title: 'FlashDraft - MTG Draft Simulator',
          text: `Check out my draft at pack ${current_round}, pick ${current_pick}!`,
          url: shareableUrl,
        });
      } catch (error) {
        // User cancelled or error occurred, fall back to clipboard
        copyToClipboard(shareableUrl);
      }
    } else {
      // Fall back to clipboard copy
      copyToClipboard(shareableUrl);
    }
  }, [getShareableUrl, current_round, current_pick]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
      console.log('Draft URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: create a temporary text area
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }, []);

  // Auto-start pick timer when it's human turn
  useEffect(() => {
    if (isHumanTurn() && currentPack && !pick_timer) {
      startPickTimer(75); // 75 seconds per pick
    }
  }, [isHumanTurn, currentPack, pick_timer, startPickTimer]);

  // Format timer display
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Draft progress
  const progress = getDraftProgress();
  const progressPercent = (progress.current / progress.total) * 100;

  if (!draft_started) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Draft Not Started
          </h2>
          <p className="text-gray-600">
            Initialize a draft session to begin
          </p>
        </div>
      </div>
    );
  }

  if (draft_completed) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            🎉 Draft Complete!
          </h2>
          <p className="text-gray-600 mb-4">
            All picks have been made. Ready for deck building!
          </p>
          {humanPlayer && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 inline-block">
              <h3 className="font-semibold mb-2">Your Picks ({humanPlayer.picked_cards.length})</h3>
              <div className="grid grid-cols-8 gap-1 max-w-2xl">
                {humanPlayer.picked_cards.map((card) => (
                  <Card
                    key={card.id}
                    card={card}
                    size="small"
                    showDetails={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Draft Header */}
      <div className="bg-gray-800 text-white p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">
              FlashDraft - Round {current_round}
            </h1>
            <p className="text-gray-300">
              Pack {current_round}, Pick {current_pick}
              {currentPlayer && ` • ${currentPlayer.name}'s turn`}
            </p>
          </div>

          <div className="flex items-center space-x-6">
            {/* Timer */}
            {pick_timer && isHumanTurn() && (
              <div className={`text-lg font-mono ${
                pick_timer <= 10 ? 'text-red-400' : 
                pick_timer <= 30 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                ⏱️ {formatTimer(pick_timer)}
              </div>
            )}

            {/* Progress Bar */}
            <div className="w-48">
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Progress</span>
                <span>{progress.current}/{progress.total}</span>
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
                onClick={togglePackInfo}
                className={`px-3 py-1 rounded text-sm ${
                  show_pack_info ? 'bg-blue-600' : 'bg-gray-600'
                } hover:bg-opacity-80`}
              >
                Pack Info
              </button>
              <button
                onClick={togglePickedCards}
                className={`px-3 py-1 rounded text-sm ${
                  show_picked_cards ? 'bg-blue-600' : 'bg-gray-600'
                } hover:bg-opacity-80`}
              >
                Picks ({humanPlayer?.picked_cards.length || 0})
              </button>
              <button
                onClick={handleShare}
                className="px-3 py-1 rounded text-sm bg-green-600 hover:bg-green-700 text-white"
                title="Share draft URL"
              >
                📋 Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pack Display */}
        <div className="flex-1 flex flex-col">
          {currentPack ? (
            <PackDisplay
              pack={currentPack}
              selectedCard={selected_card}
              onCardSelect={handleCardSelect}
              onCardHover={handleCardHover}
              showPackInfo={show_pack_info}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              {isHumanTurn() ? 'No pack available' : 'Waiting for bots to pick...'}
            </div>
          )}

          {/* Pick Confirmation Bar */}
          {isHumanTurn() && selected_card && (
            <div className="bg-blue-50 border-t border-blue-200 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Card
                    card={selected_card}
                    size="small"
                    showDetails={false}
                    className="flex-shrink-0"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selected_card.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selected_card.mana_cost} • {selected_card.type_line}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => selectCard(null)}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPick}
                    className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    disabled={!canMakePick()}
                  >
                    <span>Next</span>
                    <span className="text-xs opacity-75">(or click card again)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Picked Cards Sidebar */}
        {show_picked_cards && humanPlayer && (
          <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">
                Your Picks ({humanPlayer.picked_cards.length})
              </h2>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-4 gap-2">
                {humanPlayer.picked_cards.map((card) => (
                  <Card
                    key={card.id}
                    card={card}
                    size="small"
                    showDetails={true}
                    onHover={handleCardHover}
                  />
                ))}
              </div>

              {humanPlayer.picked_cards.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  No cards picked yet
                </div>
              )}
            </div>

            {/* Quick Stats */}
            {humanPlayer.picked_cards.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-white">
                <h3 className="font-medium text-gray-900 mb-2">Quick Stats</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    Cards: {humanPlayer.picked_cards.length}
                  </div>
                  <div>
                    Creatures: {humanPlayer.picked_cards.filter(c => 
                      c.type_line.includes('Creature')).length}
                  </div>
                  <div>
                    Spells: {humanPlayer.picked_cards.filter(c => 
                      c.type_line.includes('Instant') || c.type_line.includes('Sorcery')).length}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftInterface;