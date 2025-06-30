/**
 * LocalStorage Implementation of Draft Storage Adapter
 * 
 * Provides persistent draft storage using browser localStorage with:
 * - Error handling and quota monitoring
 * - Multi-tab synchronization
 * - Storage audit and cleanup
 * - Compression support
 */

import type { DraftState } from '../DraftEngine';
import type { DraftAction } from '../actions';
import type { DraftSummary, StorageError, StorageAudit, StorageOptions } from './types';
import { BaseDraftStorageAdapter } from './DraftStorageAdapter';

export class LocalStorageAdapter extends BaseDraftStorageAdapter {
  private static readonly DRAFT_KEY_PREFIX = 'flashdraft_draft_';
  private static readonly ACTIONS_KEY_PREFIX = 'flashdraft_actions_';
  private static readonly METADATA_KEY = 'flashdraft_metadata';
  private static readonly AUDIT_KEY = 'flashdraft_audit';
  
  private auditData: StorageAudit;
  private storageEventHandler?: (event: StorageEvent) => void;

  constructor() {
    super();
    this.auditData = this.initializeAudit();
    this.setupStorageEventListener();
    
    // Perform initial audit
    this.updateAudit().catch(error => 
      this.notifyError(new Error(`Failed to initialize storage audit: ${error.message}`))
    );
  }

  async saveDraft(draft: DraftState, options: StorageOptions = {}): Promise<void> {
    const draftKey = this.getDraftKey(draft.draftId);
    
    try {
      // Prepare data for storage
      const draftData = {
        ...draft,
        lastModified: Date.now(),
      };

      // Optionally include action history in draft data
      if (options.includeActions && draft.actionHistory) {
        draftData.actionHistory = draft.actionHistory;
      } else {
        // Remove action history from draft data to save space
        delete (draftData as any).actionHistory;
      }

      const serialized = this.serialize(draftData, options.compress);
      
      // Check storage quota before saving
      await this.checkStorageQuota(serialized.length);
      
      // Save draft
      localStorage.setItem(draftKey, serialized);
      
      // Save actions separately if not included in draft
      if (!options.includeActions && draft.actionHistory) {
        await this.saveActions(draft.draftId, draft.actionHistory);
      }

      // Update metadata
      await this.updateDraftMetadata(draft.draftId, {
        lastModified: Date.now(),
        size: serialized.length,
        compressed: options.compress || false,
      });

      // Update audit
      await this.updateAudit();
      
      // Notify other tabs
      this.notifyDraftChanged(draft.draftId, draft);
      
    } catch (error) {
      const storageError: StorageError = {
        type: this.getErrorType(error),
        timestamp: Date.now(),
        operation: 'saveDraft',
        details: error instanceof Error ? error.message : String(error),
        size: this.serialize(draft).length,
        recoveryAction: 'Try clearing old drafts or reducing data size',
      };
      
      this.auditData.errors.push(storageError);
      this.auditData.lastError = storageError;
      this.notifyError(new Error(`Failed to save draft ${draft.draftId}: ${storageError.details}`));
      throw error;
    }
  }

  async loadDraft(draftId: string): Promise<DraftState | null> {
    const draftKey = this.getDraftKey(draftId);
    
    try {
      const serialized = localStorage.getItem(draftKey);
      if (!serialized) return null;

      const draft = this.deserialize<DraftState>(serialized);
      
      // Load action history if not included in draft data
      if (!draft.actionHistory) {
        const actions = await this.loadActions(draftId);
        draft.actionHistory = actions;
      }

      return draft;
      
    } catch (error) {
      const storageError: StorageError = {
        type: 'CORRUPTION',
        timestamp: Date.now(),
        operation: 'loadDraft',
        details: error instanceof Error ? error.message : String(error),
        recoveryAction: 'Delete corrupted draft data',
      };
      
      this.auditData.errors.push(storageError);
      this.auditData.lastError = storageError;
      this.notifyError(new Error(`Failed to load draft ${draftId}: ${storageError.details}`));
      
      // Attempt recovery by deleting corrupted data
      try {
        await this.deleteDraft(draftId);
      } catch (deleteError) {
        console.warn('Failed to delete corrupted draft:', deleteError);
      }
      
      return null;
    }
  }

