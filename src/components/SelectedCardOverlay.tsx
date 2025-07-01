/**
 * Selected Card Overlay - Shows clear indication of selected card in history view
 * 
 * Displays a semi-transparent overlay with "Selected" text and checkmark
 * to clearly indicate which card was picked at a historical position.
 */

interface SelectedCardOverlayProps {
  isSelected: boolean;
}

export function SelectedCardOverlay({ isSelected }: SelectedCardOverlayProps) {
  if (!isSelected) return null;
  
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg z-10 pointer-events-none">
      <div className="text-white text-center">
        <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="3" 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xl font-bold">Selected</span>
      </div>
    </div>
  );
}