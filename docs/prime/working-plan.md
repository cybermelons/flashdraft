# Development Plan: FlashDraft MTG Draft Simulator

## Overview
Building an integrated Magic: The Gathering draft simulation and playtesting platform that enables unlimited practice with AI opponents trained on real 17lands data. The core workflow is: Draft → (Edit Deck → Playtest) Loop → New Draft

The goal is for someone without any set knowledge to learn to draft by playtesting their deck immediately against real decks.

## Approach
- **MVP-first**: Start with functional draft + basic playtest, then enhance AI
- **Data-driven bots**: Use 17lands datasets for realistic opponent behavior
- **Performance-focused**: <150ms transitions, keyboard shortcuts, snappy interactions
- **Goldfishing-oriented**: Interface is optimized for rapid iteration and goldfishing, to get a good "feel" of the pick process, and a feel for how it affects the deck
  - eg: mana curve distribution
  - creature count
  - card type distribution
- **Low barrier to exploration**: quick back-and-forth between deckbuild and playtest.

## Implementation Checklist

### Phase 1: Foundation & Real Data Setup (Weeks 1-2)
- [x] Set up development environment (Astro + Tailwind + shadcn/ui) ✓
- [x] Create data acquisition scripts for Scryfall API ✓
- [x] Download Final Fantasy (FIN) set data from Scryfall API ✓
- [x] Download Dragons of Tarkir (DTK) set data from Scryfall API ✓
- [x] Create MTG card data models and validation schemas ✓
- [x] Implement card image caching and optimization system ✓
- [x] Build pack generation using real set data and rarity distributions ✓
- [x] Create draft interface with real card display and selection ✓ (Note: Built complete draft interface with Pack Display, Card components, hover details using shadcn HoverCard)
- [x] Implement 8-player draft flow with pick tracking ✓ (Note: Full Zustand store with draft state, player management, pack passing logic)
- [x] Add draft state management (Zustand) with real card data ✓ (Note: Complete store with actions for picks, pack management, draft progression)
- [x] Test complete draft simulation end-to-end with real sets ✓ (Note: Working draft on localhost:4321/draft with DTK/FIN sets)
- [ ] Implement permalink URLs for draft state (like 17lands) - encode pack/pick/seat in URL
- [ ] Optimize draft interface for mobile devices - responsive grid, touch-friendly
- [ ] Fix hover cards to trigger on mouseover (not click) for desktop
- [ ] Download and process 17lands data for ACR and DTK formats (Next: Need to implement 17lands data pipeline for better AI)
- [ ] Create simple rule-based bots using actual card ratings from 17lands

### Phase 2: Deck Building & Analysis Interface (Weeks 2-3)
- [ ] Create deck building interface with card sorting and filtering
- [ ] Implement mana curve visualization (key for learning)
- [ ] Add deck statistics display (creature count, card types, etc.)
- [ ] Build visual feedback for deck composition insights
- [ ] Create quick deck validation (mana base, creature/spell balance)
- [ ] Add deckbuilding recommendations based on picked cards
- [ ] Implement draft-to-deckbuild transition (<150ms target)
- [ ] Test rapid iteration between draft picks and deck preview

### Phase 3: Goldfishing Playtest Interface (Weeks 3-4)
- [ ] Design streamlined goldfishing interface (no opponent interaction)
- [ ] Implement card draw simulation and opening hand analysis
- [ ] Add mana generation and curve testing functionality
- [ ] Create turn-by-turn play simulation for deck "feel"
- [ ] Build keyboard shortcuts for rapid goldfishing (space = draw, enter = next turn)
- [ ] Add quick deck performance metrics (avg turn for threats, mana efficiency)
- [ ] Implement seamless deckbuild ↔ playtest transitions
- [ ] Test complete learning loop: draft → build → goldfish → revise

### Phase 4: Enhanced AI & Data Pipeline (Weeks 4-5)
- [ ] Create 17lands data download and processing scripts
- [ ] Download and process 17lands draft data for ACR and DTK formats
- [ ] Implement feature engineering (card synergy, color signals, pack position)
- [ ] Train pairwise ranking models for bot decision making
- [ ] Create multiple bot personalities (Bronze, Gold, Mythic skill levels)
- [ ] Replace rule-based bots with ML-trained models
- [ ] Validate bot realism against human baselines (>70% pick agreement)
- [ ] Performance optimize bot decision speed (<1s per pick)
- [ ] Test bot behavior across different draft scenarios for both sets


