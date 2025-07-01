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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [prevCardId, setPrevCardId] = useState<string | null>(null);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Pre-cache the card change to avoid flicker
  const isNewCard = hoveredCard && hoveredCard.id !== prevCardId;
  if (isNewCard) {
    setPrevCardId(hoveredCard.id);
  }
  
  // Position card to left of mouse if on right side of screen
  const isRightSide = mousePos.x > window.innerWidth / 2;
  const xPos = isRightSide ? mousePos.x - 300 : mousePos.x + 20;
  
  // Center vertically around mouse
  const yPos = Math.max(20, Math.min(mousePos.y - 200, window.innerHeight - 420));
  
  // Singleton component - always mounted, just changes visibility
  return (
    <div 
      className={`fixed z-50 pointer-events-none transition-opacity duration-150 ${
        hoveredCard ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        left: `${xPos}px`,
        top: `${yPos}px`,
        visibility: hoveredCard ? 'visible' : 'hidden'
      }}
    >
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-slate-700">
        {hoveredCard && (
          <>
            <Card 
              card={hoveredCard}
              size="large"
              canInteract={false}
              key={hoveredCard.id} // Force re-render to prevent image flicker
            />
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