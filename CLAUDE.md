# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlashDraft is an MTG (Magic: The Gathering) draft simulator and playtesting platform built with Astro, React, and Python. The core workflow is: Draft → Deck Building → Goldfishing → Iteration. The platform combines AI-powered draft opponents trained on 17lands data with a streamlined digital playmat for rapid deck testing and learning.

## Development Commands

### Frontend Development
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Code quality
pnpm lint
pnpm format
```

### Backend Development
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run backend tests
pytest tests/backend

# Data processing
python scripts/download_data.py --set ACR
python scripts/process_data.py
python scripts/train_models.py --model pairwise
```

### Initial Setup
```bash
# Run setup script to create directory structure
./setup.sh

# Install all dependencies
pnpm install && pip install -r requirements.txt
```

## Architecture

### Frontend (Astro + React)
- **Astro**: Primary framework with React islands for interactivity
- **State Management**: Zustand for global state (draft state, deck composition)
- **UI Components**: shadcn/ui + Tailwind CSS for consistent design
- **Key Performance Target**: <150ms transitions between draft/deckbuild/playtest modes

### Backend (Python)
- **API Layer**: Astro endpoints for web requests
- **ML Models**: scikit-learn pairwise ranking models for bot behavior
- **Data Pipeline**: 17lands data processing and bot training
- **Real-time**: WebSocket connections for live draft updates

### Data Flow
1. **Card Data**: Scryfall API → local JSON cache → frontend components
2. **Draft Logic**: Frontend draft state → backend bot decisions → updated game state
3. **ML Pipeline**: 17lands CSV → feature engineering → trained models → bot personalities

## Key Design Principles

### Performance-First
- Ultra-fast transitions between draft/deckbuild/playtest (<150ms target)
- Minimal re-renders using optimized React patterns
- Efficient state management with Zustand
- Card image preloading and caching

### Learning-Focused Interface
- **Goldfishing-oriented**: Manual playtesting without rules enforcement
- **Visual Feedback**: Real-time mana curve and deck composition analysis
- **Rapid Iteration**: Quick reset and retry cycles for skill building
- **Pattern Recognition**: Visual cues connecting draft picks to deck performance

### Realistic AI Behavior
- Bots trained on actual 17lands draft data
- Multiple skill levels (Bronze, Gold, Mythic personalities)
- >70% pick agreement with human players
- Context-aware decisions (pack position, color signals, deck state)

## Development Workflow

### Phase-Based Development
Currently in **Phase 1**: Foundation & Real Data Setup
- Focus on real MTG sets (Final Fantasy, Dragons of Tarkir)
- Scryfall API integration for card data
- Basic draft simulation with rule-based bots
- 17lands data acquisition and processing

### Code Organization
```
src/
├── frontend/          # React components and pages
│   ├── components/    # Reusable UI components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom React hooks
│   ├── stores/       # Zustand state management
│   └── utils/        # Frontend utilities
├── backend/          # Python backend services
│   ├── api/          # API routes and endpoints
│   ├── models/       # ML models and training
│   ├── services/     # Business logic
│   └── utils/        # Backend utilities
└── shared/           # Shared types and constants
```

## Testing Strategy

### Frontend Testing
```bash
# Run frontend tests
pnpm test

# Watch mode for development
pnpm run test:watch
```

### Backend Testing
```bash
# Run all backend tests
pytest tests/backend

# Run specific test file
pytest tests/backend/test_draft_logic.py

# Run with coverage
pytest --cov=src/backend tests/backend
```

### Integration Testing
- End-to-end draft simulation flows
- Performance benchmarks for transition times
- Bot behavior validation against 17lands data
- User journey testing (draft → deckbuild → playtest)

## Data Management

### Card Data Sources
- **Scryfall API**: Primary source for card data and images
- **Local Caching**: JSON files for offline development
- **Image Optimization**: Compressed card images for performance

### ML Training Data
- **17lands Datasets**: Public draft data for bot training
- **Processing Pipeline**: CSV → feature engineering → model training
- **Model Storage**: Pickle files for trained bot personalities

## Performance Considerations

### Critical Performance Targets
- **Draft Transitions**: <150ms between pick selection and next pack
- **Deckbuild Updates**: Real-time mana curve updates without lag
- **Playtest Mode**: Smooth card manipulation and game state updates
- **Bot Decisions**: <1 second per AI pick to maintain draft flow

### Optimization Strategies
- React.memo for expensive components
- Zustand subscriptions for minimal re-renders
- Image preloading for card displays
- Efficient data structures for draft state

## Common Development Tasks

### Adding New MTG Sets
1. Update Scryfall API integration for new set codes
2. Download set data: `python scripts/download_data.py --set [SET_CODE]`
3. Process 17lands data if available
4. Update bot training data and retrain models
5. Test draft simulation with new set

### Improving Bot Behavior
1. Analyze 17lands data for pick patterns
2. Engineer new features (synergy, signals, etc.)
3. Retrain pairwise ranking models
4. Validate against held-out human data
5. A/B test bot personalities in draft simulations