## Technical Considerations

### Architecture Decisions
- **Frontend**: Astro + React islands + TypeScript for optimal performance ✓ (Implemented)
- **UI Components**: shadcn/ui + Tailwind for rapid, consistent interface development ✓ (Implemented with HoverCard component)
- **State Management**: Zustand for simplicity and snappy state updates ✓ (Implemented complete draft store)
- **Backend**: Astro endpoints https://docs.astro.build/en/guides/endpoints/ ✓ (API endpoints for sets working)
- **Data Storage**: JSON files for card data, pickle for trained models ✓ (Scryfall data cached as JSON)
- **ML Framework**: scikit-learn for pairwise ranking models (simple, effective) (Pending 17lands integration)

### Current Technical State
- **Components**: Card, CardImage, CardOverlay, CardTypeIndicators, PackDisplay, DraftInterface, DraftApp
- **Store**: Complete Zustand store with draft state, player management, pack passing, pick tracking
- **API**: Working endpoints at /api/sets and /api/sets/[setCode] serving DTK/FIN data
- **Styling**: Full Tailwind + shadcn/ui integration with proper CSS variables
- **Data**: Two complete MTG sets (DTK: 264 cards, FIN: sets) with images cached from Scryfall
- **Pack Generation**: Realistic rarity distributions (1 rare/mythic, 3 uncommons, 11 commons)
- **Pick Priority**: Basic algorithm (rarity + creature + removal bonuses) - needs 17lands data upgrade

### Key Challenges & Solutions
- **Bot Realism**: Use 17lands real pick data, validate against human baselines
- **Ultra-fast Transitions**: <150ms target requires optimized state management, minimal re-renders
- **Goldfishing UX**: Design for rapid iteration - keyboard shortcuts, visual feedback, instant deck stats
- **Learning Feedback Loop**: Visual cues that connect draft picks to deck performance patterns
- **Card Data**: Source from Scryfall API, cache locally, version appropriately
- **Draft State**: Immutable updates, clear action patterns, robust error handling
- **Deck Analysis**: Real-time mana curve and composition feedback without performance impact

### Dependencies & Risks
- **17lands Data Access**: Public datasets available, but format coverage varies
- **Card Image Rights**: Use Scryfall API with proper attribution
- **ML Training Time**: Initial model training should be <30 minutes on laptop
- **User Adoption**: Target existing Limited community through focused features

### Alternative Approaches Considered
- **Deep Learning vs. Pairwise Ranking**: Chose pairwise for interpretability and data efficiency
- **Real-time vs. Turn-based**: Chose turn-based for simplicity and focus on learning
- **Full Rules Engine vs. Manual**: Chose manual for faster development and flexibility

## Success Criteria
- [ ] Complete draft simulation in <5 minutes
- [ ] Draft ↔ deckbuild ↔ goldfish transitions in <150ms
- [ ] Bot pick agreement with humans >70%
- [ ] Goldfishing feels smooth and responsive (no lag)
- [ ] Clear visual feedback on deck composition and balance
- [ ] Learning loop enables rapid skill improvement through iteration
- [ ] Core functionality works reliably for 1-2 MTG formats
- [ ] Essential test coverage for stability
- [ ] Performance benchmarks met consistently

## Data Requirements
- [ ] **Final Fantasy (FIN)** set data from Scryfall API - Universes Beyond set with unique mechanics
- [ ] **Tarkir: Dragonstorm (TDM)** set data from Scryfall API - classic draft format with dragon tribal
- [ ] 17lands draft data for both ACR and DTK formats
- [ ] 17lands card ratings and pick data for realistic bot behavior
- [ ] Successful deck lists from 17lands for both formats
- [ ] Card images and mana symbols from Scryfall (with proper caching)
- [ ] Set booster pack compositions and rarity distributions

## Testing Strategy
- [ ] Unit tests for all business logic
- [ ] Integration tests for draft flow
- [ ] E2E tests for complete user journeys
- [ ] Performance testing for transitions
- [ ] Bot validation against held-out data
- [ ] User testing with MTG players

---

*This plan targets a focused 5-6 week development cycle for a core MVP that delivers the essential draft-to-goldfish learning loop.*