  async deleteDraft(draftId: string): Promise<void> {
    const draftKey = this.getDraftKey(draftId);
    const actionsKey = this.getActionsKey(draftId);
    
    try {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(actionsKey);
      
      // Update metadata
      await this.removeDraftMetadata(draftId);
      
      // Update audit
      await this.updateAudit();
      
      // Notify other tabs
      this.notifyDraftChanged(draftId, null);
      
    } catch (error) {
      this.notifyError(new Error(`Failed to delete draft ${draftId}: ${error}`));
      throw error;
    }
  }

  async draftExists(draftId: string): Promise<boolean> {
    const draftKey = this.getDraftKey(draftId);
    return localStorage.getItem(draftKey) !== null;
  }

  async listDrafts(): Promise<DraftSummary[]> {
    try {
      const metadata = this.getMetadata();
      const summaries: DraftSummary[] = [];
      
      for (const [draftId, meta] of Object.entries(metadata.drafts)) {
        const draft = await this.loadDraft(draftId);
        if (draft) {
          summaries.push({
            draftId: draft.draftId,
            seed: draft.seed,
            setCode: draft.setCode,
            status: draft.status,
            currentRound: draft.currentRound,
            currentPick: draft.currentPick,
            playerCount: draft.playerCount,
            humanPlayerIndex: draft.humanPlayerIndex,
            lastModified: meta.lastModified,
            cardCount: draft.playerDecks[draft.humanPlayerIndex]?.length || 0,
          });
        }
      }
      
      // Sort by last modified, newest first
      return summaries.sort((a, b) => b.lastModified - a.lastModified);
      
    } catch (error) {
      this.notifyError(new Error(`Failed to list drafts: ${error}`));
      return [];
    }
  }

  async saveActions(draftId: string, actions: DraftAction[]): Promise<void> {
    const actionsKey = this.getActionsKey(draftId);
    
    try {
      const serialized = this.serialize(actions, true); // Always compress actions
      localStorage.setItem(actionsKey, serialized);
      
      // Update audit
      await this.updateAudit();
      
    } catch (error) {
      this.notifyError(new Error(`Failed to save actions for draft ${draftId}: ${error}`));
      throw error;
    }
  }

  async loadActions(draftId: string): Promise<DraftAction[]> {
    const actionsKey = this.getActionsKey(draftId);
    
    try {
      const serialized = localStorage.getItem(actionsKey);
      if (!serialized) return [];
      
      return this.deserialize<DraftAction[]>(serialized);
      
    } catch (error) {
      console.warn(`Corrupted actions data for draft ${draftId}, clearing...`);
      // Clear corrupted data
      localStorage.removeItem(actionsKey);
      this.notifyError(new Error(`Failed to load actions for draft ${draftId}: ${error}`));
      return [];
    }
  }

  async appendAction(draftId: string, action: DraftAction): Promise<void> {
    try {
      const existingActions = await this.loadActions(draftId);
      existingActions.push(action);
      await this.saveActions(draftId, existingActions);
      
    } catch (error) {
      this.notifyError(new Error(`Failed to append action to draft ${draftId}: ${error}`));
      throw error;
    }
  }

  async getStorageAudit(): Promise<StorageAudit> {
    await this.updateAudit();
    return { ...this.auditData };
  }

