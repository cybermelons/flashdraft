# Development Plan: Clean Service Layer Architecture for Draft System

## Overview
Refactor the draft system to use a clean service layer architecture that separates UI state management from draft business logic. The current system has mixed concerns with UI stores handling both state management AND draft logic, leading to complex flows and broken navigation.

## Current Architecture Problems

### Mixed Concerns
- `seededDraftStore` does both UI state AND draft business logic
- UI components call replay engine directly  
- Navigation logic scattered across multiple files
- No single source of truth for draft state

### Broken Navigation Flow
```
Pick → seededDraftStore.pick() → applyDelta() → processBotPicks() → updateURL()
  ↓
Complex replay logic mixed with UI updates
  ↓
URL doesn't update correctly, navigation fails
```

### Code Complexity
- 7 different files involved in a single pick
- State reconstruction happens in multiple places
- Difficult to test business logic independently

## Target Architecture

### Clean Separation
```
UI Components → Nanostore (UI state only) → DraftService → Storage Layer
                                               ↑
                                         All draft logic here
```

### Simple Flow
```typescript
// UI just calls service
const newState = draftService.makeHumanPick(cardId);
draftStore.set(newState);

// Service handles everything
class DraftService {
  makeHumanPick(cardId: string): DraftState {
    // 1. Apply human pick
    // 2. Process bot picks  
    // 3. Pass packs
    // 4. Check completion
    // 5. Save to storage
    // 6. Update position
    // 7. Return complete new state
  }
}
```

## Implementation Checklist

### Phase 0: Clean Slate
- [x] **Delete existing complex code** ✅ COMPLETE
  - [x] Remove `seededDraftStore.ts` entirely ✅
  - [x] Remove `draftReplayEngine.ts` ✅
  - [x] Remove `StateMachineDraftRouter.tsx` ✅
  - [x] Remove `StateMachineDraft.tsx` ✅
  - [x] Clean slate - no migration, fresh start ✅

### Phase 1: Create Service Layer with Actions
- [x] **Define action types** ✅ COMPLETE
  - [x] `src/services/types/DraftActions.ts` ✅
  - [x] Named action types with parameters ✅
  - [x] TypeScript discriminated union for type safety ✅
- [ ] **Create action applicator**: ⚡ IN PROGRESS
  - [ ] `src/services/applyAction.ts`
  - [ ] Pure function: `(state, action) => newState`
  - [ ] Handles all action types
- [ ] **Create DraftService class**:
  - [ ] `src/services/DraftService.ts`
  - [ ] Single source of truth for draft logic
  - [ ] `makeHumanPick()` creates and applies actions
  - [ ] `navigateToPosition()` replays to target
  - [ ] Handles bot logic, pack passing, round transitions


### Phase 2: Create Simple UI Store
- [ ] **Create new simple store**
  - [ ] `src/stores/draftStore.ts` (fresh start)
  - [ ] Only holds current draft state: `atom<DraftState | null>`
  - [ ] No business logic - just UI state
- [ ] **Simple store actions**:
  ```typescript
  export const draftActions = {
    createDraft: (setData: MTGSetData) => {
      const state = draftService.createDraft(setData);
      draftStore.set(state);
      hardNavigateTo(state);  // Creates browser history
    },
    
    makeHumanPick: (cardId: string) => {
      const currentDraft = draftStore.get();
      if (!currentDraft) return;
      
      const newState = draftService.makeHumanPick(currentDraft.seed, cardId);
      draftStore.set(newState);
      hardNavigateTo(newState);  // New history entry
    },
    
    // Navigation just loads state at position
    loadPosition: (seed: string, round: number, pick: number) => {
      const state = draftService.navigateToPosition(seed, round, pick);
      draftStore.set(state);
      // No URL update - URL already reflects position
    }
  };
  ```

### Phase 3: Implement Hard Navigation
- [ ] **Hard navigation function**
  ```typescript
  function hardNavigateTo(state: DraftState) {
    const url = `/draft/${state.seed}/p${state.round}p${state.pick}`;
    window.location.href = url;  // Creates browser history entry
  }
  ```
- [ ] **Simple router**
  - [ ] Router parses URL: `/draft/{seed}/p{round}p{pick}`
  - [ ] Calls `draftActions.loadPosition(seed, round, pick)`
  - [ ] No complex logic - just load state and display
- [ ] **Navigation links as `<a>` tags**
  - [ ] Previous/Next buttons are actual links
  - [ ] `<a href="/draft/{seed}/p{round}p{pick-1}">← Previous</a>`
  - [ ] Browser handles navigation naturally

### Phase 4: Create New Simple Components
- [ ] **Create new draft components**
  - [ ] `src/components/Draft.tsx` (simple, clean)
  - [ ] `src/components/DraftRouter.tsx` (minimal routing)
  - [ ] No complex logic - just display current state
- [ ] **Component responsibilities**:
  - [ ] Read state from store
  - [ ] Render cards and UI
  - [ ] Call `draftActions.makeHumanPick(cardId)` on clicks
  - [ ] That's it - no business logic
- [ ] **Navigation components**:
  - [ ] `<a>` tags for Previous/Next
  - [ ] Browser handles back/forward automatically
  - [ ] Immutable history just works

### Phase 5: Storage Layer
- [ ] **Create storage interface**
  - [ ] `src/services/DraftStorage.ts`
  - [ ] Stores only seed + action history
  - [ ] 90%+ smaller than current storage
- [ ] **Storage operations**:
  - [ ] `save(seed, actions)` - persist action history
  - [ ] `load(seed)` - load action history
  - [ ] `list()` - draft metadata
