# Development Plan: Seed-Based Draft Engine with Delta Storage

## Overview
Redesign the draft engine to use a deterministic seed-based approach with delta storage for perfect position restoration and minimal storage footprint. This enables true time-travel through draft history and shareable/replayable drafts.

## Current Issues

- Cannot restore exact pack contents when navigating to past positions
- Storage-intensive approach that hits localStorage limits
- No way to perfectly recreate draft states
- Position navigation shows incomplete historical state

## Approach
1. **Deterministic Pack Generation**: Use seeded random number generator for consistent pack generation
2. **Delta Storage**: Store only the initial seed and each pick as a small delta
3. **State Replay**: Reconstruct any position by replaying deltas from seed
4. **Minimal Storage**: Only store seed + pick history, not full state

## Implementation Checklist

### Phase 1: Seeded Pack Generation
- [ ] **Implement SeededRandom class**: Deterministic random number generator
  - [ ] Create `src/shared/utils/seededRandom.ts`
  - [ ] Support for generating consistent random sequences
  - [ ] Methods for shuffle, pick random, etc.
- [ ] **Update pack generation**: Use SeededRandom for all randomness
  - [ ] Modify `generatePacks()` to accept seed
  - [ ] Generate all 24 packs upfront (8 players × 3 rounds)
  - [ ] Ensure pack contents are deterministic given same seed
  - [ ] Bot decisions also use same seed for consistency
- [ ] **Test determinism**: Verify same seed produces same packs
  - [ ] Unit tests for SeededRandom
  - [ ] Integration tests for pack generation
  - [ ] Verify bot behavior is deterministic

### Phase 2: Delta-Based Storage
- [ ] **Define delta structure**: Match 17lands granularity
  ```typescript
  interface DraftDelta {
    // Event info
    event_type: 'pick' | 'pass' | 'timeout';
    pack_number: number;   // 1-3
    pick_number: number;   // 1-15
    
    // Pick data
    pick: string;          // card name/id picked
    player_id: string;     // who made the pick
    
    // Context (for analysis)
    pool: string[];        // cards in pool before pick
    pack: string[];        // cards available in pack
    
    // Metadata
    timestamp: number;
    pick_time_ms?: number; // time to make pick
  }
  ```
- [ ] **Update DraftState**: Add seed and deltas array
  - [ ] Add `seed: string` field
  - [ ] Add `deltas: DraftDelta[]` field
  - [ ] Generate seed on draft creation
- [ ] **Modify pick processing**: Append deltas instead of full state updates
  - [ ] Update `processPick()` to create deltas
  - [ ] Store deltas in order of occurrence

### Phase 3: State Replay Engine
- [ ] **Implement replay function**: Reconstruct state from seed + deltas
  ```typescript
  function replayDraftToPosition(
    seed: string,
    setData: MTGSetData,
    deltas: DraftDelta[],
    targetPosition: number
  ): DraftState
  ```
- [ ] **Replay logic**:
  - [ ] Start with fresh draft from seed
  - [ ] Apply deltas up to target position
  - [ ] Return reconstructed state

### Phase 4: Storage Optimization
- [ ] **Lightweight persistence**: Store only essentials
  ```typescript
  interface StoredDraft {
    id: string;
    seed: string;
    setCode: string;
    deltas: DraftDelta[];
    createdAt: number;
  }
  ```
- [ ] **Update save/load functions**:
  - [ ] Save only seed + deltas to localStorage
  - [ ] Load and replay on demand
  - [ ] Migrate existing drafts if possible

### Phase 5: Enhanced Navigation
- [ ] **Perfect position restoration**: Show exact historical state
  - [ ] Restore exact pack contents at each position
  - [ ] Show correct picks for all players
  - [ ] Display accurate pack passing state
- [ ] **Navigation performance**: Instant position changes
  - [ ] Precompute adjacent positions
  - [ ] Progressive replay for distant positions
- [ ] **UI improvements**:
  - [ ] Show timeline visualization
  - [ ] Indicate current vs historical position
  - [ ] Add position slider for quick navigation

### Phase 6: Share & Export Features
- [ ] **Shareable URLs**: Use seed as draft ID
  - [ ] Format: `/draft/{seed}/p{round}p{pick}`
  - [ ] Seed serves as both ID and replay key
- [ ] **Export/Import**: Save and share draft files
  - [ ] Export as JSON with seed + deltas
  - [ ] Import to replay any draft
  - [ ] Share draft replays with others

## Technical Considerations

### Seeded Random Implementation
Use simple LCG (Linear Congruential Generator):
```typescript
class SeededRandom {
  private seed: number;
  
  constructor(seedString: string) {
    // Convert string seed to number
    this.seed = seedString.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
  }
  
  next(): number {
    // LCG algorithm: simple, fast, deterministic
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483647;
    return this.seed / 2147483647;
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
```

### Storage Comparison
- **Current**: ~40KB per draft (full state with cards)
- **New**: ~2-3KB per draft (seed + 45 deltas)
- **Savings**: 90%+ reduction in storage size

### Migration Strategy
Fresh start approach:
1. Keep old system as-is for existing drafts
2. New drafts use new engine
3. No migration - start clean
4. Old drafts remain accessible on old system

## Success Criteria
- [ ] Same seed always generates identical drafts
- [ ] Can navigate to any position with perfect restoration
- [ ] Shareable drafts work across different sessions

## Alternative Approaches Considered
1. **Full state snapshots**: Too storage-intensive
2. **Pack history arrays**: Still requires significant storage
3. **Compressed states**: Complexity without solving core issue
4. **Server-side storage**: Adds infrastructure requirements

---

*This redesign enables perfect draft replay with minimal storage, opening new possibilities for analysis, sharing, and learning from draft history.*

## Key Decisions
1. **Single seed for everything**: Bot decisions use same seed for full determinism
2. **Upfront pack generation**: All 24 packs generated at draft start
3. **URL format confirmed**: `/draft/{seed}/p{round}p{pick}` where seed is the draft ID
