/**
 * In-Memory Storage Adapter - For testing and development
 * 
 * Implements the DraftStorageAdapter interface using in-memory storage.
 * Perfect for unit tests and scenarios where persistence isn't needed.
 */

import type { DraftState } from '../DraftEngine';
import type { DraftAction } from '../actions';
import type { 
  DraftStorageAdapter, 
  DraftSummary, 
  StorageAudit,
  StorageError 
} from './DraftStorageAdapter';

export class InMemoryAdapter implements DraftStorageAdapter {
  private drafts: Map<string, DraftState> = new Map();
  private errorHandler?: (error: Error) => void;
  private auditData: StorageAudit = {
    totalDrafts: 0,
    totalSize: 0,
    oldestDraft: null,
    newestDraft: null,
    errors: [],
    lastError: null,
  };

  /**
   * Save a draft state
   */
  async saveDraft(draft: DraftState): Promise<void> {
    try {
      this.drafts.set(draft.draftId, draft);
      this.updateAudit();
    } catch (error) {
      this.handleError(error, 'saveDraft', draft.draftId);
      throw error;
    }
  }

  /**
   * Load a draft state
   */
  async loadDraft(draftId: string): Promise<DraftState | null> {
    try {
      return this.drafts.get(draftId) || null;
    } catch (error) {
      this.handleError(error, 'loadDraft', draftId);
      throw error;
    }
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    try {
      this.drafts.delete(draftId);
      this.updateAudit();
    } catch (error) {
      this.handleError(error, 'deleteDraft', draftId);
      throw error;
    }
  }

  /**
   * List all drafts
   */
  async listDrafts(): Promise<DraftSummary[]> {
    try {
      const summaries: DraftSummary[] = [];
      
      for (const [_, draft] of this.drafts) {
        summaries.push({
          draftId: draft.draftId,
          seed: draft.seed,
          setCode: draft.setCode,
          status: draft.status,
          currentRound: draft.currentRound,
          currentPick: draft.currentPick,
          playerCount: draft.playerCount,
          humanPlayerIndex: draft.humanPlayerIndex,
          lastModified: Date.now(), // In real implementation, track this
          cardCount: draft.playerDecks[draft.humanPlayerIndex]?.length || 0,
        });
      }
      
      // Sort by last modified (newest first)
      return summaries.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      this.handleError(error, 'listDrafts');
      return [];
    }
  }

  /**
   * Save individual actions (not used in memory adapter)
   */
  async saveActions(draftId: string, actions: DraftAction[]): Promise<void> {
    // Actions are stored within the draft state
    const draft = this.drafts.get(draftId);
    if (draft) {
      draft.actionHistory = actions;
      await this.saveDraft(draft);
    }
  }

  /**
   * Load actions (not used in memory adapter)
   */
  async loadActions(draftId: string): Promise<DraftAction[]> {
    const draft = this.drafts.get(draftId);
    return draft?.actionHistory || [];
  }

  /**
   * Get storage audit information
   */
  async getStorageAudit(): Promise<StorageAudit> {
    this.updateAudit();
    return this.auditData;
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    this.drafts.clear();
    this.updateAudit();
  }

  /**
   * Cleanup old drafts
   */
  async cleanup(options?: { maxAge?: number; maxDrafts?: number }): Promise<number> {
    // For in-memory adapter, we'll just limit by count
    if (options?.maxDrafts && this.drafts.size > options.maxDrafts) {
      const draftsArray = Array.from(this.drafts.entries());
      const toDelete = draftsArray.length - options.maxDrafts;
      
      // Delete oldest drafts (in a real implementation, track timestamps)
      for (let i = 0; i < toDelete; i++) {
        this.drafts.delete(draftsArray[i][0]);
      }
      
      this.updateAudit();
      return toDelete;
    }
    
    return 0;
  }

  /**
   * Set error handler
   */
  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  /**
   * Update audit information
   */
  private updateAudit(): void {
    this.auditData.totalDrafts = this.drafts.size;
    this.auditData.totalSize = this.calculateStorageUsage();
    
    if (this.drafts.size > 0) {
      const drafts = Array.from(this.drafts.values());
      // In a real implementation, track actual timestamps
      this.auditData.oldestDraft = drafts[0].draftId;
      this.auditData.newestDraft = drafts[drafts.length - 1].draftId;
    } else {
      this.auditData.oldestDraft = null;
      this.auditData.newestDraft = null;
    }
  }

  /**
   * Calculate approximate storage usage
   */
  private calculateStorageUsage(): number {
    let totalSize = 0;
    for (const draft of this.drafts.values()) {
      // Rough estimate of JSON size
      totalSize += JSON.stringify(draft).length;
    }
    return totalSize;
  }

  /**
   * Handle storage errors
   */
  private handleError(error: unknown, operation: string, draftId?: string): void {
    const storageError: StorageError = {
      type: 'UNKNOWN',
      timestamp: Date.now(),
      operation,
      details: error instanceof Error ? error.message : String(error),
    };
    
    this.auditData.errors.push(storageError);
    this.auditData.lastError = storageError;
    
    if (this.errorHandler) {
      this.errorHandler(new Error(`InMemoryAdapter ${operation} failed: ${storageError.details}`));
    }
  }

  /**
   * Get raw storage for testing
   */
  getRawStorage(): Map<string, DraftState> {
    return this.drafts;
  }
}