/**
 * Hover Card Preview - Shows large card preview on hover
 * 
 * Displays a large version of the card being hovered over,
 * follows mouse position or fills screen height.
 */

import { useStore } from '@nanostores/react';
import { $hoveredCard } from '@/stores/draftStore';
import { Card } from './Card';
import { useState, useEffect } from 'react';

export function HoverCardPreview() {
  const hoveredCard = useStore($hoveredCard);
  const [position, setPosition] = useState({ x: 0, y: 20 });
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  
  useEffect(() => {
    // Only update position when hovering over a NEW card
    const handleMouseMove = (e: MouseEvent) => {
      if (hoveredCard && hoveredCard.id !== currentCardId) {
        // Position card to left of mouse if on right side of screen
        const isRightSide = e.clientX > window.innerWidth / 2;
        const xPos = isRightSide ? window.innerWidth - 300 : 20;
        
        setPosition({ x: xPos, y: 20 });
        setCurrentCardId(hoveredCard.id);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hoveredCard, currentCardId]);
  
  // Reset current card when no card is hovered
  useEffect(() => {
    if (!hoveredCard) {
      setCurrentCardId(null);
    }
  }, [hoveredCard]);
  
  // Singleton component - always mounted, just changes visibility
  return (
    <div 
      className={`fixed z-50 pointer-events-none transition-opacity duration-150 ${
        hoveredCard ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: '20px',
        visibility: hoveredCard ? 'visible' : 'hidden',
        width: '280px'
      }}
    >
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-slate-700 h-full flex flex-col">
        {hoveredCard && (
          <>
            <div className="flex-1 flex flex-col justify-center">
              <Card 
                card={hoveredCard}
                size="large"
                canInteract={false}
                key={hoveredCard.id}
              />
            </div>
            <div className="mt-3 text-center">
              <div className="text-white font-semibold">{hoveredCard.name}</div>
              <div className="text-slate-400 text-sm">{hoveredCard.type_line || hoveredCard.type}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}