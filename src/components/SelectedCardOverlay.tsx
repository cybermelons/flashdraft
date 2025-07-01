/**
 * Selected Card Overlay - Shows clear indication of selected card in history view
 * 
 * Displays a semi-transparent overlay with "Selected" text and checkmark
 * to clearly indicate which card was picked at a historical position.
 */

interface SelectedCardOverlayProps {
  isSelected: boolean;
  label?: string;
  isHovered?: boolean;
}

export function SelectedCardOverlay({ isSelected, label = "Selected", isHovered = false }: SelectedCardOverlayProps) {
  if (!isSelected) return null;
  
  const isConfirm = label === "Confirm";
  
  return (
    <div className={`absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg z-10 pointer-events-none transition-all duration-200 ${
      isConfirm && isHovered ? 'bg-black/70' : ''
    }`}>
      <div className={`text-white text-center transition-all duration-200 ${
        isConfirm && isHovered ? 'scale-110' : ''
      }`}>
        <svg className={`w-16 h-16 mx-auto mb-2 transition-all duration-200 ${
          isConfirm && isHovered ? 'text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]' : ''
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="3" 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className={`text-xl font-bold ${
          isConfirm && isHovered ? 'text-green-400' : ''
        }`}>{label}</span>
      </div>
    </div>
  );
}
