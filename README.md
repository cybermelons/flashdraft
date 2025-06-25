# **FlashDraft - MTG Draft Simulator & Playtest Platform**

## **Project Overview**

FlashDraft is an integrated Magic: The Gathering draft simulation and playtesting application that enables players to rapidly iterate through draft scenarios without the time and cost constraints of Arena. The platform combines AI-powered draft opponents trained on real player data with a streamlined digital playmat for immediate deck testing.

**Core Value Proposition**: Transform draft learning from expensive, slow iterations (Arena gems + queue times) to unlimited, rapid practice cycles that accelerate skill development.

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