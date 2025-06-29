/** @jsxImportSource react */
/**
 * FlashDraft - New Draft Interface Component
 * 
 * Main draft interface using the new DraftSession engine.
 * Purely presentational component that receives all state and actions as props.
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import type { UseFlashDraftReturn } from '../hooks/useFlashDraft';
import type { Card } from '../../engine/types/core';
import NewPackDisplay from './NewPackDisplay';
import DraftHeader from './DraftHeader';
import PickConfirmationBar from './PickConfirmationBar';
import PickedCardsSidebar from './PickedCardsSidebar';
import DraftCompleteScreen from './DraftCompleteScreen';
import CardDetailsModal from './CardDetailsModal';

export interface NewDraftInterfaceProps {
  flashDraft: UseFlashDraftReturn;
  className?: string;
}

export const NewDraftInterface: React.FC<NewDraftInterfaceProps> = ({ 
  flashDraft, 
  className = '' 
}) => {
  // Local UI state
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [showPickedCards, setShowPickedCards] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);

  // Handle card selection
  const handleCardSelect = useCallback((card: Card) => {
    if (!flashDraft.isDraftActive || !flashDraft.canMakePick(card.id)) {
      return;
    }

    // If clicking the already selected card, make the pick
    if (selectedCard?.id === card.id) {
      const success = flashDraft.makePick(card.id);
      if (success) {
        setSelectedCard(null);
      }
    } else {
      setSelectedCard(card);
    }
  }, [flashDraft, selectedCard]);

  // Handle pick confirmation
  const handleConfirmPick = useCallback(() => {
    if (!selectedCard) return;
    
    const success = flashDraft.makePick(selectedCard.id);
    if (success) {
      setSelectedCard(null);
    }
  }, [flashDraft, selectedCard]);

  // Handle card hover
  const handleCardHover = useCallback((card: Card | null) => {
    setHoveredCard(card);
  }, []);

  // Handle card details view
  const handleShowCardDetails = useCallback((card: Card) => {
    setHoveredCard(card);
    setShowCardDetails(true);
  }, []);

  // Draft not started
  if (!flashDraft.isDraftActive && !flashDraft.isDraftComplete) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Draft Not Active
          </h2>
          <p className="text-gray-600 mb-6">
            The draft session is not currently active.
          </p>
          <button
            onClick={() => window.location.href = '/draft/new'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Start New Draft
          </button>
        </div>
      </div>
    );
  }

  // Draft completed
  if (flashDraft.isDraftComplete) {
    return (
      <DraftCompleteScreen
        playerCards={flashDraft.playerCards}
        onStartNewDraft={() => window.location.href = '/draft/new'}
        onShowCardDetails={handleShowCardDetails}
        className={className}
      />
    );
  }

  // Main draft interface
  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Draft Header */}
      <DraftHeader
        currentRound={flashDraft.currentRound}
        currentPick={flashDraft.currentPick}
        draftStatus={flashDraft.draftStatus}
        players={flashDraft.players}
        playerCards={flashDraft.playerCards}
        showPickedCards={showPickedCards}
        onTogglePickedCards={() => setShowPickedCards(!showPickedCards)}
        onShowDeckList={() => {/* TODO: Implement deck list modal */}}
        onShare={() => {/* TODO: Implement share functionality */}}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pack Display */}
        <div className="flex-1 flex flex-col">
          {flashDraft.currentPack ? (
            <NewPackDisplay
              pack={flashDraft.currentPack}
              selectedCard={selectedCard}
              hoveredCard={hoveredCard}
              canMakePick={flashDraft.canMakePick}
              onCardSelect={handleCardSelect}
              onCardHover={handleCardHover}
              onShowCardDetails={handleShowCardDetails}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p>Waiting for pack...</p>
              </div>
            </div>
          )}

          {/* Pick Confirmation Bar */}
          {selectedCard && (
            <PickConfirmationBar
              selectedCard={selectedCard}
              onConfirm={handleConfirmPick}
              onCancel={() => setSelectedCard(null)}
              canMakePick={flashDraft.canMakePick(selectedCard.id)}
            />
          )}
        </div>

        {/* Picked Cards Sidebar */}
        {showPickedCards && (
          <PickedCardsSidebar
            playerCards={flashDraft.playerCards}
            onCardHover={handleCardHover}
            onShowCardDetails={handleShowCardDetails}
          />
        )}
      </div>

      {/* Card Details Modal */}
      {showCardDetails && hoveredCard && (
        <CardDetailsModal
          card={hoveredCard}
          onClose={() => setShowCardDetails(false)}
        />
      )}
    </div>
  );
};

export default NewDraftInterface;