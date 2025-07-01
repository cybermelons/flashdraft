/**
 * Hover Card Preview - Shows large card preview on hover
 * 
 * Displays a popover-style preview of the card being hovered over.
 * Preview appears near the hovered card without moving around.
 */

import { useStore } from '@nanostores/react';
import { $hoveredCard } from '@/stores/draftStore';
import { Card } from './Card';
import { useState, useEffect, useRef } from 'react';

export function HoverCardPreview() {
  const hoveredCard = useStore($hoveredCard);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [currentCardElement, setCurrentCardElement] = useState<HTMLElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!hoveredCard || !currentCardElement || !previewRef.current) return;
    
    // Get card element position
    const cardRect = currentCardElement.getBoundingClientRect();
    const previewWidth = 300;
    const previewHeight = 420; // Approximate height
    const padding = 10;
    
    // Calculate optimal position
    let x = cardRect.right + padding;
    let y = cardRect.top;
    
    // If preview would go off right edge, show it on the left
    if (x + previewWidth > window.innerWidth - padding) {
      x = cardRect.left - previewWidth - padding;
    }
    
    // If preview would go off bottom, adjust up
    if (y + previewHeight > window.innerHeight - padding) {
      y = window.innerHeight - previewHeight - padding;
    }
    
    // If preview would go off top, adjust down
    if (y < padding) {
      y = padding;
    }
    
    setPosition({ x, y });
  }, [hoveredCard, currentCardElement]);
  
  // Track which element is being hovered
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      // Find the card element that was hovered
      const target = e.target as HTMLElement;
      const cardElement = target.closest('[data-card-id]');
      if (cardElement && cardElement instanceof HTMLElement) {
        const cardId = cardElement.getAttribute('data-card-id');
        if (cardId === hoveredCard?.id) {
          setCurrentCardElement(cardElement);
        }
      }
    };
    
    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, [hoveredCard]);
  
  // Reset when no card is hovered
  useEffect(() => {
    if (!hoveredCard) {
      setCurrentCardElement(null);
    }
  }, [hoveredCard]);
  
  // Singleton component - always mounted, just changes visibility
  return (
    <div 
      ref={previewRef}
      className={`fixed z-50 pointer-events-none transition-opacity duration-150 ${
        hoveredCard ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        visibility: hoveredCard ? 'visible' : 'hidden',
        width: '300px'
      }}
    >
      <div className="bg-slate-900/95 backdrop-blur-sm shadow-2xl rounded-xl border border-slate-700 p-4">
        {hoveredCard && (
          <>
            <div className="mb-3">
              <Card 
                card={hoveredCard}
                size="large"
                canInteract={false}
                key={hoveredCard.id}
              />
            </div>
            <div className="text-center">
              <div className="text-white font-semibold">{hoveredCard.name}</div>
              <div className="text-slate-400 text-sm">{hoveredCard.type_line || hoveredCard.type}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}