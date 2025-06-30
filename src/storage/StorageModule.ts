/**
 * Storage Module - Abstract Persistence Interface
 * 
 * Bridge layer between UI and Draft Engine.
 * Handles all persistence operations (localStorage, URL state, future DB).
 */

import type { DraftState } from '../engine/DraftEngine';
import type { DraftAction } from '../engine/actions';

export interface DraftSummary {
  draftId: string;
  seed: string;
  setCode: string;
  status: 'created' | 'active' | 'completed';
  currentRound: number;
  currentPick: number;
  playerCount: number;
  humanPlayerIndex: number;
  lastModified: number;
  cardCount: number; // Total cards picked by human
}

export interface StorageBackend {
  // Draft persistence
  saveDraft(draft: DraftState): Promise<void>;
  loadDraft(draftId: string): Promise<DraftState | null>;
  deleteDraft(draftId: string): Promise<void>;
  
  // Draft listing
  listDrafts(): Promise<DraftSummary[]>;
  
  // Action history
  saveActions(draftId: string, actions: DraftAction[]): Promise<void>;
  loadActions(draftId: string): Promise<DraftAction[]>;
  
  // URL state sync
  saveURLState(draftId: string, round: number, pick: number): Promise<void>;
  loadURLState(): Promise<{ draftId: string; round: number; pick: number } | null>;
  
  // Storage management
  clearAll(): Promise<void>;
  getStorageSize(): Promise<number>;
}

export interface URLStateSync {
  // Navigate to draft position
  navigateToDraft(draftId: string, round?: number, pick?: number): void;
  
  // Parse current URL for draft state
  getCurrentDraftState(): { draftId?: string; round?: number; pick?: number } | null;
  
  // Listen for URL changes
  onURLChange(callback: (state: { draftId?: string; round?: number; pick?: number } | null) => void): () => void;
}

export interface SerializationOptions {
  compress: boolean;
  includeActions: boolean;
  includePackData: boolean;
}

export interface DraftSerializer {
  // Serialize draft state to string
  serialize(draft: DraftState, options?: Partial<SerializationOptions>): string;
  
  // Deserialize string to draft state
  deserialize(data: string): DraftState;
  
  // Estimate serialized size
  estimateSize(draft: DraftState): number;
  
  // Validate serialized data
  validate(data: string): boolean;
}

/**
 * Main storage module that coordinates between engine and UI
 */
export class StorageModule {
  constructor(
    private backend: StorageBackend,
    private urlSync: URLStateSync,
    private serializer: DraftSerializer
  ) {}

  // Draft operations
  async saveDraft(draft: DraftState): Promise<void> {
    await this.backend.saveDraft(draft);
    await this.backend.saveActions(draft.draftId, draft.actionHistory);
  }

  async loadDraft(draftId: string): Promise<DraftState | null> {
    return await this.backend.loadDraft(draftId);
  }

  async deleteDraft(draftId: string): Promise<void> {
    await this.backend.deleteDraft(draftId);
  }

  async listDrafts(): Promise<DraftSummary[]> {
    return await this.backend.listDrafts();
  }

  // URL navigation
  navigateToDraftPosition(draftId: string, round?: number, pick?: number): void {
    this.urlSync.navigateToDraft(draftId, round, pick);
  }

  getCurrentPosition(): { draftId?: string; round?: number; pick?: number } | null {
    return this.urlSync.getCurrentDraftState();
  }

  onPositionChange(callback: (state: { draftId?: string; round?: number; pick?: number } | null) => void): () => void {
    return this.urlSync.onURLChange(callback);
  }

  // State management
  async exportDraft(draftId: string, options?: Partial<SerializationOptions>): Promise<string> {
    const draft = await this.loadDraft(draftId);
    if (!draft) throw new Error(`Draft not found: ${draftId}`);
    
    return this.serializer.serialize(draft, options);
  }

  async importDraft(data: string): Promise<DraftState> {
    if (!this.serializer.validate(data)) {
      throw new Error('Invalid draft data');
    }
    
    const draft = this.serializer.deserialize(data);
    await this.saveDraft(draft);
    return draft;
  }

  // Storage utilities
  async getStorageInfo(): Promise<{ size: number; draftCount: number }> {
    const size = await this.backend.getStorageSize();
    const drafts = await this.backend.listDrafts();
    return { size, draftCount: drafts.length };
  }

  async clearAll(): Promise<void> {
    await this.backend.clearAll();
  }

  // Draft state synchronization
  async syncDraftToURL(draft: DraftState): Promise<void> {
    await this.backend.saveURLState(draft.draftId, draft.currentRound, draft.currentPick);
    this.urlSync.navigateToDraft(draft.draftId, draft.currentRound, draft.currentPick);
  }

  // Batch operations
  async saveDraftBatch(drafts: DraftState[]): Promise<void> {
    await Promise.all(drafts.map(draft => this.saveDraft(draft)));
  }

  async loadDraftBatch(draftIds: string[]): Promise<(DraftState | null)[]> {
    return await Promise.all(draftIds.map(id => this.loadDraft(id)));
  }

  // Action history operations
  async saveActionHistory(draftId: string, actions: DraftAction[]): Promise<void> {
    await this.backend.saveActions(draftId, actions);
  }

  async loadActionHistory(draftId: string): Promise<DraftAction[]> {
    return await this.backend.loadActions(draftId);
  }

  // Draft search and filtering
  async searchDrafts(query: {
    setCode?: string;
    status?: 'created' | 'active' | 'completed';
    minRound?: number;
    maxRound?: number;
  }): Promise<DraftSummary[]> {
    const allDrafts = await this.listDrafts();
    
    return allDrafts.filter(draft => {
      if (query.setCode && draft.setCode !== query.setCode) return false;
      if (query.status && draft.status !== query.status) return false;
      if (query.minRound && draft.currentRound < query.minRound) return false;
      if (query.maxRound && draft.currentRound > query.maxRound) return false;
      return true;
    });
  }
}