# issues

<issue>
  error opening decklist:
  <log>
    All players have picked, advancing position
draftStore.ts:372 Position after all picks: {round: 1, pick: 2}
SimpleDraftRouter.tsx:94 URL update check: {currentPath: '/draft/draft_1751334173851_1751334173851/p1p1', expectedPath: '/draft/draft_1751334173851_1751334173851/p1p2', viewingRound: 1, viewingPick: 2, shouldUpdate: true}
DraftEngine.ts:467 All players have picked, advancing position
draftStore.ts:372 Position after all picks: {round: 1, pick: 3}
SimpleDraftRouter.tsx:94 URL update check: {currentPath: '/draft/draft_1751334173851_1751334173851/p1p2', expectedPath: '/draft/draft_1751334173851_1751334173851/p1p3', viewingRound: 1, viewingPick: 3, shouldUpdate: true}
DraftSidebar.tsx:400 Uncaught ReferenceError: humanDeck is not defined
    at DraftSidebar (DraftSidebar.tsx:400:64)
  </log>
</issue>

<issue>
  i can't navigate to previous picks. directly going to p1p2 when i'm on p1p3 shows me the p1p3 picks and not the immutable state of p1p2.
</issue>


<issue>
  decklist is showing card names but nothing else.
  <log>
    Hope Estheim
    Unknown Type
    0
  </log>
</issue>

# Development Plan: Fix URL Format and UI Improvements

## Progress: 16/17 tasks complete (94%)

## Overview
Fix navigation issues and enhance the draft UI to show proper card information instead of IDs. This involves creating a proper card lookup system and standardizing navigation patterns across the application.

## Approach
1. **Create Card Lookup Infrastructure**: Build a centralized system for accessing full card data from IDs
2. **Standardize Navigation**: Remove URL complexity and ensure consistent navigation patterns
3. **Enhance UI Components**: Use the new infrastructure to show card names, stats, and sorting

## Implementation Checklist

### Phase 1: Card Data Infrastructure
- [x] Create card lookup computed store in draftStore.ts
  - Maps card IDs to full card objects using engine's set data
  - Provides efficient O(1) lookups
- [x] Add getSetData method to DraftEngine for accessing loaded sets
- [x] Create $humanDeckCards computed store that returns full card objects
- [x] Add $cardById function for single card lookups
- [ ] Test card lookup performance with large sets

### Phase 2: Navigation Standardization
- [x] Remove '/viewing/' from URL format everywhere
  - Update parseDraftURL to handle simple format
  - Update generateDraftURL to use simple format
  - Update all navigation calls
- [x] Fix navigation after creating/starting draft
  - Add navigation to p1p1 in createDraft action
  - Add navigation to p1p1 in startDraft action
- [x] Fix overview and all drafts navigation
  - Ensure navigateToOverview works properly
  - Ensure navigateToDraftList changes the actual page
- [x] Add URL update when draft position changes
- [ ] Test browser back/forward navigation

### Phase 3: Deck Display Enhancements
- [x] Update DraftSidebar to show card names
  - Use $humanDeckCards instead of $humanDeck
  - Display card.name instead of card ID
- [x] Sort cards by rarity
  - Create rarity order map (mythic=4, rare=3, uncommon=2, common=1)
  - Sort $humanDeckCards by rarity then name
- [x] Add deck statistics section
  - Count creatures (type_line includes "Creature")
  - Count artifacts (type_line includes "Artifact")
  - Count instants (type_line includes "Instant")
  - Count sorceries (type_line includes "Sorcery")
- [x] Add mana curve visualization
  - Extract CMC from each card
  - Create distribution chart (0-7+ CMC)
  - Use simple bar chart with Tailwind

### Phase 4: Pack Display Improvements
- [x] Sort pack cards by rarity when displaying
- [x] Add visual rarity indicators (color coding)
- [x] Ensure consistent card display between pack and deck

## Technical Considerations

### Card Lookup Architecture
```typescript
// Efficient lookup pattern
export const $cardLookup = computed([$currentDraft], (draft) => {
  if (!draft) return null;
  const setData = draftEngine.getSetData(draft.setCode);
  return new Map(setData.cards.map(card => [card.id, card]));
});
```

### Navigation Pattern
```typescript
// Consistent navigation after actions
async createDraft(seed: string, setCode: string) {
  const draftId = await draftActions.createDraft(seed, setCode);
  navigation.navigateToPosition(1, 1); // Always go to p1p1
}
```

### Rarity Sorting
```typescript
const rarityOrder = { mythic: 4, rare: 3, uncommon: 2, common: 1 };
cards.sort((a, b) => {
  const rarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
  return rarityDiff || a.name.localeCompare(b.name);
});
```

## Success Criteria
- [x] URLs are clean without '/viewing/' segment
- [x] Navigation works consistently across all actions
- [x] Deck shows card names, not IDs
- [x] Cards are sorted by rarity
- [x] Deck statistics show accurate counts
- [x] Mana curve visualization displays correctly
- [ ] No performance degradation with card lookups
- [ ] Browser navigation (back/forward) works properly

## Architecture Principles
- **Single Source of Truth**: Card data remains in engine's set data
- **Computed Stores**: Use nanostores computed for derived state
- **Consistent Patterns**: All navigation through useDraftNavigation hook
- **Performance**: Use Map for O(1) card lookups
- **Type Safety**: Maintain full TypeScript types throughout
