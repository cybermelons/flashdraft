# Working Plan: Clean Three-Layer Architecture

## Progress: 4/12 tasks complete

### Phase 1: Core Draft Engine (Pure In-Memory Logic) ✅ COMPLETE
- [x] **Create DraftEngine core** - Pure event-sourced state machine ✅
- [x] **Implement Action types** - CREATE_DRAFT, HUMAN_PICK, BOT_PICK, PASS_PACKS, ADVANCE_POSITION, etc. ✅
- [x] **Add deterministic pack generation** - Seeded random with LCG for reproducible drafts ✅
- [x] **Build action application system** - Pure functions for state transitions ✅

### Phase 2: Storage Module (Persistence Interface)
- [ ] **Create StorageModule interface** - Abstract persistence layer
- [ ] **Implement LocalStorage backend** - Browser localStorage implementation
- [ ] **Add URL state sync** - Bidirectional URL ↔ draft state sync
- [ ] **Build state serialization** - Efficient draft state encoding/decoding

### Phase 3: UI Layer (Nanostores + React)
- [ ] **Create UI stores with nanostores** - Reactive UI state management
- [ ] **Build core React components** - SimpleDraftRouter, DraftInterface, PackDisplay
- [ ] **Implement card components** - Card display, selection, hover details
- [ ] **Add navigation components** - Route handling and position jumping

## Technical Architecture

### Three-Layer Separation
```
UI Layer (nanostores + localStorage) ↔ Storage Module ↔ Draft Engine (in-memory)
```

### Draft Engine (Core Layer)
- **File**: `src/engine/DraftEngine.ts`
- **Pure Functions**: No side effects, fully testable
- **Event Sourcing**: All state changes through actions
- **Deterministic**: Seeded random for reproducible drafts
- **Action Types**:
  ```
  CREATE_DRAFT, START_DRAFT, HUMAN_PICK, BOT_PICK, 
  PASS_PACKS, ADVANCE_POSITION, START_ROUND, COMPLETE_DRAFT
  ```

### Storage Module (Data Layer)
- **File**: `src/storage/StorageModule.ts`
- **Interface**: Abstract persistence operations
- **Backends**: LocalStorage, URL state, future database
- **Responsibilities**: Save/load draft state, sync with UI

### UI Layer (Presentation Layer)
- **Files**: `src/components/`, `src/stores/`
- **Nanostores**: Reactive atoms with localStorage persistence
- **React Components**: Connected to nanostores for updates
- **Route Integration**: Works with existing Astro page structure

## Existing Route Structure (Preserved)
```
/                           -> index.astro
/draft                      -> draft.astro (DraftListPage)
/draft/new                  -> draft/new.astro
/draft/{draftId}            -> draft/[...path].astro (SimpleDraftRouter)
/draft/{draftId}/p{r}p{p}   -> draft/[...path].astro (SimpleDraftRouter)
```

## Key Design Principles

### 1. **Pure Engine Isolation**
- Draft engine has ZERO dependencies
- No UI concerns, no persistence logic
- Perfect testability and determinism

### 2. **Storage as Bridge**
- Storage module is the ONLY bridge between engine and UI
- Handles all persistence (localStorage, URL, future DB)
- UI never directly touches engine

### 3. **UI State Independence**
- Nanostores manage UI-specific state (loading, errors, selections)
- localStorage persistence for UI preferences
- Syncs with engine via storage module for truth

### 4. **Event Sourcing**
- All draft changes go through actions
- Perfect replay capability from action history
- URL navigation works by replaying actions to position

## Implementation Order

### Step 1: Draft Engine
1. Create `src/engine/DraftEngine.ts` with core state machine
2. Add `src/engine/actions.ts` with all action types
3. Build `src/engine/seededRandom.ts` for deterministic pack generation
4. Test engine in isolation - prove determinism

### Step 2: Storage Module  
1. Create `src/storage/StorageModule.ts` interface
2. Implement `src/storage/LocalStorageBackend.ts`
3. Add `src/storage/URLStateSync.ts` for route integration
4. Test persistence and URL sync

### Step 3: UI Layer
1. Create `src/stores/draftStore.ts` with nanostores
2. Build `src/components/SimpleDraftRouter.tsx` (route handler)
3. Add `src/components/DraftInterface.tsx` (main draft UI)
4. Implement card display and interaction components

## File Structure (Target)
```
src/
├── engine/                 # Pure draft logic (no dependencies)
│   ├── DraftEngine.ts      # Core state machine
│   ├── actions.ts          # Action types and creators
│   ├── seededRandom.ts     # Deterministic randomization
│   └── packGenerator.ts    # Seeded pack creation
│
├── storage/                # Persistence interface layer
│   ├── StorageModule.ts    # Abstract interface
│   ├── LocalStorageBackend.ts # Browser storage
│   └── URLStateSync.ts     # Route synchronization
│
├── stores/                 # UI state (nanostores)
│   ├── draftStore.ts       # Main draft UI state
│   └── uiStore.ts          # UI-specific state (loading, etc.)
│
├── components/             # React UI components
│   ├── SimpleDraftRouter.tsx # Route handling
│   ├── DraftInterface.tsx  # Main draft interface
│   ├── PackDisplay.tsx     # Pack and card grid
│   └── Card.tsx            # Individual card component
│
└── pages/                  # Astro pages (preserved)
    ├── index.astro         # Home page
    ├── draft.astro         # Draft list
    └── draft/[...path].astro # Dynamic routes
```

## Success Criteria

### Engine Layer ✅
- [ ] Engine tests pass: deterministic state transitions
- [ ] Action replay works: same inputs → same outputs  
- [ ] Pack generation is seeded: reproducible drafts
- [ ] Zero dependencies: pure functions only

### Storage Layer ✅
- [ ] LocalStorage persistence works
- [ ] URL state bidirectional sync
- [ ] Engine ↔ Storage ↔ UI data flow
- [ ] State serialization efficient

### UI Layer ✅
- [ ] Nanostores reactive updates
- [ ] All existing routes work
- [ ] Card interaction smooth
- [ ] Draft navigation functional

## Current State
**Starting fresh with clean architecture.**
All previous mixed-architecture code removed.
Ready to implement pure three-layer separation.

## Next Steps
1. Create draft engine with event sourcing
2. Implement storage module interface
3. Build nanostores UI layer
4. Connect to existing Astro routes