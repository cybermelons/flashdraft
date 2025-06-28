/**
 * Draft Persistence Service
 * 
 * Bridges the engine's persistence layer with the frontend application.
 * Handles data migration, compatibility, and enhanced persistence features.
 */

import { DraftSession } from '../../engine/DraftSession';
import { 
  LocalStoragePersistence, 
  createLocalStoragePersistence,
  type DraftPersistence 
} from '../../engine/serialization/DraftSerializer';
import type { SerializedDraft } from '../../engine/types/core';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DraftMetadata {
  id: string;
  name?: string;
  setCode: string;
  playerCount: number;
  status: 'setup' | 'active' | 'complete';
  createdAt: number;
  updatedAt: number;
  currentRound: number;
  currentPick: number;
  totalPicks: number;
}

export interface DraftListItem extends DraftMetadata {
  thumbnail?: string; // Base64 thumbnail of current pack or deck
  progress: number; // 0-1 completion percentage
}

export interface PersistenceServiceOptions {
  enableAutoSave?: boolean;
  autoSaveInterval?: number;
  maxStoredDrafts?: number;
  compressionEnabled?: boolean;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class DraftPersistenceService {
  private persistence: DraftPersistence;
  private options: Required<PersistenceServiceOptions>;
  private autoSaveTimer: number | null = null;

  constructor(options: PersistenceServiceOptions = {}) {
    this.persistence = createLocalStoragePersistence();
    this.options = {
      enableAutoSave: options.enableAutoSave ?? true,
      autoSaveInterval: options.autoSaveInterval ?? 5000, // 5 seconds
      maxStoredDrafts: options.maxStoredDrafts ?? 50,
      compressionEnabled: options.compressionEnabled ?? false
    };
  }

  // ============================================================================
  // CORE PERSISTENCE METHODS
  // ============================================================================

  async saveDraft(session: DraftSession, metadata?: Partial<DraftMetadata>): Promise<boolean> {
    try {
      const serializedData = session.serialize();
      const success = await this.persistence.save(session.state.id, serializedData);
      
      if (success && metadata) {
        await this.saveMetadata(session.state.id, metadata);
      }
      
      // Cleanup old drafts if limit exceeded
      if (success) {
        await this.cleanupOldDrafts();
      }
      
      return success;
    } catch (error) {
      console.error('Failed to save draft:', error);
      return false;
    }
  }

  async loadDraft(draftId: string): Promise<DraftSession | null> {
    try {
      const serializedData = await this.persistence.load(draftId);
      if (!serializedData) {
        return null;
      }
      
      const deserializeResult = DraftSession.deserialize(serializedData);
      if (!deserializeResult.success) {
        console.error('Failed to deserialize draft:', deserializeResult.error);
        return null;
      }
      
      return deserializeResult.data;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  async deleteDraft(draftId: string): Promise<boolean> {
    try {
      const success = await this.persistence.delete(draftId);
      if (success) {
        await this.deleteMetadata(draftId);
      }
      return success;
    } catch (error) {
      console.error('Failed to delete draft:', error);
      return false;
    }
  }

  async listDrafts(): Promise<DraftListItem[]> {
    try {
      const draftIds = await this.persistence.list();
      const drafts: DraftListItem[] = [];
      
      for (const draftId of draftIds) {
        const session = await this.loadDraft(draftId);
        if (session) {
          const metadata = await this.loadMetadata(draftId);
          const listItem = this.createListItem(session, metadata);
          drafts.push(listItem);
        }
      }
      
      // Sort by most recent first
      return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Failed to list drafts:', error);
      return [];
    }
  }

  // ============================================================================
  // METADATA MANAGEMENT
  // ============================================================================

  private async saveMetadata(draftId: string, metadata: Partial<DraftMetadata>): Promise<void> {
    try {
      const key = `flashdraft_meta_${draftId}`;
      const existing = await this.loadMetadata(draftId);
      const updated = { ...existing, ...metadata };
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save metadata:', error);
    }
  }

  private async loadMetadata(draftId: string): Promise<Partial<DraftMetadata>> {
    try {
      const key = `flashdraft_meta_${draftId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('Failed to load metadata:', error);
      return {};
    }
  }

  private async deleteMetadata(draftId: string): Promise<void> {
    try {
      const key = `flashdraft_meta_${draftId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to delete metadata:', error);
    }
  }

  // ============================================================================
  // AUTO-SAVE FUNCTIONALITY
  // ============================================================================

  startAutoSave(session: DraftSession, onSave?: (success: boolean) => void): void {
    if (!this.options.enableAutoSave) return;
    
    this.stopAutoSave();
    
    this.autoSaveTimer = window.setInterval(async () => {
      try {
        const success = await this.saveDraft(session);
        onSave?.(success);
      } catch (error) {
        console.warn('Auto-save failed:', error);
        onSave?.(false);
      }
    }, this.options.autoSaveInterval);
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private createListItem(session: DraftSession, metadata: Partial<DraftMetadata>): DraftListItem {
    const state = session.state;
    const totalPicks = state.players.reduce((sum, player) => sum + player.pickedCards.length, 0);
    const maxPicks = state.players.length * 45; // 3 rounds * 15 picks per round
    const progress = Math.min(totalPicks / maxPicks, 1);
    
    return {
      id: state.id,
      name: metadata.name || `Draft ${state.config.setCode}`,
      setCode: state.config.setCode,
      playerCount: state.players.length,
      status: state.status,
      createdAt: metadata.createdAt || state.createdAt,
      updatedAt: metadata.updatedAt || state.updatedAt,
      currentRound: state.currentRound,
      currentPick: state.currentPick,
      totalPicks,
      progress,
      thumbnail: metadata.thumbnail
    };
  }

  private async cleanupOldDrafts(): Promise<void> {
    try {
      const drafts = await this.listDrafts();
      if (drafts.length <= this.options.maxStoredDrafts) {
        return;
      }
      
      // Remove oldest drafts beyond the limit
      const toDelete = drafts
        .sort((a, b) => a.updatedAt - b.updatedAt)
        .slice(0, drafts.length - this.options.maxStoredDrafts);
      
      for (const draft of toDelete) {
        await this.deleteDraft(draft.id);
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }

  // ============================================================================
  // MIGRATION AND COMPATIBILITY
  // ============================================================================

  async migrateLegacyData(): Promise<{ migrated: number; errors: number }> {
    let migrated = 0;
    let errors = 0;
    
    try {
      // Look for legacy draft data in localStorage
      const legacyKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('draft-') && !key.startsWith('flashdraft_')
      );
      
      for (const key of legacyKeys) {
        try {
          const legacyData = localStorage.getItem(key);
          if (!legacyData) continue;
          
          // Try to migrate legacy format
          const success = await this.migrateLegacyDraft(key, legacyData);
          if (success) {
            migrated++;
            localStorage.removeItem(key); // Remove legacy data
          } else {
            errors++;
          }
        } catch (error) {
          console.warn(`Failed to migrate ${key}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Migration process failed:', error);
    }
    
    return { migrated, errors };
  }

  private async migrateLegacyDraft(key: string, data: string): Promise<boolean> {
    try {
      // This would contain logic to convert old draft formats
      // to the new DraftSession format
      // For now, we'll just log that migration would happen here
      console.log(`Would migrate legacy draft: ${key}`);
      return false; // Skip actual migration for now
    } catch (error) {
      console.warn('Legacy draft migration failed:', error);
      return false;
    }
  }

  // ============================================================================
  // EXPORT/IMPORT FUNCTIONALITY
  // ============================================================================

  async exportDraft(draftId: string): Promise<string | null> {
    try {
      const session = await this.loadDraft(draftId);
      if (!session) return null;
      
      const metadata = await this.loadMetadata(draftId);
      
      const exportData = {
        version: '1.0',
        draft: session.serialize(),
        metadata,
        exportedAt: Date.now()
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Export failed:', error);
      return null;
    }
  }

  async importDraft(exportData: string): Promise<string | null> {
    try {
      const data = JSON.parse(exportData);
      
      // Validate import data structure
      if (!data.draft || !data.version) {
        throw new Error('Invalid export format');
      }
      
      // Load the session from the exported data
      const deserializeResult = DraftSession.deserialize(data.draft);
      if (!deserializeResult.success) {
        throw new Error('Failed to deserialize imported draft');
      }
      
      const session = deserializeResult.data;
      const newId = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create new session with new ID
      const newSession = DraftSession.create(session.state.config);
      
      // Replay actions from imported session
      for (const action of session.state.history) {
        const result = newSession.applyAction(action);
        if (!result.success) {
          throw new Error(`Failed to replay action: ${result.error.message}`);
        }
      }
      
      // Save with imported metadata
      await this.saveDraft(newSession, {
        ...data.metadata,
        name: `${data.metadata?.name || 'Imported Draft'} (imported)`
      });
      
      return newSession.state.id;
    } catch (error) {
      console.error('Import failed:', error);
      return null;
    }
  }
}

// ============================================================================
// SINGLETON SERVICE INSTANCE
// ============================================================================

let persistenceService: DraftPersistenceService | null = null;

export function getDraftPersistenceService(options?: PersistenceServiceOptions): DraftPersistenceService {
  if (!persistenceService) {
    persistenceService = new DraftPersistenceService(options);
  }
  return persistenceService;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export async function saveDraftSession(session: DraftSession, name?: string): Promise<boolean> {
  const service = getDraftPersistenceService();
  return service.saveDraft(session, { name, updatedAt: Date.now() });
}

export async function loadDraftSession(draftId: string): Promise<DraftSession | null> {
  const service = getDraftPersistenceService();
  return service.loadDraft(draftId);
}

export async function getDraftList(): Promise<DraftListItem[]> {
  const service = getDraftPersistenceService();
  return service.listDrafts();
}

export async function deleteDraftSession(draftId: string): Promise<boolean> {
  const service = getDraftPersistenceService();
  return service.deleteDraft(draftId);
}