# **FlashDraft - MTG Draft Simulator & Playtest Platform** ✨

## **Project Overview**

FlashDraft is a Magic: The Gathering draft simulator and playtesting platform built with Astro, React, and Python. The core workflow is: Draft → Deck Building → Goldfishing → Iteration. The platform combines AI-powered draft opponents with a streamlined digital playmat for rapid deck testing and learning.

**🎯 Core Features**
- **Complete Draft Simulation**: 8-player drafts with deterministic AI bots
- **Real MTG Sets**: Final Fantasy and Dragons of Tarkir with full Scryfall integration
- **URL-based Navigation**: Shareable permalinks with position tracking (/draft/{seed}/p{round}p{pick})
- **Event-sourced State**: Deterministic draft replay from action history
- **Modern Interface**: React + Astro + TypeScript with shadcn/ui components
- **Performance-First**: <150ms transitions between draft/deckbuild/playtest modes

**Status**: 🔄 **Active Development** - Core draft simulation complete, working on state management and navigation

## **Getting Started**

### Prerequisites
- Node.js 18+
- Python 3.9+
- npm (package manager)

### Installation
```bash
# Clone the repository
git clone https://github.com/cybermelons/flashdraft.git
cd flashdraft

# Install frontend dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Download MTG card data
python scripts/download_scryfall_data.py
```

### Development
```bash
# Start the development server
npm run dev

# Build for production
npm run build

# Run linting and formatting
npm run lint
npm run format
```

## **🎮 How to Use**

1. **Start a Draft**: Visit `http://localhost:4321/draft` to begin
2. **Select a Set**: Choose from Final Fantasy (FIN) or Dragons of Tarkir (DTK)
3. **Draft Cards**: Pick cards from packs in a deterministic 8-player draft
4. **Navigate**: Use URL permalinks to jump to any position in the draft
5. **Complete Draft**: View deck composition after p3p15

**🔗 URL Navigation**:
- `/draft` - Draft selection and overview
- `/draft/{seed}` - Specific draft by seed
- `/draft/{seed}/p{pack}p{pick}` - Navigate to exact position (e.g., `/draft/abc123/p2p5`)

**Current Features**:
- ✅ Deterministic draft simulation with action replay
- ✅ URL-based position navigation and sharing
- ✅ Complete Scryfall card data integration
- ✅ Round transitions and draft completion flow
- 🔄 State management optimization in progress

## **Project Structure**

```
flashdraft/
├── src/
│   ├── lib/                    # Core library code
│   │   ├── engine/            # Draft engine (pure logic)
│   │   │   ├── DraftEngine.ts        # Main state machine
│   │   │   ├── actions.ts            # Action types & creators
│   │   │   ├── SeededRandom.ts       # Deterministic randomization
│   │   │   ├── PackGenerator.ts      # Seeded pack creation
│   │   │   └── storage/              # Engine persistence layer
│   │   │       ├── DraftStorageAdapter.ts  # Abstract interface
│   │   │       ├── LocalStorageAdapter.ts  # LocalStorage implementation
│   │   │       └── types.ts                # Storage types
│   │   └── utils.ts           # General utilities
│   │
│   ├── components/            # React UI components
│   │   ├── SimpleDraftRouter.tsx # Route handling
│   │   ├── DraftInterface.tsx    # Main draft interface
│   │   ├── PackDisplay.tsx       # Pack and card grid
│   │   └── ui/                   # shadcn/ui components
│   │
│   ├── stores/               # UI state (nanostores)
│   │   ├── draftStore.ts         # Current draft UI state
│   │   ├── uiStore.ts            # UI-specific state (selections, etc.)
│   │   └── storage/              # UI persistence layer
│   │       └── UIStorageAdapter.ts # UI state persistence
│   │
│   ├── utils/               # App-specific utilities
│   │   └── navigation.ts        # URL parsing and navigation
│   │
│   └── pages/               # Astro pages
│       ├── index.astro          # Home page
│       ├── draft.astro          # Draft list
│       └── draft/[...path].astro # Dynamic routes
│
├── data/sets/           # Downloaded MTG set data (DTK, FIN)
├── docs/prime/          # Development context and working plans
├── scripts/             # Data download and processing scripts
└── tests/               # Test suites for core logic
```

## **Architecture**

### **Two-Layer Architecture with Independent Persistence**
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

### **Draft Engine** ✅ (Core Layer - `src/lib/engine/`)
- **Pure In-Memory Logic**: Event-sourced draft state with zero dependencies
- **Action Types**: CREATE_DRAFT, START_DRAFT, HUMAN_PICK, BOT_PICK, PASS_PACKS, ADVANCE_POSITION, START_ROUND, COMPLETE_DRAFT
- **Deterministic Logic**: Seeded pack generation using Linear Congruential Generator  
- **Self-Persisting**: Uses DraftStorageAdapter for automatic save/load
- **Multi-Tab Sync**: localStorage events for cross-tab synchronization
- **Error Handling**: Storage monitoring and graceful degradation

### **UI Layer** (Presentation Layer - `src/components/`, `src/stores/`)
- **Nanostores**: Reactive UI state management with localStorage persistence
- **Direct Engine Access**: UI calls engine methods directly via clean imports
- **Independent Persistence**: UIStorageAdapter for UI state (selected cards, preferences)
- **Components**: shadcn/ui + Tailwind CSS for consistent design
- **Framework**: Astro + React islands with TypeScript
- **Hydration Strategy**: UI state loads first, draft data loads asynchronously

### **Key Design Principles**
- **Dual Independence**: Each layer manages its own persistence completely
- **Direct Communication**: UI directly imports engine via `@/lib/engine/DraftEngine`
- **Storage Adapter Pattern**: Easy to swap backends (LocalStorage → IndexedDB → Server)  
- **Event Sourcing in Engine Only**: Perfect reproducibility where it matters
- **Colocated Dependencies**: Related code stays together in logical directories
- **Clean Import Paths**: Follows Astro/Next.js conventions with `src/lib/` pattern

## **Development Commands**

| Command | Action |
|---------|--------|
| `npm run dev` | Start development server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on source code |
| `npm run format` | Format code with Prettier |
| `python scripts/download_scryfall_data.py` | Download MTG card data from Scryfall |

## **Technology Stack**

- **Frontend**: Astro + React islands + TypeScript
- **UI**: Tailwind CSS + shadcn/ui components  
- **State Management**: Draft engine (`src/lib/engine/`) + Independent storage adapters + UI state (nanostores)
- **Data**: Scryfall API for card data and images
- **Testing**: Comprehensive test suite for core draft engine
- **Architecture**: Two-layer separation with dual persistence: UI ↔ Draft Engine, each with independent storage adapters

## **License**

MIT License - See LICENSE file for details