### UI/UX Enhancements
1. Follow shadcn/ui patterns for consistency
2. Maintain <150ms transition targets
3. Test with keyboard shortcuts for power users
4. Validate learning feedback loops with MTG players

## Architectural Integrity Constraints

**CRITICAL: Before implementing ANY state change, follow this systematic approach:**

1. **Context Check** (What to understand first):
   - Identify which architectural layer you're modifying (UI → Store → Service → Storage)
   - Review the layer's single responsibility
   - Check existing patterns in nearby code

2. **Specific Anti-Patterns to Avoid** (Concrete examples):
   ```typescript
   // ❌ NEVER: Direct state mutation in service layer
   newState = {
     ...newState,
     pick: newState.pick + 1  // This bypasses the action system!
   };
   
   // ✅ ALWAYS: State changes through actions
   const action = { type: 'ADVANCE_POSITION' };
   newState = applyAction(newState, action);
   ```

3. **Approach** (Step-by-step verification):
   - [ ] Is this state change going through an action?
   - [ ] Will this change be captured in the event/action log?
   - [ ] Can this state be reconstructed from action history alone?
   - [ ] Does each layer maintain its single responsibility?
   
   **If ANY answer is "no", STOP and redesign.**

4. **Constraints** (What to prefer/avoid):
   - **Prefer**: Explicit actions for ALL state transitions
   - **Prefer**: Pure functions in action applicators
   - **Avoid**: Direct state mutations outside action system
   - **Avoid**: Mixing concerns across architectural layers

### Implementation Checklist

Before committing any state management code:

1. **Trace the complete data flow**:
   ```
   User Action → UI Component → Store Action → Service Method → Action Application → State Change
   ```

2. **Verify replayability**:
   - Start from initial state
   - Apply all actions in sequence
   - Result MUST match current state

3. **Test edge cases**:
   - Empty state
   - Mid-action interruption
   - Replay from different positions

### Example Application

**Task**: "Increment draft position after picks"

**Wrong approach** (procedural thinking):
"After processing picks, update the pick number"

**Correct approach** (event-driven thinking):
"What event occurred? → ADVANCE_POSITION
How does state transform? → Via applyAdvancePosition action
Where in the flow? → After PASS_PACKS, before completion check"

### Mental Model Shift

**From**: "Do X, then update Y"
**To**: "Event X occurred, state transforms according to action"

This ensures every state change is:
- Explicit (as an action)
- Replayable (from action history)
- Testable (pure function)
- Maintainable (single responsibility)

## Architecture Guidelines: Ensuring Sound Design

### Core Principles

#### 1. Event-Sourced State Management
All state changes MUST go through the action system. This ensures:
- **Replayability**: Any state can be reconstructed from action history
- **Testability**: Pure functions transform state predictably
- **Debuggability**: Complete audit trail of all changes

**✅ DO:**
```typescript
const action = { type: 'ADVANCE_POSITION' };
newState = applyAction(state, action);
```

**❌ DON'T:**
```typescript
newState.pick = newState.pick + 1; // Direct mutation!
```

#### 2. Single Source of Truth
Each piece of data should have exactly one authoritative location:
- **Engine State**: Draft progression, packs, picks
- **UI State**: Viewing position, selections, hover states
- **Card Data**: Set data loaded into engine

#### 3. Unidirectional Data Flow
```
User Action → UI Component → Store Action → Engine Method → State Change → UI Update
```

Never short-circuit this flow or create circular dependencies.

### Architectural Layers

#### 1. UI Layer (React Components)
**Responsibility**: Rendering and user interaction only
- Display data from stores
- Handle user events
- Delegate state changes to stores
- NO business logic
- NO direct state mutations

#### 2. Store Layer (Nanostores)
**Responsibility**: UI state management and engine coordination
- Manage viewing state (position, selections)
- Coordinate with engine for business operations
- Provide computed/derived state
- NO direct engine state mutations

#### 3. Engine Layer (DraftEngine)
**Responsibility**: Core business logic and state management
- Apply actions to transform state
- Enforce draft rules
- Maintain action history
- NO UI concerns

#### 4. Storage Layer (LocalStorageAdapter)
**Responsibility**: Persistence only
- Save/load draft state
- Manage action history
- NO business logic
- NO state transformations

### Code Review Checklist

Before implementing ANY state change:

#### 1. Identify the Layer
- [ ] Which architectural layer am I modifying?
- [ ] Does this change belong in this layer?
- [ ] Am I mixing concerns across layers?

#### 2. Check Data Flow
- [ ] Is this state change going through an action?
- [ ] Will this change be captured in the action log?
- [ ] Can this state be reconstructed from actions alone?
- [ ] Is the data flow unidirectional?

#### 3. Verify Single Responsibility
- [ ] Does each function do exactly one thing?
- [ ] Is each module focused on a single concern?
- [ ] Would a new developer know where to find this logic?

#### 4. Test for Replayability
- [ ] Start from initial state
- [ ] Apply all actions in sequence
- [ ] Does the result match the current state?

