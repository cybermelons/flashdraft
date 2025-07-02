# Phase 1: Draft UI Polish & Loading States ✅ COMPLETE


<issue>
  ✅ FIXED: draft header isn't responsive to mobile. it goes off the screen horizontally.
</issue>

<issue>
  cascade  the card images in decklist. enable sort by... buttons. allow custom reordering. 
  </issue>
<issue>
  ✅ FIXED: actually don't use double click method. use the static "confirm pick" button.
  users canenable quickpick
</issue>

<issue>
  /draft/ route
  overview of finished draft should show decklist, otherwise redirect to 
  current pick.
</issue>


<issue>
  card image should take up the side the cursor is not on. and card image should take up most of the vertical space. right now there's padding at top and bottom.
  
</issue>

<card-hover-issues>
  <issue>
    make card hover stay still while mousing over the same card.
  </issue>
  <issue>
    card hover should take whole vertical screen space, 
  </issue>

  <card>
    not flash from white -> card image. lighten from black
  </card>
</card-hover-issues>


<issue>
  make ui elements consistent sizes, like "pick <cardname>" button.
    there's still a lot of resizing issues. 
</issue>

<issue>
  the overview is viewing p1p1 still, so no cards displayed.
</issue>

<issue>
  standardize the layout and component sizing per major layout size breakpoint.
</issue>
`
<issue>
width: packViewMode === 'compact' ? '180px' : '220px'
`
// this should be same as card image width. there's extra padding on the right here.
</issue>

## Overview
Enhance the draft interface with proper loading states, remove jarring UI flashes, clean up visual design, and improve the overall user experience during drafting.

## Goals
- Eliminate "invalid draft url" flash with loading skeletons
- Clean up card selection UI (remove extra colors/highlights)
- Fix history view to be read-only with clear selected card indication
- Improve pack layout consistency and spacing
- Auto-expand decklist when first card is added
- Persist quickpick preference across all drafts

## Current Issues to Address

### Loading State Problems
- When navigating to a draft URL, users briefly see "invalid draft url" before data loads
- No feedback during data fetching operations
- Jarring transitions between loading and loaded states

### Visual Clutter
- Too many color effects and highlights on cards
- Number displays that don't add value
- History view allows interaction when it should be read-only
- Selected cards in history view aren't clearly marked

### Layout Inconsistencies
- Pack display morphs as cards are picked (spacing changes)
- Cards don't stay in consistent positions
- Too much spacing between cards in pack view

## Implementation Plan

### 1. Loading Skeletons Implementation

#### Components to Update
- `DraftInterface.tsx` - Main draft page component
- Create new `DraftSkeleton.tsx` component
- Update route loading in `[draftId].astro`

#### Loading Skeleton Design

**Important**: Skeleton dimensions must match actual interface exactly to prevent layout shift.

```tsx
// DraftSkeleton.tsx
export function DraftSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header skeleton - match exact DraftHeader height */}
      <div className="h-[72px] bg-gray-800 border-b border-gray-700 animate-pulse" />
      
      <div className="flex">
        {/* Main content area */}
        <div className="flex-1 p-8">
          {/* Pack area skeleton - match PackDisplay layout */}
          <div className="grid grid-cols-5 gap-2 max-w-[1200px] mx-auto">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="card-skeleton">
                <div className="aspect-[488/680] bg-gray-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Sidebar skeleton - match DraftSidebar width */}
        <div className="w-80 bg-gray-800 p-4 border-l border-gray-700">
          <div className="h-8 bg-gray-700 rounded animate-pulse mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-600 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Loading State Management

**Decision**: Use `useState` for loading states since this is component-local UI state, not shared application state. Nanostores are better for state that needs to be accessed across multiple components.

```tsx
// In DraftInterface.tsx
const [isLoading, setIsLoading] = useState(true);
const [loadError, setLoadError] = useState<string | null>(null);

useEffect(() => {
  async function loadDraft() {
    try {
      setIsLoading(true);
      const data = await fetchDraftData(draftId);
      // Initialize nanostores with draft data
      initializeDraftStores(data);
      setIsLoading(false);
    } catch (error) {
      setLoadError('Failed to load draft');
      setIsLoading(false);
    }
  }
  loadDraft();
}, [draftId]);

if (isLoading) return <DraftSkeleton />;
if (loadError) return <DraftError message={loadError} />;
```

### 2. Clean Up Visual Design

#### Remove Extra Effects

**Decision**: Convert to Tailwind CSS for consistency with the rest of the codebase. Use utility classes for maintainability.

```tsx
// Card component styling with Tailwind
<div 
  className={cn(
    "relative cursor-pointer transition-opacity duration-200",
    "hover:opacity-90", // Simple hover effect only
    isSelected && "ring-2 ring-blue-500" // Clean selection indicator
  )}
