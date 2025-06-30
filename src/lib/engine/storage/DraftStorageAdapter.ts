/**
 * Draft Storage Adapter - Abstract Interface for Engine Persistence
 * 
 * The engine uses this to persist its own state independently.
 * Implementations can be LocalStorage, IndexedDB, or Server-based.
 */

import type { DraftState } from '../DraftEngine/DraftEngine';
import type { DraftAction } from '../actions';
import type { DraftSummary, StorageAudit, StorageOptions } from './types';

export interface DraftStorageAdapter {
  // Core draft persistence
  saveDraft(draft: DraftState, options?: StorageOptions): Promise<void>;
  loadDraft(draftId: string): Promise<DraftState | null>;
  deleteDraft(draftId: string): Promise<void>;
  draftExists(draftId: string): Promise<boolean>;
  
  // Draft listing and management
  listDrafts(): Promise<DraftSummary[]>;
  getDraftSummary(draftId: string): Promise<DraftSummary | null>;
  
  // Action history (for replay)
  saveActions(draftId: string, actions: DraftAction[]): Promise<void>;
  loadActions(draftId: string): Promise<DraftAction[]>;
  appendAction(draftId: string, action: DraftAction): Promise<void>;
  
  // Storage management
  getStorageAudit(): Promise<StorageAudit>;
  cleanup(options?: { maxAge?: number; maxDrafts?: number }): Promise<number>; // returns count of deleted drafts
  clearAll(): Promise<void>;
  
  // Multi-tab sync
  onDraftChanged(callback: (draftId: string, draft: DraftState | null) => void): () => void;
  
  // Error handling
  onError(callback: (error: Error) => void): () => void;
}

export abstract class BaseDraftStorageAdapter implements DraftStorageAdapter {
  protected errorHandlers: ((error: Error) => void)[] = [];
  protected changeHandlers: ((draftId: string, draft: DraftState | null) => void)[] = [];

  abstract saveDraft(draft: DraftState, options?: StorageOptions): Promise<void>;
  abstract loadDraft(draftId: string): Promise<DraftState | null>;
  abstract deleteDraft(draftId: string): Promise<void>;
  abstract draftExists(draftId: string): Promise<boolean>;
  abstract listDrafts(): Promise<DraftSummary[]>;
  abstract saveActions(draftId: string, actions: DraftAction[]): Promise<void>;
  abstract loadActions(draftId: string): Promise<DraftAction[]>;
  abstract appendAction(draftId: string, action: DraftAction): Promise<void>;
  abstract getStorageAudit(): Promise<StorageAudit>;
  abstract cleanup(options?: { maxAge?: number; maxDrafts?: number }): Promise<number>;
  abstract clearAll(): Promise<void>;

  // Default implementations
  async getDraftSummary(draftId: string): Promise<DraftSummary | null> {
    const draft = await this.loadDraft(draftId);
    if (!draft) return null;
    
    return {
      draftId: draft.draftId,
      seed: draft.seed,
      setCode: draft.setCode,
      status: draft.status,
      currentRound: draft.currentRound,
      currentPick: draft.currentPick,
      playerCount: draft.playerCount,
      humanPlayerIndex: draft.humanPlayerIndex,
      lastModified: Date.now(),
      cardCount: draft.playerDecks[draft.humanPlayerIndex]?.length || 0,
    };
  }

  onDraftChanged(callback: (draftId: string, draft: DraftState | null) => void): () => void {
    this.changeHandlers.push(callback);
    return () => {
      const index = this.changeHandlers.indexOf(callback);
      if (index > -1) this.changeHandlers.splice(index, 1);
    };
  }

  onError(callback: (error: Error) => void): () => void {
    this.errorHandlers.push(callback);
    return () => {
      const index = this.errorHandlers.indexOf(callback);
      if (index > -1) this.errorHandlers.splice(index, 1);
    };
  }

  protected notifyDraftChanged(draftId: string, draft: DraftState | null): void {
    this.changeHandlers.forEach(handler => {
      try {
        handler(draftId, draft);
      } catch (error) {
        console.error('Error in draft change handler:', error);
      }
    });
  }

  protected notifyError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });
  }
}