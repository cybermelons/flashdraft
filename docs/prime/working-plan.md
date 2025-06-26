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
- [x] Set up development environment (Astro + Tailwind + shadcn/ui)
- [x] Create data acquisition scripts for Scryfall API
- [x] Download Final Fantasy (FIN) set data from Scryfall API
- [x] Download Dragons of Tarkir (DTK) set data from Scryfall API
- [x] Create MTG card data models and validation schemas
- [ ] Implement card image caching and optimization system
- [ ] Build pack generation using real set data and rarity distributions
- [ ] Create draft interface with real card display and selection
- [ ] Download and process 17lands data for ACR and DTK formats
- [ ] Create simple rule-based bots using actual card ratings from 17lands
- [ ] Implement 8-player draft flow with pick tracking
- [ ] Add draft state management (Zustand) with real card data
- [ ] Test complete draft simulation end-to-end with real sets

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
- **Frontend**: Astro + React islands + TypeScript for optimal performance
- **UI Components**: shadcn/ui + Tailwind for rapid, consistent interface development
- **State Management**: Zustand for simplicity and snappy state updates
- **Backend**: Astro endpoints https://docs.astro.build/en/guides/endpoints/
- **Data Storage**: JSON files for card data, pickle for trained models
- **ML Framework**: scikit-learn for pairwise ranking models (simple, effective)

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
