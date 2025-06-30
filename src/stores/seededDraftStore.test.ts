/**
 * Tests for Seeded Draft Store
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock localStorage first
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

// Mock window object with localStorage
Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock,
    history: {
      replaceState: vi.fn()
    }
  },
  writable: true
});

// Also mock localStorage directly on globalThis
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Now import the modules
import { seededDraftActions, seededDraftStore, toLegacyDraftState } from './seededDraftStore';

// Mock set data
const createMockSetData = () => ({
  set_code: 'TEST',
  name: 'Test Set',
  cards: [
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `rare_${i}`,
      name: `Rare ${i}`,
      rarity: 'rare',
      mana_cost: '{4}',
      cmc: 4,
      colors: ['U'],
      booster: true,
      image_uris: { normal: `https://example.com/rare_${i}.jpg` }
    })),
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `uncommon_${i}`,
      name: `Uncommon ${i}`,
      rarity: 'uncommon',
      mana_cost: '{3}',
      cmc: 3,
      colors: ['G'],
      booster: true,
      image_uris: { normal: `https://example.com/uncommon_${i}.jpg` }
    })),
    ...Array.from({ length: 40 }, (_, i) => ({
      id: `common_${i}`,
      name: `Common ${i}`,
      rarity: 'common',
      mana_cost: '{2}',
      cmc: 2,
      colors: ['W'],
      booster: true,
      image_uris: { normal: `https://example.com/common_${i}.jpg` }
    }))
  ]
});

describe('seededDraftStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    seededDraftActions.reset();
    
    // Reset the mock store manually
    const mockStore: Record<string, string> = {};
    localStorageMock.getItem.mockImplementation((key: string) => mockStore[key] || null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      mockStore[key] = value;
    });
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete mockStore[key];
    });
  });

  describe('create and start', () => {
    test('creates and starts a new seeded draft', () => {
      const setData = createMockSetData();
      
      // Create draft
      const created = seededDraftActions.create(setData, 'test123');
      expect(created.seed).toBe('test123');
      expect(created.status).toBe('setup');
      expect(created.players).toHaveLength(8);
      expect(created.deltas).toHaveLength(0);
      
      // Check store was updated
      expect(seededDraftStore.get()).toBe(created);
      
      // Start draft
      const started = seededDraftActions.start();
      expect(started.status).toBe('active');
      expect(started.players.every(p => p.currentPack !== null)).toBe(true);
      
      // Check store was updated
      expect(seededDraftStore.get()).toBe(started);
    });
    
    test('creates draft with auto-generated seed if not provided', () => {
      const setData = createMockSetData();
      
      const created = seededDraftActions.create(setData);
      expect(created.seed).toBeDefined();
      expect(created.seed.length).toBeGreaterThan(0);
    });
    
    test('saves draft to storage on create and start', () => {
      const setData = createMockSetData();
      
      seededDraftActions.create(setData, 'save123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'flashdraft_seeded_save123',
        expect.any(String)
      );
      
      vi.clearAllMocks();
      
      seededDraftActions.start();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'flashdraft_seeded_save123',
        expect.any(String)
      );
    });
  });

  describe('pick', () => {
    test('processes human pick and creates delta', () => {
      const setData = createMockSetData();
      
      const created = seededDraftActions.create(setData, 'pick123');
      const started = seededDraftActions.start();
      
      const humanPlayer = started.players.find(p => p.isHuman)!;
      const firstCard = humanPlayer.currentPack!.cards[0];
      
      const updated = seededDraftActions.pick(firstCard.id);
      
      expect(updated.deltas).toHaveLength(1);
      expect(updated.deltas[0].pick).toBe(firstCard.id);
      expect(updated.deltas[0].player_id).toBe(humanPlayer.id);
      expect(updated.players.find(p => p.isHuman)!.pickedCards).toHaveLength(1);
    });
    
    test('throws error if no active draft', () => {
      expect(() => seededDraftActions.pick('card123')).toThrow('No active draft');
    });
    
    test('throws error if draft not active', () => {
      const setData = createMockSetData();
      seededDraftActions.create(setData, 'notactive123');
      
      expect(() => seededDraftActions.pick('card123')).toThrow('Draft must be active to make picks');
    });
  });

  describe('load', () => {
    test('loads existing draft from storage', async () => {
      const setData = createMockSetData();
      
      // Create and save a draft first
      const created = seededDraftActions.create(setData, 'load123');
      const started = seededDraftActions.start();
      
      // Clear store
      seededDraftActions.reset();
      expect(seededDraftStore.get()).toBeNull();
      
      // Load it back
      const loaded = await seededDraftActions.load('load123', setData);
      expect(loaded).not.toBeNull();
      expect(loaded!.seed).toBe('load123');
      expect(loaded!.status).toBe('active');
      expect(seededDraftStore.get()).toBe(loaded);
    });
    
    test('returns null for non-existent draft', async () => {
      const setData = createMockSetData();
      const result = await seededDraftActions.load('nonexistent', setData);
      expect(result).toBeNull();
    });
  });

  describe('navigateToPosition', () => {
    test('navigates to valid position', async () => {
      const setData = createMockSetData();
      
      const created = seededDraftActions.create(setData, 'nav123');
      const started = seededDraftActions.start();
      
      const result = await seededDraftActions.navigateToPosition('nav123', 1, 1);
      
      expect(result.success).toBe(true);
      const currentState = seededDraftStore.get();
      expect(currentState!.round).toBe(1);
      expect(currentState!.pick).toBe(1);
    });
    
    test('fails for invalid position', async () => {
      const setData = createMockSetData();
      
      seededDraftActions.create(setData, 'invalid123');
      seededDraftActions.start();
      
      const result = await seededDraftActions.navigateToPosition('invalid123', 0, 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid position');
    });
    
    test('fails when no setData provided and draft not in store', async () => {
      const result = await seededDraftActions.navigateToPosition('missing123', 1, 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Set data required');
    });
  });

  describe('utility actions', () => {
    test('reset clears the store', () => {
      const setData = createMockSetData();
      seededDraftActions.create(setData, 'reset123');
      
      expect(seededDraftStore.get()).not.toBeNull();
      
      seededDraftActions.reset();
      expect(seededDraftStore.get()).toBeNull();
    });
    
    test('exists checks draft existence', () => {
      const setData = createMockSetData();
      seededDraftActions.create(setData, 'exists123');
      
      expect(seededDraftActions.exists('exists123')).toBe(true);
      expect(seededDraftActions.exists('nonexistent')).toBe(false);
    });
    
    test('delete removes draft and clears store if current', () => {
      const setData = createMockSetData();
      seededDraftActions.create(setData, 'delete123');
      
      expect(seededDraftStore.get()).not.toBeNull();
      
      const result = seededDraftActions.delete('delete123');
      expect(result).toBe(true);
      expect(seededDraftStore.get()).toBeNull();
    });
    
    test('get returns current state', () => {
      const setData = createMockSetData();
      const created = seededDraftActions.create(setData, 'get123');
      
      expect(seededDraftActions.get()).toBe(created);
    });
  });

  describe('toLegacyDraftState', () => {
    test('converts seeded draft to legacy format', () => {
      const setData = createMockSetData();
      const created = seededDraftActions.create(setData, 'legacy123');
      const started = seededDraftActions.start();
      
      const legacy = toLegacyDraftState(started);
      
      expect(legacy.id).toBe('legacy123');
      expect(legacy.status).toBe('active');
      expect(legacy.round).toBe(1);
      expect(legacy.pick).toBe(1);
      expect(legacy.players).toBe(started.players);
      expect(legacy.seed).toBe('legacy123');
      expect(legacy.pickHistory).toEqual([]);
    });
    
    test('converts deltas to pickHistory', () => {
      const setData = createMockSetData();
      const created = seededDraftActions.create(setData, 'history123');
      const started = seededDraftActions.start();
      
      // Make a pick to create a delta
      const humanPlayer = started.players.find(p => p.isHuman)!;
      const firstCard = humanPlayer.currentPack!.cards[0];
      const updated = seededDraftActions.pick(firstCard.id);
      
      const legacy = toLegacyDraftState(updated);
      
      expect(legacy.pickHistory).toHaveLength(1);
      expect(legacy.pickHistory[0]).toEqual({
        playerId: humanPlayer.id,
        cardId: firstCard.id,
        packId: `pack-1-${humanPlayer.id}`,
        position: 1,
        timestamp: expect.any(Number)
      });
    });
  });
});