- [ ] **Action serialization**:
  - [ ] Serialize actions as `{type: 'playerPick', payload: {cardId}}`
  - [ ] Deserialize back to action functions
  - [ ] Compact format for localStorage

### Phase 6: Testing & Validation
- [ ] **Service layer tests**
  - [ ] Test draft logic independently of UI
  - [ ] Mock storage layer for unit tests
  - [ ] Test all state transitions
- [ ] **Integration tests**
  - [ ] Test UI → Service → Storage flow
  - [ ] Verify navigation works correctly
  - [ ] Test bot picking and pack passing

## Technical Considerations

### Action-Based Architecture
```typescript
// Named actions with parameters (like Redux)
type DraftAction = 
  | { type: 'CREATE_DRAFT', setData: MTGSetData }
  | { type: 'START_DRAFT' }
  | { type: 'HUMAN_PICK', cardId: string }
  | { type: 'BOT_PICK', playerId: string, cardId: string }
  | { type: 'PASS_PACKS' }
  | { type: 'START_ROUND', round: number }
  | { type: 'COMPLETE_DRAFT' };

// State = seed + action history
interface DraftState {
  seed: string;
  actionHistory: DraftAction[];
  // Current state fields (derived from replaying actions)
  round: number;
  pick: number;
  players: Player[];
  status: 'setup' | 'active' | 'complete';
}

// Apply action to state (pure function)
function applyAction(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'HUMAN_PICK':
      // Remove card from pack, add to picks, etc.
      return { ...state, /* updated fields */ };
    case 'BOT_PICK':
      // Bot picks from their pack
      return { ...state, /* updated fields */ };
    case 'PASS_PACKS':
      // Pass packs in current direction
      return { ...state, /* updated fields */ };
    // ... other actions
  }
}

// Service applies actions and manages history
export class DraftService {
  constructor(private storage: DraftStorage) {}
  
  makeHumanPick(draftId: string, cardId: string): DraftState {
    const draft = this.storage.load(draftId);
    if (!draft) throw new Error('Draft not found');
    
    // Create actions for the complete pick sequence
    const actions: DraftAction[] = [
      { type: 'HUMAN_PICK', cardId },
      ...this.createBotPickActions(draft),  // All bots pick
      { type: 'PASS_PACKS' },
      // Check if round complete, etc.
    ];
    
    // Add to history and replay from beginning
    const newHistory = [...draft.actionHistory, ...actions];
    const newState = this.replayFromSeed(draft.seed, newHistory);
    
    this.storage.save(newState);
    return newState;
  }
  
  navigateToPosition(seed: string, round: number, pick: number): DraftState {
    const draft = this.storage.load(seed);
    if (!draft) throw new Error('Draft not found');
    
    // Calculate how many actions to apply
    const targetPosition = (round - 1) * 15 + pick;
    const actionsToApply = this.getActionsUpToPosition(draft.actionHistory, targetPosition);
    
    return this.replayFromSeed(seed, actionsToApply);
  }
    
    // Process bots
    const withBotPicks = this.processBotPicks(withHumanPick);
    
    // Pass packs  
    const withPackPassing = this.passPacks(withBotPicks);
    
    // Advance position
    const finalState = this.advancePosition(withPackPassing);
    
    // Save and return
    this.storage.save(finalState);
    return finalState;
  }
}
```

### Storage Interface
```typescript
interface DraftStorage {
  save(draft: DraftState): void;  // Saves seed + action history
  load(id: string): DraftState | null;
  list(): DraftMetadata[];
  delete(id: string): boolean;
}

// Storage format (minimal):
interface StoredDraft {
  seed: string;
  actions: SerializedAction[];  // Much smaller than full state
  metadata: { created: number; set: string; };
}
```

### URL Management & Browser History
```typescript
// Hard navigation - each pick creates new browser history entry
function navigateToPosition(state: DraftState) {
  const url = `/draft/${state.seed}/p${state.round}p${state.pick}`;
  
  // Use window.location.href for hard navigation
  // This creates browser history entries for back/forward
  window.location.href = url;
}

// Example flow:
// User at p1p1 → makes pick → hard navigate to p1p2
// Browser back button → returns to p1p1 (immutable state)
// Browser forward → returns to p1p2
```

**Browser History Behavior:**
- Each pick creates new URL in browser history
- Back/Forward buttons navigate through pick states
- Each position shows immutable historical state
- Perfect for reviewing draft decisions

## Benefits of This Architecture

### Testability
- Can test draft logic without UI
- Mock storage for isolated tests
- Clear input/output for each method

### Maintainability  
- Single place for all draft logic
- UI components are simple and predictable
- Easy to understand data flow

### Debuggability
- All state changes go through service
- Can log every transition
- Clear separation of concerns

### Performance
- No complex replay logic in UI
- Service can optimize state transitions
- Storage layer can implement caching

## Success Criteria
- [ ] Navigation works reliably (p1p1 → p1p2 after pick)
- [ ] Bots pick from their pack and pack sizes decrease  
- [ ] Browser back/forward shows immutable history
- [ ] URL always reflects current position
- [ ] Components have simple, predictable methods
- [ ] Draft logic is easily testable
- [ ] Action history is readable and debuggable
- [ ] Single source of truth for draft state

## Migration Strategy
4. **Remove old code** once all components converted
5. **No data migration needed** - fresh start approach

---

*This refactor will make the draft system reliable, testable, and maintainable by properly separating UI concerns from business logic.*
