- persist quickpick preference across all drafts
# Phase 1: Draft UI Polish & Loading States

## Overview
Enhance the draft interface with proper loading states, remove jarring UI flashes, clean up visual design, and improve the overall user experience during drafting.

## Goals
- Eliminate "invalid draft url" flash with loading skeletons
- Clean up card selection UI (remove extra colors/highlights)
- Fix history view to be read-only with clear selected card indication
- Improve pack layout consistency and spacing
- Auto-expand decklist when first card is added

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

- assure these  are the same size as t he actual interface
```tsx
// DraftSkeleton.tsx
export function DraftSkeleton() {
  return (
    <div className="draft-interface">
      {/* Header skeleton */}
      <div className="h-16 bg-gray-800 animate-pulse" />
      
      {/* Pack area skeleton */}
      <div className="pack-display grid grid-cols-5 gap-2 p-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="card-skeleton">
            <div className="aspect-[488/680] bg-gray-700 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
      
      {/* Sidebar skeleton */}
      <div className="sidebar">
        <div className="h-8 bg-gray-800 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### Loading State Management
- is it better to use nanostores or usestate here? usestate i think is fine because we're just waiting for draftid to come back
```tsx
// In DraftInterface.tsx
const [isLoading, setIsLoading] = useState(true);
const [loadError, setLoadError] = useState<string | null>(null);

useEffect(() => {
  async function loadDraft() {
    try {
      setIsLoading(true);
      const data = await fetchDraftData(draftId);
      // Initialize stores with data
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
should these turn into tailwind-css?

```css
/* Remove in DraftInterface.css */
.card:hover {
  /* Remove: box-shadow, transform scale, color overlays */
  /* Keep: simple opacity change or border highlight */
}

.card.selected {
  /* Remove: glowing effects, multiple shadows */
  /* Keep: simple border or checkmark overlay */
}
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

#### Consistent Grid Layout
is it better to use tailwind or just use these
and use both for card dsplay and skeleton? what is best practice
```css
.pack-display {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 0.5rem; /* Minimal spacing */
  padding: 1rem;
  height: 100%; /* Fixed height */
}

.card-slot {
  /* Fixed position for each slot */
  aspect-ratio: 488/680;
  position: relative;
}

/* Cards always occupy same positions */
.card-slot:empty {
  visibility: hidden; /* Maintain layout */
}
```

#### JavaScript Grid Management
i didn't mean fixed positions for the card. like hollowing out cards.
it shoujld still be an array of cards, no spaces between them just like drafts.
we're not taking cards out of slots, or it shouldn't show that.
maybe that can be its own view. but i just want the cards in a row, but i don't
want the spacing to change depending on number of cards left.

```tsx
// Ensure cards stay in fixed positions
const packGrid = Array(15).fill(null);
pack.cards.forEach((card, index) => {
  packGrid[index] = card;
});

return (
  <div className="pack-display">
    {packGrid.map((card, index) => (
      <div key={index} className="card-slot">
        {card && <Card data={card} />}
      </div>
    ))}
  </div>
);
```

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

## Testing Checklist

do not run a dev server. i will check manually.

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

## Notes
- Keep all changes performant - no heavy animations
- Maintain accessibility (keyboard navigation, screen readers)
- Test on both desktop and tablet sizes
- Consider reduced motion preferences
