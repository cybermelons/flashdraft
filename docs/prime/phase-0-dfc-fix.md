# Phase 0: Critical Dual-Faced Card Bug Fix

## Problem Statement
Dual-faced cards (DFCs) like Vanille//Ragnarok are showing both faces in draft packs. The back face (Ragnarok) appears as a separate draftable card, which breaks draft integrity. Only the front face (Vanille) should appear in packs.

## Technical Background

### How DFCs Work in MTG
- Double-faced cards have two playable sides
- Only the front face should appear in booster packs
- Examples: Vanille//Ragnarok, werewolves, modal double-faced cards

### Scryfall Data Structure
DFCs in Scryfall API have unique properties:
```json
{
  "layout": "transform",  // or "modal_dfc"
  "card_faces": [
    { "name": "Vanille", "mana_cost": "{1}{W}", ... },  // Front face
    { "name": "Ragnarok", "mana_cost": "", ... }        // Back face
  ],
  "image_uris": {
    "normal": "front_face_image.jpg"
  }
}
```

Some back faces appear as separate entries with:
- No mana cost
- Reference to the front face
- Special collector numbers (often with letters)

## Investigation Tasks

### 1. Data Analysis
- [ ] Load Final Fantasy set data and find all DFCs
- [ ] Identify how Vanille//Ragnarok is stored (one entry or two?)
- [ ] Check for distinguishing fields:
  - `layout` field values
  - `card_faces` array presence
  - `mana_cost` being empty on back faces
  - `collector_number` patterns
  - `related_cards` or `all_parts` references

### 2. Current Code Review
- [ ] Examine `PackGenerator.ts` card filtering logic
- [ ] Check if any DFC handling already exists
- [ ] Understand how cards are selected for packs
- [ ] Trace how card IDs map to full card data

## Implementation Plan

### Approach A: Filter by Layout Type
```typescript
// In PackGenerator.ts
private filterDraftableCards(cards: Card[]): Card[] {
  return cards.filter(card => {
    // Exclude back faces of transform/modal DFCs
    if (card.layout === 'transform' || card.layout === 'modal_dfc') {
      // If it has no mana cost and isn't a land, it's likely a back face
      if (!card.mana_cost && !card.type_line?.includes('Land')) {
        return false;
      }
    }
    return true;
  });
}
```

### Approach B: Use Collector Number Pattern
```typescript
// Back faces often have letters in collector numbers (e.g., "123b")
private isBackFace(card: Card): boolean {
  return /[a-zA-Z]$/.test(card.collector_number);
}
```

### Approach C: Check Card Faces Array
```typescript
// If card_faces exists, we're looking at a DFC
// Ensure we only include it once (not as separate entries)
private filterDraftableCards(cards: Card[]): Card[] {
  const seen = new Set<string>();
  
  return cards.filter(card => {
    // If this is part of a DFC, use the front face name as key
    const key = card.card_faces?.[0]?.name || card.name;
    
    if (seen.has(key)) {
      return false; // Skip duplicates
    }
    
    seen.add(key);
    
    // Skip if this looks like a back face
    if (this.isLikelyBackFace(card)) {
      return false;
    }
    
    return true;
  });
}

private isLikelyBackFace(card: Card): boolean {
  // Multiple heuristics
  return (
    (!card.mana_cost && !card.type_line?.includes('Land')) ||
    /[b-z]$/.test(card.collector_number) ||
    card.name.includes('//') && !card.card_faces
  );
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('PackGenerator - DFC Handling', () => {
  it('should exclude back faces from packs', () => {
    const cards = [
      { name: 'Vanille', mana_cost: '{1}{W}', layout: 'transform' },
      { name: 'Ragnarok', mana_cost: '', layout: 'transform' },
    ];
    
    const filtered = packGenerator.filterDraftableCards(cards);
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Vanille');
  });
  
  it('should include normal cards', () => {
    // Test single-faced cards pass through
  });
  
  it('should handle modal DFCs correctly', () => {
    // Test Strixhaven-style MDFCs
  });
});
```

### Integration Tests
- [ ] Generate packs with Final Fantasy set
- [ ] Verify no back faces appear
- [ ] Check all known DFCs:
  - Vanille//Ragnarok
  - [List other DFCs in set]
- [ ] Ensure deck building works with picked DFCs

### Manual Testing Checklist
- [ ] Create new Final Fantasy draft
- [ ] Draft through several packs
- [ ] Verify only front faces appear
- [ ] Pick a DFC and check deck list shows correctly
- [ ] Complete draft and verify all cards display properly

## Edge Cases to Consider

1. **Split cards** (if any) - Should appear normally
2. **Adventure cards** - Single face, should work fine  
3. **Meld cards** - Each part drafted separately
4. **Flip cards** (Kamigawa-style) - Single card, no issue
5. **Land DFCs** - Some have no mana cost on front too

## Success Metrics

- Zero back faces in generated packs
- All front faces of DFCs appear normally
- No regression in single-faced card handling
- Existing drafts continue to work

## Rollback Plan

If issues arise:
1. Revert PackGenerator changes
2. Document specific problem cases
3. Consider set-specific filtering as temporary fix

## Future Considerations

- Hover preview should show both faces of DFCs
- Deck list could show DFC indicator icon
- Testmat will need flip animation for DFCs
- Consider caching filtered card lists for performance

---

Ready to begin implementation? Start with investigation tasks to understand the exact data structure.
