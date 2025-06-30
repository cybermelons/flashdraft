# Working Plan: Engine Progression vs UI Navigation Architecture Fix

## Progress: 3/8 tasks complete

**Critical Issue**: Infinite loops caused by conflating engine progression state with UI navigation state. Need to separate these concerns architecturally.

## Root Problem Analysis

We've been mixing two distinct concepts:
1. **Engine Progression State**: Where the draft has actually advanced to
2. **UI Navigation State**: What point in draft history the user is viewing

This creates circular dependencies:
```
Pick Card → Engine → UI Navigation → URL → Router → Engine → LOOP
```

## Corrected Architecture

### Two-Layer Architecture with Position Separation

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│          UI Layer               │    │        Draft Engine             │
│                                 │    │                                 │
│ • UI Navigation State           │    │ • Engine Progression State      │
│   - viewingRound: number        │    │   - currentRound: number        │
│   - viewingPick: number         │    │   - currentPick: number         │
│   - isViewingCurrent: boolean   │    │   - Auto-advances after picks   │
│                                 │    │                                 │
│ • Display Logic                 │    │ • Pure Draft Logic              │
│   - Shows state at viewed pos   │    │   - Processes picks             │
│   - URL reflects viewing pos    │    │   - No navigation knowledge     │
│   - Independent navigation      │    │   - Event sourcing              │
└─────────────────────────────────┘    └─────────────────────────────────┘
```

### Key Principles

1. **Engine Owns Progression**: Auto-advances `currentRound/currentPick` after processing picks
2. **UI Owns Navigation**: Tracks `viewingRound/viewingPick` independently  
3. **URL Reflects Viewing**: Not engine state
4. **No Circular Dependencies**: URL changes only affect UI viewing, never engine
5. **Viewing Follows Progression**: After user picks, viewing snaps to current engine state
6. **Historical Immutability**: Past positions are read-only, no picks allowed when viewing history
7. **Current Position Guard**: User can only pick cards when `isViewingCurrent === true`

### Position Separation Concepts

**Engine Progression State:**
- **Definition**: Where the draft simulation has actually advanced to
- **Ownership**: Engine layer exclusively
- **Behavior**: Auto-advances after processing all picks in a position
- **Examples**: "Draft has progressed to Round 2, Pick 7"
- **Mutation**: Only through engine actions (picks, round transitions)

**UI Navigation State:**
- **Definition**: What point in draft history the user is currently viewing
- **Ownership**: UI layer exclusively  
- **Behavior**: Can navigate independently of engine progression
- **Examples**: "User is viewing Round 1, Pick 3 (historical review)"
- **Mutation**: Through URL changes, navigation buttons, or following engine

**Relationship:**
- Usually `viewingPosition === enginePosition` (following current draft)
- Can diverge when user reviews history (`viewingPosition < enginePosition`)
- User can only interact (pick cards) when positions match
- After picks, viewing automatically follows engine to new current position

### Data Flow (Corrected)

```
User Pick → Engine Processes → Engine Auto-Advances → UI Viewing Follows
```

```
User Navigation → UI Viewing Changes → Display Historical State (No Engine Impact)
```

## Implementation Plan

### Phase 1: Document Architecture Corrections ✅ COMPLETE
- [x] **Update working plan** - Document corrected architecture principles ✅
- [x] **Fix documentation inconsistencies** - Update all architectural docs ✅
- [x] **Add position separation concepts** - Document engine vs UI navigation ✅

### Phase 2: Engine Layer Fixes
- [ ] **Engine auto-advancement** - Add automatic position progression after picks
- [ ] **Remove UI navigation from engine** - Engine should not know about viewing
- [ ] **Clean up engine position logic** - Only track actual progression

### Phase 3: UI Layer Separation  
- [ ] **Add UI navigation state** - Separate viewing position from engine state
- [ ] **Fix router to be reactive only** - No engine operations from URL changes
- [ ] **Update components for separated concerns** - UI reflects viewed position

### Phase 4: Integration & Testing
- [ ] **Remove circular dependencies** - Ensure unidirectional data flow
- [ ] **Test position navigation** - Verify independent viewing works
- [ ] **Verify no infinite loops** - Confirm architectural fix resolves issue

## Technical Architecture Details

### Engine Layer (Corrected)

```typescript
interface DraftState {
  // Engine progression - where draft has actually advanced
  currentRound: number;  
  currentPick: number;
  status: 'active' | 'completed';
  