  async cleanup(options: { maxAge?: number; maxDrafts?: number } = {}): Promise<number> {
    try {
      const summaries = await this.listDrafts();
      const now = Date.now();
      const maxAge = options.maxAge || (30 * 24 * 60 * 60 * 1000); // 30 days default
      const maxDrafts = options.maxDrafts || 50; // 50 drafts default
      
      let deletedCount = 0;
      
      // Delete old drafts
      for (const summary of summaries) {
        if (now - summary.lastModified > maxAge) {
          await this.deleteDraft(summary.draftId);
          deletedCount++;
        }
      }
      
      // Delete excess drafts (keep newest)
      const remainingSummaries = summaries.slice(deletedCount);
      if (remainingSummaries.length > maxDrafts) {
        const excessDrafts = remainingSummaries.slice(maxDrafts);
        for (const summary of excessDrafts) {
          await this.deleteDraft(summary.draftId);
          deletedCount++;
        }
      }
      
      await this.updateAudit();
      return deletedCount;
      
    } catch (error) {
      this.notifyError(new Error(`Failed to cleanup storage: ${error}`));
      return 0;
    }
  }

  async clearAll(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const flashdraftKeys = keys.filter(key => 
        key.startsWith(LocalStorageAdapter.DRAFT_KEY_PREFIX) ||
        key.startsWith(LocalStorageAdapter.ACTIONS_KEY_PREFIX) ||
        key === LocalStorageAdapter.METADATA_KEY ||
        key === LocalStorageAdapter.AUDIT_KEY
      );
      
      for (const key of flashdraftKeys) {
        localStorage.removeItem(key);
      }
      
      // Reset audit
      this.auditData = this.initializeAudit();
      
    } catch (error) {
      this.notifyError(new Error(`Failed to clear all storage: ${error}`));
      throw error;
    }
  }

  // Private helper methods

  private getDraftKey(draftId: string): string {
    return `${LocalStorageAdapter.DRAFT_KEY_PREFIX}${draftId}`;
  }

  private getActionsKey(draftId: string): string {
    return `${LocalStorageAdapter.ACTIONS_KEY_PREFIX}${draftId}`;
  }

  private serialize(data: any, compress = false): string {
    const json = JSON.stringify(data);
    
    if (compress) {
      // Simple compression: remove whitespace and common patterns
      return json
        .replace(/\s+/g, '')
        .replace(/"([^"]+)":/g, '$1:')
        .replace(/,"/g, ',"');
    }
    
    return json;
  }

  private deserialize<T>(serialized: string): T {
    try {
      return JSON.parse(serialized);
    } catch (error) {
      // Log the corrupted data for debugging
      console.warn('Corrupted data found in localStorage:', {
        serializedLength: serialized.length,
        firstChars: serialized.slice(0, 20),
        error: error
      });
      throw new Error(`Failed to deserialize data: ${error}`);
    }
  }

  private async checkStorageQuota(dataSize: number): Promise<void> {
    try {
      // Estimate current storage usage
      const usage = this.calculateStorageUsage();
      const availableSpace = this.getAvailableSpace();
      
      if (dataSize > availableSpace) {
        throw new Error(`Insufficient storage space. Need ${dataSize} bytes, available ${availableSpace} bytes`);
      }
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota')) {
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  }

  private calculateStorageUsage(): number {
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isFlashDraftKey(key)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    
    return totalSize;
  }

  private getAvailableSpace(): number {
    // Rough estimate: localStorage typically has 5-10MB limit
    const estimatedLimit = 10 * 1024 * 1024; // 10MB
    const currentUsage = this.calculateStorageUsage();
    return Math.max(0, estimatedLimit - currentUsage);
  }

  private isFlashDraftKey(key: string): boolean {
    return key.startsWith(LocalStorageAdapter.DRAFT_KEY_PREFIX) ||
           key.startsWith(LocalStorageAdapter.ACTIONS_KEY_PREFIX) ||
           key === LocalStorageAdapter.METADATA_KEY ||
           key === LocalStorageAdapter.AUDIT_KEY;
  }

  private getErrorType(error: any): StorageError['type'] {
    if (error instanceof Error) {
      if (error.message.includes('quota')) return 'QUOTA_EXCEEDED';
      if (error.message.includes('access')) return 'ACCESS_DENIED';
      if (error.message.includes('parse') || error.message.includes('deserialize')) return 'CORRUPTION';
    }
    return 'UNKNOWN';
  }

  private initializeAudit(): StorageAudit {
    return {
      totalSize: 0,
      draftCount: 0,
      uiStateSize: 0,
      freeSpace: 0,
      errors: [],
      usage: {
        drafts: {},
        actionHistory: 0,
        metadata: 0,
      },
    };
  }

  private async updateAudit(): Promise<void> {
    try {
      const usage = this.calculateStorageUsage();
      const metadata = this.getMetadata();
      
      this.auditData = {
        ...this.auditData,
        totalSize: usage,
        draftCount: Object.keys(metadata.drafts).length,
        freeSpace: this.getAvailableSpace(),
        usage: {
          drafts: this.calculateDraftSizes(),
          actionHistory: this.calculateActionHistorySize(),
          metadata: this.calculateMetadataSize(),
        },
      };
      
      // Persist audit data
      localStorage.setItem(LocalStorageAdapter.AUDIT_KEY, this.serialize(this.auditData));
      
    } catch (error) {
      console.warn('Failed to update audit data:', error);
    }
  }

  private calculateDraftSizes(): Record<string, number> {
    const sizes: Record<string, number> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LocalStorageAdapter.DRAFT_KEY_PREFIX)) {
        const draftId = key.substring(LocalStorageAdapter.DRAFT_KEY_PREFIX.length);
        const value = localStorage.getItem(key);
        sizes[draftId] = value ? value.length : 0;
      }
    }
    
    return sizes;
  }

  private calculateActionHistorySize(): number {
    let total = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LocalStorageAdapter.ACTIONS_KEY_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) total += value.length;
      }
    }
    
    return total;
  }

  private calculateMetadataSize(): number {
    const metadataValue = localStorage.getItem(LocalStorageAdapter.METADATA_KEY);
    const auditValue = localStorage.getItem(LocalStorageAdapter.AUDIT_KEY);
    
    return (metadataValue?.length || 0) + (auditValue?.length || 0);
  }

  private getMetadata(): { drafts: Record<string, { lastModified: number; size: number; compressed: boolean }> } {
    try {
      const serialized = localStorage.getItem(LocalStorageAdapter.METADATA_KEY);
      return serialized ? this.deserialize(serialized) : { drafts: {} };
    } catch (error) {
      console.warn('Failed to load metadata, resetting:', error);
      return { drafts: {} };
    }
  }

  private async updateDraftMetadata(draftId: string, meta: { lastModified: number; size: number; compressed: boolean }): Promise<void> {
    try {
      const metadata = this.getMetadata();
      metadata.drafts[draftId] = meta;
      localStorage.setItem(LocalStorageAdapter.METADATA_KEY, this.serialize(metadata));
    } catch (error) {
      console.warn('Failed to update metadata:', error);
    }
  }

  private async removeDraftMetadata(draftId: string): Promise<void> {
    try {
      const metadata = this.getMetadata();
      delete metadata.drafts[draftId];
      localStorage.setItem(LocalStorageAdapter.METADATA_KEY, this.serialize(metadata));
    } catch (error) {
      console.warn('Failed to remove metadata:', error);
    }
  }

  private setupStorageEventListener(): void {
    // Listen for storage changes from other tabs
    this.storageEventHandler = (event: StorageEvent) => {
      if (event.key && event.key.startsWith(LocalStorageAdapter.DRAFT_KEY_PREFIX)) {
        const draftId = event.key.substring(LocalStorageAdapter.DRAFT_KEY_PREFIX.length);
        
        if (event.newValue === null) {
          // Draft was deleted
          this.notifyDraftChanged(draftId, null);
        } else if (event.newValue) {
          // Draft was updated
          try {
            const draft = this.deserialize<DraftState>(event.newValue);
            this.notifyDraftChanged(draftId, draft);
          } catch (error) {
            console.warn('Failed to parse draft from storage event:', error);
          }
        }
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.storageEventHandler);
    }
  }

  // Cleanup resources
  destroy(): void {
    if (this.storageEventHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageEventHandler);
    }
  }
}