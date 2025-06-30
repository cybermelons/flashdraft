# Working Plan: Clean Two-Layer Architecture with Independent Persistence

## Progress: 4/14 tasks complete

### Phase 1: Core Draft Engine (Pure In-Memory Logic) ✅ COMPLETE
- [x] **Create DraftEngine core** - Pure event-sourced state machine ✅
- [x] **Implement Action types** - CREATE_DRAFT, HUMAN_PICK, BOT_PICK, PASS_PACKS, ADVANCE_POSITION, etc. ✅
- [x] **Add deterministic pack generation** - Seeded random with LCG for reproducible drafts ✅
- [x] **Build action application system** - Pure functions for state transitions ✅

### Phase 2: Draft Engine Persistence Layer
- [ ] **Create DraftStorageAdapter interface** - Abstract persistence for draft engine
- [ ] **Implement DraftLocalStorageAdapter** - Draft state + action history persistence
- [ ] **Add draft serialization** - Efficient draft state encoding/decoding
- [ ] **Integrate persistence with engine** - Engine saves/loads its own state

### Phase 3: UI Layer (Nanostores + React)
- [ ] **Create UI stores with nanostores** - Reactive UI state management
- [ ] **Implement UIStorageAdapter** - UI state persistence (selected cards, preferences)
- [ ] **Build core React components** - SimpleDraftRouter, DraftInterface, PackDisplay
- [ ] **Add URL navigation utilities** - Route handling and position jumping
- [ ] **Implement card components** - Card display, selection, hover details
- [ ] **Connect UI to Draft Engine** - Direct engine access for draft operations

## Technical Architecture

### Two-Layer Architecture with Independent Persistence
```
┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │◄──►│ Draft Engine    │
│                 │    │                 │
│ • Nanostores    │    │ • Pure Logic    │
│ • React         │    │ • Event Source  │
│ • User Input    │    │ • Deterministic │
│ • Selected Card │    │ • In-Memory     │
│ • UI Prefs      │    │                 │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ UI LocalStorage │    │Draft LocalStorage│
│                 │    │                 │
│ • Selected card │    │ • Draft state   │
│ • UI preferences│    │ • Action history│
│ • Loading state │    │ • Persistence   │
└─────────────────┘    └─────────────────┘
```

### Draft Engine (Core Layer)
- **File**: `src/engine/DraftEngine.ts`
- **Pure Functions**: No side effects, fully testable
- **Event Sourcing**: All state changes through actions
- **Deterministic**: Seeded random for reproducible drafts
- **Self-Persisting**: Uses DraftStorageAdapter for its own persistence

### Draft Storage Adapter (Engine Persistence)
- **File**: `src/engine/storage/DraftStorageAdapter.ts`
- **Purpose**: Draft state and action history persistence
- **Data**: Complete draft state, action sequences, replay capability
- **Backends**: LocalStorage (default), IndexedDB (future), Server (future)

### UI Layer (Presentation Layer)
- **Files**: `src/components/`, `src/stores/`
- **Nanostores**: Reactive atoms for UI state
- **React Components**: Connected to nanostores for updates
- **Route Integration**: Works with existing Astro page structure
- **Direct Engine Access**: UI calls engine methods directly

### UI Storage Adapter (UI Persistence)
- **File**: `src/stores/UIStorageAdapter.ts`
- **Purpose**: UI state persistence across page refreshes
- **Data**: Selected cards, user preferences, loading states, UI-only concerns
- **Backends**: LocalStorage (default), SessionStorage (future)

## Key Design Principles

### 1. **Dual Independence**
- Draft Engine manages its own persistence completely
- UI Layer manages its own persistence completely
- Neither layer knows about the other's storage

### 2. **Direct Communication**
- UI directly imports and calls Draft Engine
- No intermediate bridge or proxy layer
- Engine returns state, UI updates its stores

### 3. **Storage Adapter Pattern**
- Each layer has its own storage adapter interface
- Easy to swap backends (LocalStorage → IndexedDB → Server)
- Clear separation of what each layer persists

### 4. **Event Sourcing in Engine Only**
- Draft Engine uses event sourcing for perfect reproducibility
- UI state is ephemeral and reactive
- Two different state management approaches for different needs

## Implementation Details

### Data Flow
```
User Action → UI Component → Draft Engine Method → New Draft State
     ↓              ↓               ↓                    ↓
UI Storage    Update UI Store  Engine Storage      UI Reacts
```

### Storage Responsibilities

**Draft Engine Storage:**
- Complete draft state (players, packs, cards, position)
- Action history for replay
- Draft metadata (seed, set, configuration)
- Save/load entire drafts
- Persistence key: `draft_{draftId}`