### Common Anti-Patterns to Avoid

#### 1. Direct State Mutation
```typescript
// ❌ WRONG: Bypasses action system
state.currentPick++;

// ✅ RIGHT: Goes through action
const action = { type: 'ADVANCE_PICK' };
state = applyAction(state, action);
```

#### 2. Mixed Concerns
```typescript
// ❌ WRONG: UI component with business logic
function Card({ card }) {
  const handlePick = () => {
    // Business logic in UI!
    if (pack.cards.length === 1) {
      advanceRound();
    }
  };
}

// ✅ RIGHT: UI delegates to store
function Card({ card }) {
  const handlePick = () => {
    draftActions.pickCard(card.id); // Store handles logic
  };
}
```

#### 3. Circular Dependencies
```typescript
// ❌ WRONG: Router changes state based on URL, state changes URL
useEffect(() => {
  if (url.pick !== state.pick) {
    setState({ pick: url.pick }); // Circular!
  }
}, [url]);

// ✅ RIGHT: State is source of truth, URL follows
useEffect(() => {
  const url = `/draft/${id}/p${state.round}p${state.pick}`;
  window.history.replaceState({}, '', url);
}, [state.round, state.pick]);
```

#### 4. State Synchronization
```typescript
// ❌ WRONG: Multiple sources of truth
const [enginePosition, setEnginePosition] = useState();
const [viewingPosition, setViewingPosition] = useState();
// Now they can diverge!

// ✅ RIGHT: Single source, computed views
const enginePosition = $currentDraft.currentPosition;
const viewingPosition = $viewingPosition.get();
const isViewingCurrent = enginePosition === viewingPosition;
```

### Decision Framework

When faced with an architectural decision:

#### 1. Ask "What Changed?"
- User clicked something? → UI event
- Business rule triggered? → Engine action
- Need to show different data? → Computed store
- Need to save state? → Storage operation

#### 2. Ask "Who Owns This?"
- Draft progression? → Engine
- Viewing position? → UI Store
- Card data? → Engine's set data
- User preferences? → UI Store

#### 3. Ask "How Does It Flow?"
Trace the complete data flow:
1. Where does the change originate?
2. What transforms the data?
3. Where does it end up?
4. Are there any loops?

### Implementation Workflow

#### 1. Design Phase (REQUIRED)
Before writing code:
1. Identify which layer(s) need changes
2. Map out the data flow
3. Check for architectural violations
4. Write the action definitions

#### 2. Implementation Phase
1. Implement actions first
2. Add action handlers
3. Update UI to dispatch actions
4. Add computed stores if needed

#### 3. Verification Phase
1. Test action replay
2. Verify no direct mutations
3. Check for circular dependencies
4. Ensure single responsibility

### Examples of Architectural Soundness

#### Example 1: Adding a New Feature
**Task**: Add timer to auto-advance picks

**❌ WRONG Approach**:
```typescript
// In PackDisplay component
useEffect(() => {
  const timer = setTimeout(() => {
    currentPick++;
    updateURL();
  }, 30000);
}, []);
```

**✅ RIGHT Approach**:
```typescript
// 1. Define action
type DraftAction = 
  | { type: 'TIMER_EXPIRED' }

// 2. Handle in engine
case 'TIMER_EXPIRED':
  return handleAutoAdvance(state);

// 3. UI dispatches action
useEffect(() => {
  const timer = setTimeout(() => {
    draftActions.timerExpired();
  }, 30000);
}, []);
```

#### Example 2: Fixing a Bug
**Bug**: Position not advancing after pick

**❌ WRONG Fix**:
```typescript
// Add hack to force position update
if (stillOnSamePosition) {
  forceUpdatePosition();
}
```

**✅ RIGHT Fix**:
```typescript
// Find root cause: atomic state updates
async processAllPicksAndAdvance() {
  // Process all changes together
  const newState = processHumanPick(state);
  const afterBots = processBotPicks(newState);
  const final = advancePosition(afterBots);
  
  // Single atomic update
  setState(final);
}
```

### Red Flags That Indicate Architectural Issues

1. **Needing to update multiple files for one feature**
   - Suggests logic is scattered
   - Consider consolidating

2. **Fighting with state synchronization**
   - Multiple sources of truth
   - Need single authoritative source

3. **Adding "just one more check"**
   - Function doing too much
   - Split into focused functions

4. **Debugging requires understanding many files**
   - Poor separation of concerns
   - Refactor for clarity

5. **Tests are hard to write**
   - Too much coupling
   - Need better isolation

### Conclusion

Architectural soundness isn't about perfection—it's about:
1. **Consistency**: Follow established patterns
2. **Clarity**: Make intent obvious
3. **Maintainability**: Easy to debug and extend
4. **Correctness**: State changes are predictable

When in doubt:
- Favor explicit over implicit
- Choose simple over clever
- Prioritize debuggability
- Maintain clear boundaries

Remember: A "quick fix" that violates architecture will cost more time in debugging than doing it right the first time.