>
  {/* Remove any rainbow gradients, glowing effects, transform scales */}
</div>
```

#### Disable Number Display
- Remove pack position numbers from cards
- Remove unnecessary count displays
- Keep only essential information (mana curve, deck count)

### 3. Fix History View

#### Make History View Read-Only
```tsx
// In PackDisplay component
const isHistoryView = viewingRound !== currentRound || viewingPick !== currentPick;

<div 
  className={cn(
    "card",
    isHistoryView && "pointer-events-none"
  )}
  onClick={isHistoryView ? undefined : () => handlePick(card)}
>
```

#### Add Selected Card Overlay
```tsx
// SelectedCardOverlay.tsx
export function SelectedCardOverlay({ isSelected }: { isSelected: boolean }) {
  if (!isSelected) return null;
  
  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
      <div className="text-white text-lg font-bold">
        <CheckIcon className="w-12 h-12 mx-auto mb-2" />
        <span>Selected</span>
      </div>
    </div>
  );
}
```

### 4. Fix Pack Layout Consistency

**Clarification**: You want cards to remain tightly packed (no empty slots), but the spacing between cards should stay consistent regardless of how many cards remain in the pack.

#### Consistent Spacing Approach

**Decision**: Use Tailwind for consistency. Apply the same classes to both the actual pack display and skeleton for perfect matching.

```tsx
// PackDisplay.tsx - Cards always packed together with fixed spacing
export function PackDisplay({ pack }: { pack: Pack }) {
  return (
    <div className="pack-container">
      {/* Fixed width container to prevent spreading */}
      <div className="inline-grid grid-cols-5 gap-2 max-w-[1200px]">
        {pack.cards.map((card, index) => (
          <div key={card.id} className="w-[220px]">
            <Card data={card} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Alternative: Use flexbox with fixed gaps
<div className="flex flex-wrap gap-2 max-w-[1200px]">
  {pack.cards.map((card) => (
    <div key={card.id} className="w-[220px] flex-shrink-0">
      <Card data={card} />
    </div>
  ))}
</div>
```

The key is using fixed card widths and gaps rather than letting the grid/flex container stretch to fill space.

### 5. Auto-Expand Decklist

#### Decklist State Management
```tsx
// In draftStore.ts
export const $isDecklistExpanded = atom(false);

// Auto-expand on first pick
export function addCardToDeck(card: Card) {
  const deck = $currentDeck.get();
  if (deck.length === 0) {
    $isDecklistExpanded.set(true);
  }
  // ... rest of add logic
}
```

### 6. Persist Quickpick Preference

#### Local Storage Integration
```tsx
// In settingsStore.ts
import { persistentAtom } from '@nanostores/persistent'

// Persist quickpick preference across all drafts
export const $quickPickEnabled = persistentAtom<boolean>('quickPickEnabled', false, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// In DraftInterface.tsx
import { $quickPickEnabled } from '@/stores/settingsStore';

function DraftInterface() {
  const quickPickEnabled = useStore($quickPickEnabled);
  
  const handleQuickPickToggle = () => {
    $quickPickEnabled.set(!quickPickEnabled);
  };
  
  // Rest of component...
}
```

## Testing Checklist

### Loading States
- [ ] No "invalid draft url" flash on navigation
- [ ] Smooth transition from skeleton to loaded content
- [ ] Error states display properly
- [ ] Loading states for async operations (bot picks, etc.)

### Visual Design
- [ ] No excessive hover effects
- [ ] Clean, minimal card selection feedback
- [ ] Consistent color scheme without rainbow effects
- [ ] Clear visual hierarchy

### History View
- [ ] Cannot click cards in history view
- [ ] Can still hover for card details
- [ ] Selected card has clear overlay
- [ ] Smooth navigation between picks

### Pack Layout
- [ ] Cards stay in same positions as pack shrinks
- [ ] Minimal, consistent spacing
- [ ] No layout shift or morphing
- [ ] Responsive on different screen sizes

### Decklist Behavior
- [ ] Expands automatically on first card added
- [ ] Remembers expansion state during session
- [ ] Smooth expand/collapse animation

### Quickpick Preference
- [ ] Toggle state persists across page refreshes
- [ ] Preference applies to all drafts
- [ ] Setting survives browser restart

## Success Metrics
- Zero UI flashes during navigation
- Consistent 60fps during all interactions
- Clean, professional appearance
- Intuitive interaction patterns
- No confusing visual states

## Implementation Order
1. Loading skeletons (highest priority - fixes major UX issue)
2. History view fixes (selected overlay, disable clicks)
3. Pack layout consistency
4. Remove visual clutter
5. Auto-expand decklist
6. Persist quickpick preference

## Notes
- Keep all changes performant - no heavy animations
- Maintain accessibility (keyboard navigation, screen readers)
- Test on both desktop and tablet sizes
- Consider reduced motion preferences