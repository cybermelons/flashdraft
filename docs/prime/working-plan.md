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

- [ ] **Remove old code**
  - [ ] Delete complex store logic
  - [ ] Remove replay engine from UI
  - [ ] Clean up imports and dependencies

### Phase 1: Create Service Layer
- [ ] **Create DraftService class**
  - [ ] `src/services/DraftService.ts`
  - [ ] Pure business logic, no UI dependencies
  - [ ] All draft operations return complete state
- [ ] **Core service methods**:
  - [ ] `createDraft(setData: MTGSetData): DraftState`
  - [ ] `startDraft(draftId: string): DraftState`
  - [ ] `makeHumanPick(draftId: string, cardId: string): DraftState`
  - [ ] `navigateToPosition(draftId: string, round: number, pick: number): DraftState`
  - [ ] `getDraft(draftId: string): DraftState | null`
- [ ] **Service handles all complexity**:
  - [ ] Bot decision making
  - [ ] Pack passing logic
  - [ ] Position advancement
  - [ ] URL generation
  - [ ] Storage operations


### Phase 2: Simplify UI Store
- [ ] **Refactor seededDraftStore**
  - [ ] Remove all business logic
  - [ ] Keep only current draft state: `atom<DraftState | null>`
  - [ ] Simple actions that call service
- [ ] **Clean store actions**:
  ```typescript
  export const draftActions = {
    createDraft: (setData: MTGSetData) => {
      const state = draftService.createDraft(setData);
      draftStore.set(state);
      updateURL(state);
    },
    
    makeHumanPick: (cardId: string) => {
      const currentDraft = draftStore.get();
      if (!currentDraft) return;
      
      const newState = draftService.makeHumanPick(currentDraft.id, cardId);
      draftStore.set(newState);
      updateURL(newState);
    },
    
    navigateToPosition: (round: number, pick: number) => {
      const currentDraft = draftStore.get();
      if (!currentDraft) return;
      
      const newState = draftService.navigateToPosition(currentDraft.id, round, pick);
      draftStore.set(newState);
      updateURL(newState);
    }
  };
  ```

### Phase 3: Fix Navigation

hard nvagation, updateurl should be link an <a> tag  navigation.

- [ ] **Single URL update function**
  - [ ] `updateURL(state: DraftState)` called after every state change
  - [ ] Always uses `state.seed` and current position
  - [ ] Consistent URL format: `/draft/{seed}/p{round}p{pick}`
- [ ] **Router simplification**
  - [ ] Router just calls `draftService.navigateToPosition()`
  - [ ] No complex replay logic in router
  - [ ] Service handles loading and position restoration

### Phase 4: Move Business Logic to Service
- [ ] **Extract replay engine logic**
  - [ ] Move `replayDraftToPosition()` into service
  - [ ] Move `applyDelta()` into service
  - [ ] Move `processBotPicks()` into service
- [ ] **Service owns state transitions**
  - [ ] Service decides when to advance positions
  - [ ] Service handles bot processing timing
  - [ ] Service manages pack passing
- [ ] **Storage abstraction**
  - [ ] Service calls storage layer
  - [ ] Storage layer is separate from service
  - [ ] Clean interface: `save(state)`, `load(id)`, `list()`

### Phase 5: Component Simplification
- [ ] **Update UI components**
  - [ ] Components only call `draftActions.X()`
  - [ ] Remove direct replay engine calls
  - [ ] Remove complex state logic from components
- [ ] **Clean component methods**:
  ```typescript
  function handlePick(cardId: string) {
    draftActions.makeHumanPick(cardId);
    // That's it! Service handles everything
  }
  
  function handleNavigateNext() {
    const { round, pick } = calculateNextPosition(draft);
    draftActions.navigateToPosition(round, pick);
    // Service handles position validation and state restoration
  }
  ```

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

### Service Layer Design
```typescript
type Action = (previous: DraftState) => DraftState

type Actions = {
  'PlayerPick', 'BotPick', 'Player Pass'
}
type ActionName = keyof Actions

const currentState: DraftState = createDraftState('seed', replayQueue: Action[])

export class DraftService {
  constructor(private storage: DraftStorage) {}
  

  // All methods return complete state
  // Service is stateless - state lives in storage
  makeHumanPick(draftId: string, cardId: string): DraftState {
    const draft = this.storage.load(draftId);
    if (!draft) throw new Error('Draft not found');
    
    // Apply pick
    const withHumanPick = this.applyHumanPick(draft, cardId);
    
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
  save(draft: DraftState): void;
  load(id: string): DraftState | null;
  list(): DraftMetadata[];
  delete(id: string): boolean;
}
```

### URL Management

do a hard navigation. we want each pick to be in history. if click back on the browser, it takes them back to the immutable pick they had before. if they were deciding what to pick on p1p3, they can press back twice on their browser to go to the previous pick states, and see their immutable pick.

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
- [ ] URL always reflects current position
- [ ] Components have simple, predictable methods
- [ ] Draft logic is easily testable
- [ ] Single source of truth for draft state

## Migration Strategy
4. **Remove old code** once all components converted
5. **No data migration needed** - fresh start approach

---

*This refactor will make the draft system reliable, testable, and maintainable by properly separating UI concerns from business logic.*
