# **FlashDraft - MTG Draft Simulator & Playtest Platform** ✨

## **Project Overview**

FlashDraft is a complete Magic: The Gathering draft simulation application that enables unlimited practice with AI opponents. Learn Limited formats through rapid iteration without the cost and time constraints of Arena or MTGO.

**🎯 Core Features**
- **Complete Draft Simulation**: 8-player drafts with intelligent AI bots (4 skill levels)
- **Real MTG Sets**: Final Fantasy and Dragons of Tarkir with full Scryfall integration
- **Professional Deck Analysis**: Mana curve, color distribution, card categorization
- **Instant Performance**: <150ms transitions, responsive mobile design
- **Persistent Sessions**: Draft IDs, localStorage auto-save, shareable permalinks
- **Modern Interface**: React + Astro + Tailwind CSS with shadcn/ui components

**Status**: 🚀 **Production Ready** - Fully functional application ready for MTG players!

## **Getting Started**

### Prerequisites
- Node.js 18+
- Python 3.9+
- pnpm (recommended package manager)

### Installation
```bash
# Clone the repository
git clone https://github.com/cybermelons/flashdraft.git
cd flashdraft

# Install frontend dependencies
pnpm install

# Install Python dependencies
pip install -r requirements.txt
```

### Development
```bash
# Start the development server
pnpm dev

# Run the draft bot training
python src/train_bots.py

# Run linting
pnpm lint

# Format code
pnpm format
```

## **🎮 How to Use**

1. **Start a Draft**: Visit `/draft` to see your draft overview or start a new draft
2. **Select a Set**: Choose from Final Fantasy (FIN) or Dragons of Tarkir (DTK)
3. **Draft Cards**: Pick cards from packs, AI bots will pick alongside you
4. **View Your Deck**: Click "📋 Deck" to see detailed deck analysis with mana curve
5. **Share Drafts**: Use the "🔗 Share" button to share permalink URLs
6. **Resume Anytime**: All drafts auto-save to localStorage with unique IDs

**🔗 Routing Examples**:
- `/draft` - Draft overview page
- `/draft/abc123` - Resume specific draft
- `/draft/abc123/p1p3` - Go to pack 1, pick 3 of a draft

## **Project Structure**

```
flashdraft/
├── src/                    # Source code
│   ├── frontend/          # React frontend application
│   │   ├── components/    # UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── stores/       # Zustand state management
│   │   └── utils/        # Utility functions
│   │
│   ├── backend/           # Python backend
│   │   ├── api/          # FastAPI routes
│   │   ├── models/       # ML models and training
│   │   ├── services/     # Business logic
│   │   └── utils/        # Backend utilities
│   │
│   └── shared/           # Shared types and constants
│
├── data/                 # Data directory
│   ├── raw/             # Raw 17lands data
│   ├── processed/       # Processed datasets
│   └── models/          # Trained model files
│
├── docs/                # Documentation
│   └── prime/           # Development plans and progress
│
├── tests/              # Test suites
│   ├── frontend/       # Frontend tests
│   └── backend/        # Backend tests
│
└── scripts/            # Utility scripts
```

## **Core Features**

### **Draft Simulation Engine**
- Realistic 8-player draft experience with human-like opponent behavior
- AI opponents trained on 17lands data with multiple skill levels
- Format-specific training (supports multiple MTG sets)
- Context-aware picking (deck state, color signals, pick position)

### **Digital Playmat Interface**
- Drag-and-drop card manipulation for rapid playtesting
- Quick opponent deck loading from 17lands successful builds
- Keyboard shortcuts for speed (optimized for goldfishing)
- Real-time mana curve and deck composition analysis

### **Integrated Learning Loop**
- Seamless transition: Draft → Deck Building → Playtesting → Iteration
- <150ms transitions between modes for rapid skill development
- Visual feedback connecting draft picks to deck performance
- Pattern recognition tools for accelerated learning

## **Development Commands**

| Command | Action |
|---------|--------|
| `pnpm dev` | Start development server at `localhost:4321` |
| `pnpm build` | Build production site to `./dist/` |
| `pnpm preview` | Preview production build locally |
| `pnpm lint` | Run ESLint on source code |
| `pnpm format` | Format code with Prettier |
| `python scripts/download_data.py` | Download 17lands data |
| `python scripts/train_models.py` | Train AI draft bots |

## **Technology Stack**

- **Frontend**: Astro + React islands + TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand for performance-optimized state
- **Backend**: Astro endpoints + Python FastAPI
- **ML**: scikit-learn for pairwise ranking models
- **Data**: 17lands datasets + Scryfall API for card data

## **License**

MIT License - See LICENSE file for details