**UI Layer Storage:**
- Currently selected card ID
- User preferences (theme, card size, etc.)
- Temporary UI state (loading, errors)
- View preferences (sorting, filters)
- Persistence key: `ui_state`, `ui_prefs`

### Specific Implementation Areas Needing Expansion

#### 1. Draft Engine Persistence Integration
**Issue**: Engine needs to know WHEN to save
**Solution**: 
```typescript
class DraftEngine {
  private storage: DraftStorageAdapter;
  
  applyAction(action: DraftAction): DraftState {
    const newState = this.processAction(action);
    // Auto-save after every action
    await this.storage.saveDraft(newState);
    return newState;
  }
}
```

#### 2. Draft Loading and Resume
**Issue**: How does UI know which draft to load?
**Solution**: URL → UI → Engine load sequence
```typescript
// URL: /draft/abc123/p2p5
// 1. UI parses URL for draftId
// 2. UI calls engine.loadDraft(draftId)
// 3. Engine loads from storage and replays to position
// 4. UI updates to show current state
```

#### 3. Error Handling and State Sync
**Issue**: What if storage fails or state gets out of sync?
**Solution**: Define error boundaries and recovery strategies
```typescript
// UI error handling
try {
  const newState = await draftEngine.pickCard(cardId);
  uiStore.set(newState);
} catch (error) {
  uiStore.setError(error);
  // Attempt to reload from storage
}
```

#### 4. Concurrent Draft Management
**Issue**: Multiple drafts, which one is "current"?
**Solution**: UI maintains current draft context
```typescript
// UI Store
const currentDraftId = atom<string | null>(null);
const getCurrentDraft = () => draftEngine.getDraft(currentDraftId.get());
```

#### 5. Storage Adapter Interface Design
**Issue**: Need flexible backend swapping
**Solution**: Clear interface contracts
```typescript
interface DraftStorageAdapter {
  saveDraft(draft: DraftState): Promise<void>;
  loadDraft(draftId: string): Promise<DraftState | null>;
  deleteDraft(draftId: string): Promise<void>;
  listDrafts(): Promise<DraftSummary[]>;
}

interface UIStorageAdapter {
  saveUIState(state: UIState): Promise<void>;
  loadUIState(): Promise<UIState>;
  savePreferences(prefs: UserPreferences): Promise<void>;
  loadPreferences(): Promise<UserPreferences>;
}
```

## File Structure (Target)
```
src/
├── engine/                 # Pure draft logic
│   ├── DraftEngine.ts      # Core state machine with persistence
│   ├── actions.ts          # Action types and creators
│   ├── seededRandom.ts     # Deterministic randomization
│   ├── packGenerator.ts    # Seeded pack creation
│   └── storage/            # Engine persistence layer
│       ├── DraftStorageAdapter.ts      # Abstract interface
│       ├── DraftLocalStorageAdapter.ts # LocalStorage implementation
│       └── DraftIndexedDBAdapter.ts    # Future: IndexedDB
│
├── stores/                 # UI state (nanostores)
│   ├── draftStore.ts       # Current draft UI state
│   ├── uiStore.ts          # UI-specific state (selections, etc.)
│   └── storage/            # UI persistence layer
│       ├── UIStorageAdapter.ts         # Abstract interface
│       └── UILocalStorageAdapter.ts    # LocalStorage implementation
│
├── components/             # React UI components
│   ├── SimpleDraftRouter.tsx # Route handling
│   ├── DraftInterface.tsx  # Main draft interface
│   ├── PackDisplay.tsx     # Pack and card grid
│   └── Card.tsx            # Individual card component
│
├── utils/                  # Shared utilities
│   └── navigation.ts       # URL parsing and navigation helpers
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
- [ ] Auto-persistence: saves after every action
- [ ] Draft loading: can resume any draft from storage

### UI Layer ✅
- [ ] Nanostores reactive updates
- [ ] All existing routes work
- [ ] Card interaction smooth
- [ ] UI state persists across refreshes
- [ ] Direct engine communication works

### Storage Separation ✅
- [ ] Two independent storage systems
- [ ] Easy to swap storage backends
- [ ] No cross-contamination of data
- [ ] Clear data ownership boundaries

## Current State
**Starting Phase 2**: Need to create Draft Storage Adapter and integrate with engine.
All Phase 1 (engine core) is complete.
Ready to implement engine persistence layer.

## Next Steps
1. Create DraftStorageAdapter interface and LocalStorage implementation
2. Integrate auto-save into DraftEngine
3. Add draft loading and resume capability
4. Create UI stores with direct engine access