  // Engine auto-advances these after processing ALL picks in a round
  // UI has no control over engine progression
  // No knowledge of "viewing" or "navigation"
}

class DraftEngine {
  // After processing picks, automatically determine next state
  processPickRound(actions: DraftAction[]): DraftState {
    // Apply all picks
    // Check if round complete
    // Auto-advance to next round/pick
    // Return new engine state
  }
}
```

### UI Layer (Corrected)

```typescript
interface UINavigationState {
  // UI navigation - what user is currently viewing (can differ from engine)
  viewingRound: number;    
  viewingPick: number;     
  
  // Derived state
  isViewingCurrent: boolean; // viewingPos === enginePos
  canMakePick: boolean;      // ONLY true when isViewingCurrent && engine.canPick
  isViewingHistory: boolean; // !isViewingCurrent (read-only historical state)
}

// URL format: /draft/{id}/viewing/p{round}p{pick}
// Router only updates UI navigation, never touches engine
// Past positions are immutable - no picks allowed when viewing history
```

### Interaction Patterns

```typescript
// User picks card (ONLY allowed when viewing current engine position)
async function handleCardPick(cardId: string) {
  // Guard: Can only pick when viewing current position
  if (!isViewingCurrent) {
    throw new Error('Cannot pick cards when viewing historical positions');
  }
  
  // Engine processes pick and auto-advances to NEXT position
  const newEngineState = await draftEngine.pickCard(cardId);
  
  // UI viewing automatically follows engine to the NEW current position
  // (which is the next pick after the one we just made)
  setViewingPosition(newEngineState.currentRound, newEngineState.currentPick);
  
  // URL updates to reflect new current position
  updateURL(`/draft/${id}/viewing/p${newEngineState.currentRound}p${newEngineState.currentPick}`);
  
  // User is now viewing the next pick - still at current position
}

// User navigates to review past picks (read-only, no engine impact)
function navigateToPosition(round: number, pick: number) {
  // Only updates UI viewing state
  setViewingPosition(round, pick);
  
  // Updates URL
  updateURL(`/draft/${id}/viewing/p${round}p${pick}`);
  
  // Display shows IMMUTABLE historical state at viewed position
  // Engine progression unchanged
  // NO pick actions allowed when viewing history
}

// User returns to current position after reviewing history
function jumpToCurrentPosition() {
  const engineState = draftEngine.getCurrentState();
  setViewingPosition(engineState.currentRound, engineState.currentPick);
  updateURL(`/draft/${id}/viewing/p${engineState.currentRound}p${engineState.currentPick}`);
  // Now canMakePick becomes true again (back to current position)
}
```

## Current State Analysis

### Files Needing Changes

**Engine Layer**:
- `src/lib/engine/DraftEngine.ts` - Add auto-advancement logic
- `src/lib/engine/actions.ts` - Review action types for progression

**UI Layer**: 
- `src/stores/draftStore.ts` - Add UI navigation state separation
- `src/components/SimpleDraftRouter.tsx` - Make purely reactive
- `src/components/DraftInterface.tsx` - Remove position calculation logic

**Documentation**:
- This working plan - Update architecture sections
- Component documentation - Fix position terminology

### Success Criteria

**Engine Layer**:
- [ ] Engine auto-advances position after processing picks
- [ ] Engine has no knowledge of "viewing" or "navigation" 
- [ ] All engine operations are purely about draft progression
- [ ] Engine tests pass with auto-advancement

**UI Layer**:
- [ ] UI navigation state separate from engine state
- [ ] URL changes only affect UI viewing, never engine operations
- [ ] User can navigate independently to review past picks
- [ ] Viewing position follows engine progression after picks

**Integration**:
- [ ] No infinite loops in React components
- [ ] No circular dependencies between layers
- [ ] Unidirectional data flow maintained
- [ ] Position navigation works smoothly

## Implementation Notes

### Breaking Changes
- URL format changes from `/draft/{id}/p{round}p{pick}` to `/draft/{id}/viewing/p{round}p{pick}`
- Router behavior changes from driving engine to purely reactive
- Engine API changes to auto-advance (no manual position setting)

### Migration Strategy
1. Update engine layer first (internal changes)
2. Add UI navigation state (parallel to existing)
3. Update router and components (gradual transition)
4. Remove old position logic (cleanup)

This ensures the application remains functional during migration while fixing the architectural violations systematically.