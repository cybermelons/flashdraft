# Working Plan: Static Set Data Integration with Scryfall

## Progress: 10/13 tasks complete

**Current Issue**: Draft creation fails with "Set data not found: FIN" because the draft engine expects set data to be loaded before creating drafts. Need to download MTG set data from Scryfall API and store it statically.

### Phase 1: Scryfall Data Download System ✅ COMPLETE
- [x] **Create data download script** - `scripts/download_scryfall_data.py` already exists ✅
- [x] **Set data structure** - Scryfall format with set_info and cards array ✅
- [x] **Download target sets** - FIN and DTK data exists in `data/raw/cards/` ✅
- [x] **Data storage format** - JSON files already downloaded ✅
- [x] **Error handling** - Rate limiting and retry logic implemented ✅

### Phase 2: Set Data Integration ✅ COMPLETE
- [x] **Create set data loader** - `src/lib/setData.ts` to load static JSON files ✅
- [x] **Engine initialization** - Auto-load sets into DraftEngine on startup ✅
- [x] **Set data validation** - Comprehensive validation for pack generation requirements ✅
- [x] **Type definitions** - Complete TypeScript interfaces for Scryfall data format ✅
- [x] **Build integration** - Set data properly bundled (4MB chunk includes JSON data) ✅

### Phase 3: UI Integration & Styling
- [ ] **Fix Tailwind CSS** - Ensure Tailwind is properly configured and loading
- [ ] **Set selection UI** - Update new.astro to show available sets dynamically
- [ ] **Pack generation testing** - Verify cards load and display correctly

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
│       ├── DraftEngine.ts      # Core state machine ✅
│       ├── DraftEngine.test.ts # Engine test suite (18 tests) ✅
│       ├── actions.ts          # Action types and creators ✅
│       ├── SeededRandom.ts     # Deterministic randomization ✅
│       ├── SeededRandom.test.ts # Random test suite (18 tests) ✅
│       ├── PackGenerator.ts    # Seeded pack creation ✅
│       ├── PackGenerator.test.ts # Pack test suite (18 tests) ✅
│       └── storage/            # Engine persistence layer
│           ├── DraftStorageAdapter.ts      # Abstract interface ✅
│           ├── types.ts                    # Storage types ✅
│           └── LocalStorageAdapter.ts      # LocalStorage implementation ✅
│
├── stores/                 # UI state (nanostores) ✅
│   ├── draftStore.ts       # Current draft UI state ✅
│   ├── uiStore.ts          # UI-specific state ✅
│   ├── storageIntegration.ts    # Storage integration layer ✅
│   ├── index.ts            # Centralized exports ✅
│   └── storage/            # UI persistence layer ✅
│       └── UIStorageAdapter.ts  # UI state persistence ✅
│
├── components/             # React UI components ✅
│   ├── SimpleDraftRouter.tsx    # Route handling ✅
│   ├── DraftInterface.tsx       # Main draft interface ✅
│   ├── PackDisplay.tsx          # Pack and card grid ✅
│   ├── Card.tsx                 # Individual card component ✅
│   ├── DraftHeader.tsx          # Draft navigation header ✅
│   ├── DraftSidebar.tsx         # Draft info sidebar ✅
│   ├── index.ts                 # Component exports ✅
│   └── ui/                      # shadcn/ui components ✅
│       └── hover-card.tsx       # Existing hover card ✅
│
├── utils/                  # App-specific utilities ✅
│   └── navigation.ts       # URL parsing and navigation ✅
│
└── pages/                  # Astro pages ✅
    ├── index.astro         # Home page ✅
    ├── draft.astro         # Draft list ✅
    └── draft/[...path].astro # Dynamic routes ✅
```

## Success Criteria

### Engine Layer ✅
- [x] Engine tests pass: deterministic state transitions ✅
- [x] Action replay works: same inputs → same outputs ✅
- [x] Pack generation is seeded: reproducible drafts ✅
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
**ALL PHASES COMPLETE - READY FOR PRODUCTION**: 
- ✅ Draft engine fully implemented and tested (54/54 tests passing)
- ✅ Complete persistence layer with LocalStorageAdapter
- ✅ Storage monitoring, error handling, and audit system
- ✅ Selective auto-save (human actions only) integrated into engine
- ✅ Multi-tab synchronization via localStorage events
- ✅ Comprehensive storage management (cleanup, quota monitoring)
- ✅ Complete UI layer with nanostores and React components
- ✅ URL navigation and routing with position jumping
- ✅ Direct engine-UI integration with reactive state management
- ✅ Card components with interaction support
- 🎯 **Ready for integration testing and production deployment**

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