# Current Technical State - FlashDraft

## Progress: 11/13 Phase 1 tasks complete (85%)

## Working Implementation
✅ **Complete draft simulator running at http://localhost:4321/draft**
- Set selection (DTK/FIN available)
- 8-player draft setup with bots
- Pack display with card grid and statistics
- Card selection and pick tracking
- Clean hover cards showing card images and stats (like 17lands/Arena)

## Technical Stack
- **Astro** + React islands + TypeScript
- **Zustand** for state management
- **shadcn/ui** + Tailwind CSS for styling
- **Scryfall API** for card data and images

## Key Components
```
src/frontend/components/
├── DraftApp.tsx           # Main app with set selection
├── DraftInterface.tsx     # Draft flow management
├── PackDisplay.tsx        # Pack grid with sorting/filtering
├── Card.tsx              # Individual card display
├── CardImage.tsx         # Image handling with fallbacks
├── CardOverlay.tsx       # Selection states and overlays
├── CardTypeIndicators.tsx # Creature/land/spell dots
└── CardHoverDetails.tsx  # Clean hover popups (shadcn)
```

## Data Pipeline
```
scripts/download_scryfall_data.py → data/sets/ → API endpoints → React components
```
- **DTK**: 264 cards with full Scryfall data
- **FIN**: Complete set data
- **Images**: Cached from Scryfall with fallback text display

## Current Blocker
⚠️ **React preamble detection errors in development mode**
- Components use React.createElement to avoid JSX parsing issues
- Error moves between components (CardImage → CardOverlay → ...)
- Build succeeds, functionality works, but dev experience is degraded
- May need broader React configuration fix

## Next Immediate Tasks
1. **Resolve React preamble errors** (development experience)
2. **Download 17lands data** for better AI pick priorities
3. **Test complete draft flow** end-to-end

## Architecture Notes
- **Pack Generation**: Uses realistic booster distributions
- **Pick Priority**: Basic algorithm (rarity + type bonuses) awaiting 17lands upgrade
- **State Management**: Zustand store handles all draft state, player management, pack passing
- **Performance**: Image caching, memoized components, efficient re-renders

## File Structure
```
src/
├── frontend/           # React components and state
├── shared/            # Types and utilities
├── pages/api/         # Astro API endpoints
└── styles/           # Global CSS with Tailwind

data/sets/            # Downloaded MTG set data
scripts/              # Data acquisition tools
```

## Ready for Next Phase
✅ Foundation complete - ready to move to Phase 2 (Deck Building Interface)
⚠️ Would benefit from resolving React dev mode issues first

Last commit: `70e36fa` - "Replace card popup with clean shadcn HoverCard component"
Branch: `main`