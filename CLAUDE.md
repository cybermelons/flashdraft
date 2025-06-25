# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlashDraft is an MTG (Magic: The Gathering) draft simulator and playtesting platform built with Astro, React, and Python. The core workflow is: Draft → Deck Building → Goldfishing → Iteration. The platform combines AI-powered draft opponents trained on 17lands data with a streamlined digital playmat for rapid deck testing and learning.

## Development Commands

### Frontend Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Code quality
npm run lint
npm run format
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
npm install && pip install -r requirements.txt
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
npm test

# Watch mode for development
npm run test:watch
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