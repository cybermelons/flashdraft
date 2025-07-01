/**
 * Hover Card Preview - Shows large card preview on hover
 * 
 * Displays a large version of the card being hovered over,
 * positioned to not obstruct the view.
 */

import { useStore } from '@nanostores/react';
import { $hoveredCard } from '@/stores/draftStore';
import { Card } from './Card';

export function HoverCardPreview() {
  const hoveredCard = useStore($hoveredCard);
  
  // Singleton component - always mounted, just changes visibility
  return (
    <div 
      className={`fixed top-20 right-6 z-50 pointer-events-none transition-opacity duration-200 ${
        hoveredCard ? 'opacity-100' : 'opacity-0 invisible'
      }`}
    >
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-slate-700">
        {hoveredCard && (
          <>
            <Card 
              card={hoveredCard}
              size="large"
              canInteract={false}
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