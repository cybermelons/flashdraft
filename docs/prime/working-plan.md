# Working Plan: Clean Two-Layer Architecture with Independent Persistence

## Progress: 5/16 tasks complete

### Phase 1: Core Draft Engine (Pure In-Memory Logic) ✅ COMPLETE
- [x] **Create DraftEngine core** - Pure event-sourced state machine ✅
- [x] **Implement Action types** - CREATE_DRAFT, HUMAN_PICK, BOT_PICK, PASS_PACKS, ADVANCE_POSITION, etc. ✅
- [x] **Add deterministic pack generation** - Seeded random with LCG for reproducible drafts ✅
- [x] **Build action application system** - Pure functions for state transitions ✅

### Phase 2: Draft Engine Persistence Layer
- [x] **Create DraftStorageAdapter interface** - Abstract persistence for draft engine ✅
- [ ] **Implement DraftLocalStorageAdapter** - With storage monitoring and error handling
- [ ] **Add draft serialization** - Efficient draft state encoding/decoding
- [ ] **Integrate persistence with engine** - Auto-save on human actions only
- [ ] **Add multi-tab sync** - localStorage events for cross-tab synchronization
- [ ] **Implement storage audit** - Monitor usage and handle quota errors

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
- **File**: `src/lib/engine/DraftEngine.ts`
- **Pure Functions**: No side effects, fully testable
- **Event Sourcing**: All state changes through actions
- **Deterministic**: Seeded random for reproducible drafts
- **Self-Persisting**: Uses DraftStorageAdapter for its own persistence

### Draft Storage Adapter (Engine Persistence)
- **File**: `src/lib/engine/storage/DraftStorageAdapter.ts`
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
**Solution**: Save only on human actions to avoid excessive saves
```typescript
class DraftEngine {
  private storage?: DraftStorageAdapter;
  
  applyAction(action: DraftAction): DraftState {
    const newState = this.processAction(action);
    
    // Only save on human actions (not bot picks)
    if (this.storage && action.type === 'HUMAN_PICK') {
      this.storage.saveDraft(newState).catch(error => {
        console.error('Storage failed:', error);
        // Continue anyway - draft is in memory
      });
    }
    
    return newState;
  }
  
  // Optional storage injection
  setStorage(storage: DraftStorageAdapter): void {
    this.storage = storage;
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

## File Structure (Actual)
```
src/
├── lib/
│   └── engine/                 # Pure draft logic
│       ├── DraftEngine.ts      # Core state machine
│       ├── actions.ts          # Action types and creators
│       ├── SeededRandom.ts     # Deterministic randomization
│       ├── PackGenerator.ts    # Seeded pack creation
│       └── storage/            # Engine persistence layer
│           ├── DraftStorageAdapter.ts      # Abstract interface ✅
│           ├── types.ts                    # Storage types ✅
│           └── LocalStorageAdapter.ts      # LocalStorage implementation (TODO)
│
├── stores/                 # UI state (nanostores)
│   ├── draftStore.ts       # Current draft UI state (TODO)
│   ├── uiStore.ts          # UI-specific state (TODO)
│   └── storage/            # UI persistence layer
│       └── UIStorageAdapter.ts  # UI state persistence (TODO)
│
├── components/             # React UI components
│   ├── SimpleDraftRouter.tsx    # Route handling (TODO)
│   ├── DraftInterface.tsx       # Main draft interface (TODO)
│   ├── PackDisplay.tsx          # Pack and card grid (TODO)
│   ├── Card.tsx                 # Individual card component (TODO)
│   └── ui/                      # shadcn/ui components ✅
│       └── hover-card.tsx       # Existing hover card ✅
│
├── utils/                  # App-specific utilities
│   └── navigation.ts       # URL parsing and navigation (TODO)
│
└── pages/                  # Astro pages ✅
    ├── index.astro         # Home page ✅
    ├── draft.astro         # Draft list ✅
    └── draft/[...path].astro # Dynamic routes ✅
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
**Phase 2 In Progress**: 
- ✅ Created DraftStorageAdapter interface and types
- 🔄 Need to implement LocalStorageAdapter with error handling
- 🔄 Need to integrate selective auto-save (human actions only)
- 🔄 Need to add multi-tab sync via localStorage events

## Key Implementation Notes
1. **Auto-save timing**: Only save on HUMAN_PICK actions to avoid excessive saves
2. **Storage failures**: Log errors but don't break draft - memory is primary
3. **Multi-tab sync**: Use window.addEventListener('storage', ...) for cross-tab updates
4. **Storage audit**: Track usage to prevent quota exceeded errors
5. **UI hydration**: UI state loads immediately, draft data loads async

## Next Immediate Steps
1. Implement LocalStorageAdapter with error handling and monitoring
2. Update DraftEngine to optionally accept storage adapter
3. Add selective auto-save logic (human actions only)
4. Create storage audit system for monitoring usage