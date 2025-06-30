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
│   ├── frontend/           # React components and UI
│   │   ├── components/     # Draft interface, card display, navigation
│   │   ├── pages/         # Astro page components
│   │   └── stores/        # UI state (nanostores with localStorage persistence)
│   │
│   ├── services/          # Draft engine (pure in-memory logic)
│   │   ├── applyAction.ts # Event sourcing and action application
│   │   ├── DraftEngine.ts # Core draft logic (no dependencies)
│   │   └── StorageModule.ts # Persistence interface layer
│   │
│   ├── shared/           # Types, utilities, and constants
│   │   ├── types/        # TypeScript definitions
│   │   └── utils/        # Seeded pack generation, random utils
│   │
│   └── pages/api/        # Astro API endpoints
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

### **Draft Engine** ✅ (Core Layer)
- **Pure In-Memory Logic**: Event-sourced draft state with zero dependencies
- **Action Types**: CREATE_DRAFT, START_DRAFT, HUMAN_PICK, BOT_PICK, PASS_PACKS, ADVANCE_POSITION, START_ROUND, COMPLETE_DRAFT
- **Deterministic Logic**: Seeded pack generation using Linear Congruential Generator  
- **Self-Persisting**: Uses DraftStorageAdapter for automatic save/load

### **UI Layer** (Presentation Layer)
- **Nanostores**: Reactive UI state management
- **Direct Engine Access**: UI calls engine methods directly, no intermediary
- **Independent Persistence**: UIStorageAdapter for UI state (selected cards, preferences)
- **Components**: shadcn/ui + Tailwind CSS for consistent design
- **Framework**: Astro + React islands with TypeScript

### **Key Design Principles**
- **Dual Independence**: Each layer manages its own persistence completely
- **Direct Communication**: UI directly imports and calls Draft Engine
- **Storage Adapter Pattern**: Easy to swap backends (LocalStorage → IndexedDB → Server)
- **Event Sourcing in Engine Only**: Perfect reproducibility where it matters

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
- **State Management**: Draft engine (in-memory) + Storage module + UI state (nanostores + localStorage)
- **Data**: Scryfall API for card data and images
- **Testing**: Comprehensive test suite for core draft engine
- **Architecture**: Three-layer separation: UI (nanostores + localStorage) ↔ Storage Module ↔ Draft Engine (in-memory)

## **License**

MIT License - See LICENSE file for details