# issues:

<issue>
  cascading cards in decklist:
  the middle of the card is displayed, not the top. it snhould be object-top or something., the top X% of the card should be shown, which is the pip. use the right math to determine the height at hwich to cutoff to get the pip info.
</issue>

pick mode should also be previewed on the card preview.
use a recent iconic card to preview (use Vivi's card)

for the start draft buttons on the main page, the button should have 3 cards fanned out of the most iconic cards: vivi, tifa, sephiroth

for dragonstorm, choose whatever.

<issue>
  clicking the start draft from home doesn't take me straight into the draft. it takes me to start new draft page, requiring me to pick the set again. picking from home ssould put me into p1p1
</issue>


# Development Plan: Draft UI Improvements & MTG Goldfishing Mat

## Overview
Fix critical draft bugs, enhance the draft interface with better loading states and improved card display, add sideboard functionality, then build a goldfishing testmat for rapid deck testing without rules enforcement.

## Critical Bugs to Fix First

### Dual-Faced Card Issue
- [x] Fix pack generation to only include front faces of dual-faced cards
- [x] See detailed plan: [Phase 0 - DFC Fix](./phase-0-dfc-fix.md)

## Current Issues to Fix

### UI/UX Improvements
- [x] Add loading skeletons while fetching draft data (fix "invalid draft url" flash)
- [ ] Redesign decklist to show cascaded cards with name/mana pips visible
- [x] Reduce spacing between cards in pack display layout. the cards should be consistently in the same spot no matter the number of cards in the pack. there shouldn't be a morphing of layout as cards decrease. minimal spacing between cards.
- [x] Add hover effects showing full card image (like 17lands/MTGA)
- [x] remove extra color and hilight effects. 
- [x] do not allow selecting other cards in history view. only hover card info. no hover effects on card choice. it should look frozen
- [x] disable number display
- [x] historyview: cover selected card with overlay with 'selected' and checkmark in the center. it should be very obvious that's the selected card. player can still hover card for info.
- [x] expand decklist when first card is added

### Sideboard Functionality
- [ ] Add sideboard support to draft engine
- [ ] Create sideboard UI at bottom of decklist
- [ ] Enable click to move cards between deck and sideboard
- [ ] Persist sideboard state with draft

## New Feature: MTG Goldfishing Mat

### Core Concept
A rules-free testing environment for rapid deck iteration. No mechanics enforcement - just visual board state manipulation for learning and testing.

### Key Features
- Quick switch between draft/deckbuilding and testmat
- Load deck against random 17lands average deck
- Hide/show opponent's hand
- Board manipulation tools (counters, markers, tapping)
- Instant restart with same or new opponent deck

## Implementation Phases

### Phase 0: Critical Bug Fixes (PRIORITY) ✅
- [x] Fix dual-faced card pack generation
- [x] Detailed plan: [phase-0-dfc-fix.md](./phase-0-dfc-fix.md)

### Phase 1: Draft UI Polish & Loading States ✅
- [x] Fix loading states and remove UI flashes
- [x] Implement responsive design for mobile/tablet
  - 2x2 card grid on mobile (grid-cols-2)
  - Progressive grid columns: 2 → 3 → 4 → 5 → 6 → 7 based on screen size
  - Full-screen sidebar on mobile with toggle button
  - Desktop sidebar shifts content (mr-80) when open
- [x] Remove double-click to pick - single click selects, confirm button picks
- [x] Quick pick mode remains as instant-pick option
- [x] Fix layout shifts with fixed dimensions for UI elements
- [x] Add mobile toggle between pack view and decklist view
- [x] Clean up visual design and remove clutter
- [x] Fix history view interaction and selection display
- [x] Detailed plan: [phase-1-ui-polish.md](./phase-1-ui-polish.md)

### Phase 2: Enhanced Card Display
- [ ] Redesign decklist card display (cascade view)
- [ ] Tighten pack display spacing
- [x] Implement hover card preview

### Phase 3: Sideboard Implementation
- [ ] Engine support for sideboard
- [ ] UI Components for deck/sideboard management
- [ ] Validation and persistence

### Phase 4: Testmat Foundation
- [ ] Create new route `/testmat/[draftId]`
- [ ] Design board layout with zones
- [ ] Card rendering and basic controls

### Phase 5: Testmat Game Flow
- [ ] Deck loading from draft
- [ ] Hand management and mulligan
- [ ] Quick restart system

### Phase 6: Quick Switch Integration
- [ ] Add "Play" button to decklist
- [ ] Navigation between modes
- [ ] State persistence

### Phase 7: Board Manipulation Tools
- [ ] Counter system
- [ ] Token support
- [ ] Life tracking

### Phase 8: Testing & Polish
- [ ] Comprehensive testing
- [ ] Mobile optimization
- [ ] Keyboard shortcuts

## Technical Architecture

### Data Flow
```
Set Data → Pack Generation (front faces only) → Draft Engine → Deck + Sideboard → Testmat → Game State
    ↓                                              ↓                                         ↓
 Filtering                                     Storage                                   Storage
```

### Component Structure
```
DraftInterface
├── PackDisplay (with tighter spacing)
├── DraftSidebar
│   ├── Decklist (cascaded view)
│   └── Sideboard (new)
└── HoverCardPreview (new, handles dual-faced)

TestmatInterface (new)
├── Board
│   ├── PlayerZones
│   ├── OpponentZones
│   └── SharedZones
├── Controls
└── QuickSwitch
```

## Success Criteria
- [ ] Dual-faced cards draft correctly (only front faces in packs)
- [ ] Loading states prevent "invalid url" flashes
- [ ] Decklist shows cards clearly in compact cascade
- [ ] Sideboard functionality works seamlessly
- [ ] Hover previews enhance card selection
- [ ] Testmat loads quickly from draft
- [ ] Board manipulation feels responsive
- [ ] Quick switch maintains context
- [ ] Mobile experience is smooth

## Notes
- Phase 0 is CRITICAL - dual-faced card bug breaks draft integrity
- Each phase will get detailed planning document when we start it
- Testmat is explicitly not a rules engine - it's a digital playmat
- Focus on speed and ease of use over feature completeness
