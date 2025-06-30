/**
 * Tests for Seeded Draft Storage
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock localStorage first, before importing the module
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
    localStorage: localStorageMock
  },
  writable: true
});

// Also mock localStorage directly on globalThis
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Now import the modules
import {
  saveSeededDraft,
  loadSeededDraftWithSetData,
  getDraftMetadataList,
  draftExists,
  deleteSeededDraft,
  cleanupOldDrafts,
  getStorageStats,
  exportDraft,
  importDraft
} from './seededDraftStorage';
import { createSeededDraft, startSeededDraft } from './draftReplayEngine';
import { createDraftDelta } from '../types/draftDelta';

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

describe('seededDraftStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    
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

  describe('saveSeededDraft', () => {
    test('saves draft with minimal data', () => {
      const setData = createMockSetData();
      const draft = createSeededDraft({ seed: 'save123', setData });
      const startedDraft = startSeededDraft(draft);

      const result = saveSeededDraft(startedDraft);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'flashdraft_seeded_save123',
        expect.any(String)
      );

      // Verify the saved data is minimal
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toEqual({
        id: 'save123',
        seed: 'save123',
        set_code: 'TEST',
        set_name: 'Test Set',
        created_at: expect.any(Number),
        player_count: 8,
        round_count: 3,
        deltas: [],
        status: 'active',
        current_pick: 0
      });
    });

    test('saves draft with deltas', () => {
      const setData = createMockSetData();
      const draft = createSeededDraft({ seed: 'withdelta123', setData });
      const startedDraft = startSeededDraft(draft);

      // Add a delta
      const humanPlayer = startedDraft.players.find(p => p.isHuman)!;
      const firstCard = humanPlayer.currentPack!.cards[0];
      const delta = createDraftDelta('pick', 1, 1, 1, firstCard.id, humanPlayer.id);
      const draftWithDelta = { ...startedDraft, deltas: [delta] };

      const result = saveSeededDraft(draftWithDelta);

      expect(result).toBe(true);
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.deltas).toHaveLength(1);
      expect(savedData.deltas[0]).toEqual({
        event_type: 'pick',
        pack_number: 1,
        pick_number: 1,
        pick: firstCard.id,
        player_id: humanPlayer.id,
        timestamp: delta.timestamp,
        pick_time_ms: delta.pick_time_ms
      });
    });

    test('handles QuotaExceededError with cleanup', () => {
      const setData = createMockSetData();
      const draft = createSeededDraft({ seed: 'quota123', setData });

      // Setup old drafts first
      const oldMetadata = [
        { id: 'old1', created_at: Date.now() - 86400000, set_code: 'OLD', set_name: 'Old Set', status: 'complete' as const, pick_count: 45 },
        { id: 'old2', created_at: Date.now() - 172800000, set_code: 'OLD', set_name: 'Old Set', status: 'complete' as const, pick_count: 45 }
      ];
      
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        if (key === 'flashdraft_seeded_metadata') {
          return;
        }
        if (key === 'flashdraft_seeded_quota123' && localStorageMock.setItem.mock.calls.length === 1) {
          // First attempt throws quota error
          const quotaError = new Error('QuotaExceededError');
          quotaError.name = 'QuotaExceededError';
          throw quotaError;
        }
        // Second attempt succeeds
        return;
      });
      
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'flashdraft_seeded_metadata') {
          return JSON.stringify(oldMetadata);
        }
        return null;
      });

      const result = saveSeededDraft(draft);

      // Should retry and succeed
      expect(result).toBe(true);
    });

    test('returns false on persistent error', () => {
      const setData = createMockSetData();
      const draft = createSeededDraft({ seed: 'error123', setData });

      // Mock persistent error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Persistent error');
      });

      const result = saveSeededDraft(draft);

      expect(result).toBe(false);
    });
  });

  describe('loadSeededDraftWithSetData', () => {
    test('loads and replays draft successfully', async () => {
      const setData = createMockSetData();
      const originalDraft = createSeededDraft({ seed: 'load123', setData });
      const startedDraft = startSeededDraft(originalDraft);

      // Save the draft first
      saveSeededDraft(startedDraft);

      // Load it back
      const loadedDraft = await loadSeededDraftWithSetData('load123', setData);

      expect(loadedDraft).not.toBeNull();
      expect(loadedDraft!.seed).toBe('load123');
      expect(loadedDraft!.status).toBe('active');
      expect(loadedDraft!.players).toHaveLength(8);
    });

    test('loads draft with deltas and replays correctly', async () => {
      const setData = createMockSetData();
      const draft = createSeededDraft({ seed: 'loadwithdeltas123', setData });
      const startedDraft = startSeededDraft(draft);

      // Add a delta
      const humanPlayer = startedDraft.players.find(p => p.isHuman)!;
      const firstCard = humanPlayer.currentPack!.cards[0];
      const delta = createDraftDelta('pick', 1, 1, 1, firstCard.id, humanPlayer.id);
      const draftWithDelta = { ...startedDraft, deltas: [delta] };

      // Save the draft
      saveSeededDraft(draftWithDelta);

      // Load it back
      const loadedDraft = await loadSeededDraftWithSetData('loadwithdeltas123', setData);

      expect(loadedDraft).not.toBeNull();
      expect(loadedDraft!.deltas).toHaveLength(1);
      expect(loadedDraft!.players.find(p => p.isHuman)!.pickedCards).toHaveLength(1);
    });

    test('returns null for non-existent draft', async () => {
      const setData = createMockSetData();
      const result = await loadSeededDraftWithSetData('nonexistent', setData);

      expect(result).toBeNull();
    });

    test('returns null on parse error', async () => {
      const setData = createMockSetData();
      
      // Set invalid JSON
      localStorageMock.setItem('flashdraft_seeded_invalid', 'invalid json');

      const result = await loadSeededDraftWithSetData('invalid', setData);

      expect(result).toBeNull();
    });
  });

  describe('getDraftMetadataList', () => {
    test('returns empty array when no metadata exists', () => {
      const result = getDraftMetadataList();
      expect(result).toEqual([]);
    });

    test('returns parsed metadata list', () => {
      const metadata = [
        { id: 'draft1', created_at: Date.now(), set_code: 'TEST', set_name: 'Test Set', status: 'active' as const, pick_count: 5 },
        { id: 'draft2', created_at: Date.now() - 1000, set_code: 'TEST', set_name: 'Test Set', status: 'complete' as const, pick_count: 45 }
      ];

      localStorageMock.setItem('flashdraft_seeded_metadata', JSON.stringify(metadata));

      const result = getDraftMetadataList();
      expect(result).toEqual(metadata);
    });

    test('returns empty array on parse error', () => {
      localStorageMock.setItem('flashdraft_seeded_metadata', 'invalid json');

      const result = getDraftMetadataList();
      expect(result).toEqual([]);
    });
  });

  describe('draftExists', () => {
    test('returns true when draft exists', () => {
      localStorageMock.setItem('flashdraft_seeded_exists123', 'some data');

      const result = draftExists('exists123');
      expect(result).toBe(true);
    });

    test('returns false when draft does not exist', () => {
      const result = draftExists('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('deleteSeededDraft', () => {
    test('deletes draft and updates metadata', () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      // Create fresh mock store
      const mockStore: Record<string, string> = {};
      const initialMetadata = [
        { id: 'delete123', created_at: Date.now(), set_code: 'TEST', set_name: 'Test', status: 'active' as const, pick_count: 5 },
        { id: 'keep456', created_at: Date.now() - 1000, set_code: 'TEST', set_name: 'Test', status: 'complete' as const, pick_count: 45 }
      ];
      
      // Setup initial data
      mockStore['flashdraft_seeded_delete123'] = 'draft data';
      mockStore['flashdraft_seeded_metadata'] = JSON.stringify(initialMetadata);
      
      localStorageMock.getItem.mockImplementation((key: string) => mockStore[key] || null);
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        mockStore[key] = value;
      });
      localStorageMock.removeItem.mockImplementation((key: string) => {
        delete mockStore[key];
      });

      const result = deleteSeededDraft('delete123');

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('flashdraft_seeded_delete123');

      // Check updated metadata directly from mockStore
      const updatedMetadata = JSON.parse(mockStore['flashdraft_seeded_metadata']);
      expect(updatedMetadata).toHaveLength(1);
      expect(updatedMetadata[0].id).toBe('keep456');
    });

    test('returns false on error', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Remove error');
      });

      const result = deleteSeededDraft('error123');
      expect(result).toBe(false);
    });
  });

  describe('cleanupOldDrafts', () => {
    test('keeps 5 most recent drafts', () => {
      const now = Date.now();
      const metadata = Array.from({ length: 8 }, (_, i) => ({
        id: `draft${i}`,
        created_at: now - (i * 1000),
        set_code: 'TEST',
        set_name: 'Test',
        status: 'complete' as const,
        pick_count: 45
      }));

      localStorageMock.setItem('flashdraft_seeded_metadata', JSON.stringify(metadata));

      // Setup draft storage for each
      metadata.forEach(draft => {
        localStorageMock.setItem(`flashdraft_seeded_${draft.id}`, 'draft data');
      });

      const deletedCount = cleanupOldDrafts();

      expect(deletedCount).toBe(3); // 8 - 5 = 3 deleted
      
      // Check that the 3 oldest were deleted
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('flashdraft_seeded_draft5');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('flashdraft_seeded_draft6');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('flashdraft_seeded_draft7');
    });

    test('returns 0 when cleanup fails', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Cleanup error');
      });

      const result = cleanupOldDrafts();
      expect(result).toBe(0);
    });
  });

  describe('getStorageStats', () => {
    test('calculates storage statistics correctly', () => {
      const now = Date.now();
      const metadata = [
        { id: 'draft1', created_at: now, set_code: 'TEST', set_name: 'Test', status: 'active' as const, pick_count: 5 },
        { id: 'draft2', created_at: now - 86400000, set_code: 'TEST', set_name: 'Test', status: 'complete' as const, pick_count: 45 }
      ];

      localStorageMock.setItem('flashdraft_seeded_metadata', JSON.stringify(metadata));
      localStorageMock.setItem('flashdraft_seeded_draft1', 'a'.repeat(1000)); // 1KB
      localStorageMock.setItem('flashdraft_seeded_draft2', 'b'.repeat(2000)); // 2KB

      const stats = getStorageStats();

      expect(stats.totalDrafts).toBe(2);
      expect(stats.totalSize).toBe(3000);
      expect(stats.averageSize).toBe(1500);
      expect(stats.oldestDraft).toEqual(new Date(now - 86400000));
      expect(stats.newestDraft).toEqual(new Date(now));
    });

    test('handles empty storage', () => {
      const stats = getStorageStats();

      expect(stats.totalDrafts).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageSize).toBe(0);
      expect(stats.oldestDraft).toBeUndefined();
      expect(stats.newestDraft).toBeUndefined();
    });
  });

  describe('exportDraft', () => {
    test('exports draft as JSON', () => {
      const draftData = {
        id: 'export123',
        seed: 'export123',
        set_code: 'TEST',
        deltas: []
      };

      localStorageMock.setItem('flashdraft_seeded_export123', JSON.stringify(draftData));

      const exported = exportDraft('export123');

      expect(exported).not.toBeNull();
      const parsedExport = JSON.parse(exported!);
      expect(parsedExport.version).toBe('1.0');
      expect(parsedExport.exported_at).toBeTypeOf('number');
      expect(parsedExport.draft).toEqual(draftData);
    });

    test('returns null for non-existent draft', () => {
      const result = exportDraft('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('importDraft', () => {
    test('imports draft successfully', () => {
      const exportData = {
        version: '1.0',
        exported_at: Date.now(),
        draft: {
          id: 'import123',
          seed: 'import123',
          set_code: 'TEST',
          set_name: 'Test Set',
          created_at: Date.now(),
          deltas: [],
          status: 'complete',
          current_pick: 45
        }
      };

      const result = importDraft(JSON.stringify(exportData));

      expect(result).toBe('import123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'flashdraft_seeded_import123',
        JSON.stringify(exportData.draft)
      );
    });

    test('rejects invalid JSON', () => {
      const result = importDraft('invalid json');
      expect(result).toBeNull();
    });

    test('rejects invalid draft format', () => {
      const invalidData = {
        version: '1.0',
        draft: { invalid: true }
      };

      const result = importDraft(JSON.stringify(invalidData));
      expect(result).toBeNull();
    });

    test('rejects existing draft', () => {
      localStorageMock.setItem('flashdraft_seeded_existing123', 'existing data');

      const exportData = {
        version: '1.0',
        draft: {
          seed: 'existing123',
          set_code: 'TEST'
        }
      };

      const result = importDraft(JSON.stringify(exportData));
      expect(result).toBeNull();
    });
  });
});