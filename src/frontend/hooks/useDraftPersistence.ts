/**
 * React hook for enhanced draft persistence
 * 
 * Integrates the DraftPersistenceService with React state management,
 * providing auto-save, metadata management, and import/export functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DraftSession } from '../../engine/DraftSession';
import { 
  DraftPersistenceService, 
  getDraftPersistenceService,
  type DraftListItem,
  type DraftMetadata,
  type PersistenceServiceOptions 
} from '../services/DraftPersistenceService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UseDraftPersistenceOptions extends PersistenceServiceOptions {
  autoSaveOnChange?: boolean;
  enableMetadataTracking?: boolean;
}

export interface DraftPersistenceState {
  // Auto-save state
  isAutoSaveEnabled: boolean;
  lastSaveTime: number | null;
  saveInProgress: boolean;
  saveError: string | null;
  
  // Draft list state
  draftList: DraftListItem[];
  listLoading: boolean;
  listError: string | null;
  
  // Import/export state
  exportInProgress: boolean;
  importInProgress: boolean;
  exportError: string | null;
  importError: string | null;
}

export interface DraftPersistenceActions {
  // Save/load operations
  saveDraft: (session: DraftSession, metadata?: Partial<DraftMetadata>) => Promise<boolean>;
  loadDraft: (draftId: string) => Promise<DraftSession | null>;
  deleteDraft: (draftId: string) => Promise<boolean>;
  
  // Auto-save management
  enableAutoSave: (session: DraftSession) => void;
  disableAutoSave: () => void;
  forceSave: (session: DraftSession) => Promise<boolean>;
  
  // Draft list management
  refreshDraftList: () => Promise<void>;
  
  // Import/export
  exportDraft: (draftId: string) => Promise<string | null>;
  importDraft: (exportData: string) => Promise<string | null>;
  
  // Utilities
  clearErrors: () => void;
  updateMetadata: (draftId: string, metadata: Partial<DraftMetadata>) => Promise<void>;
}

export interface UseDraftPersistenceReturn extends DraftPersistenceState, DraftPersistenceActions {}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useDraftPersistence(options: UseDraftPersistenceOptions = {}): UseDraftPersistenceReturn {
  const {
    autoSaveOnChange = true,
    enableMetadataTracking = true,
    ...serviceOptions
  } = options;

  // Service instance
  const serviceRef = useRef<DraftPersistenceService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = getDraftPersistenceService(serviceOptions);
  }
  const service = serviceRef.current;

  // State
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [draftList, setDraftList] = useState<DraftListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  
  const [exportInProgress, setExportInProgress] = useState(false);
  const [importInProgress, setImportInProgress] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Refs for tracking current session
  const currentSessionRef = useRef<DraftSession | null>(null);

  // ============================================================================
  // SAVE/LOAD OPERATIONS
  // ============================================================================

  const saveDraft = useCallback(async (session: DraftSession, metadata?: Partial<DraftMetadata>): Promise<boolean> => {
    try {
      setSaveInProgress(true);
      setSaveError(null);
      
      const enhancedMetadata = {
        ...metadata,
        updatedAt: Date.now()
      };
      
      if (enableMetadataTracking) {
        enhancedMetadata.setCode = session.state.config.setCode;
        enhancedMetadata.playerCount = session.state.players.length;
        enhancedMetadata.status = session.state.status;
        enhancedMetadata.currentRound = session.state.currentRound;
        enhancedMetadata.currentPick = session.state.currentPick;
      }
      
      const success = await service.saveDraft(session, enhancedMetadata);
      
      if (success) {
        setLastSaveTime(Date.now());
        // Refresh draft list to reflect changes
        refreshDraftList();
      } else {
        setSaveError('Failed to save draft');
      }
      
      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      setSaveError(message);
      return false;
    } finally {
      setSaveInProgress(false);
    }
  }, [service, enableMetadataTracking]);

  const loadDraft = useCallback(async (draftId: string): Promise<DraftSession | null> => {
    try {
      setSaveError(null);
      return await service.loadDraft(draftId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Load failed';
      setSaveError(message);
      return null;
    }
  }, [service]);

  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      setSaveError(null);
      const success = await service.deleteDraft(draftId);
      
      if (success) {
        // Refresh draft list
        await refreshDraftList();
      }
      
      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      setSaveError(message);
      return false;
    }
  }, [service]);

  // ============================================================================
  // AUTO-SAVE MANAGEMENT
  // ============================================================================

  const enableAutoSave = useCallback((session: DraftSession) => {
    currentSessionRef.current = session;
    setIsAutoSaveEnabled(true);
    
    service.startAutoSave(session, (success) => {
      if (success) {
        setLastSaveTime(Date.now());
        setSaveError(null);
      } else {
        setSaveError('Auto-save failed');
      }
    });
  }, [service]);

  const disableAutoSave = useCallback(() => {
    setIsAutoSaveEnabled(false);
    currentSessionRef.current = null;
    service.stopAutoSave();
  }, [service]);

  const forceSave = useCallback(async (session: DraftSession): Promise<boolean> => {
    return saveDraft(session);
  }, [saveDraft]);

  // ============================================================================
  // DRAFT LIST MANAGEMENT
  // ============================================================================

  const refreshDraftList = useCallback(async (): Promise<void> => {
    try {
      setListLoading(true);
      setListError(null);
      
      const drafts = await service.listDrafts();
      setDraftList(drafts);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load draft list';
      setListError(message);
    } finally {
      setListLoading(false);
    }
  }, [service]);

  // ============================================================================
  // IMPORT/EXPORT
  // ============================================================================

  const exportDraft = useCallback(async (draftId: string): Promise<string | null> => {
    try {
      setExportInProgress(true);
      setExportError(null);
      
      const exportData = await service.exportDraft(draftId);
      
      if (!exportData) {
        setExportError('Failed to export draft');
      }
      
      return exportData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setExportError(message);
      return null;
    } finally {
      setExportInProgress(false);
    }
  }, [service]);

  const importDraft = useCallback(async (exportData: string): Promise<string | null> => {
    try {
      setImportInProgress(true);
      setImportError(null);
      
      const draftId = await service.importDraft(exportData);
      
      if (draftId) {
        // Refresh draft list to show imported draft
        await refreshDraftList();
      } else {
        setImportError('Failed to import draft');
      }
      
      return draftId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setImportError(message);
      return null;
    } finally {
      setImportInProgress(false);
    }
  }, [service, refreshDraftList]);

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const clearErrors = useCallback(() => {
    setSaveError(null);
    setListError(null);
    setExportError(null);
    setImportError(null);
  }, []);

  const updateMetadata = useCallback(async (draftId: string, metadata: Partial<DraftMetadata>): Promise<void> => {
    try {
      // Load the session, update metadata, and save
      const session = await loadDraft(draftId);
      if (session) {
        await saveDraft(session, metadata);
      }
    } catch (error) {
      console.warn('Failed to update metadata:', error);
    }
  }, [loadDraft, saveDraft]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load draft list on mount
  useEffect(() => {
    refreshDraftList();
  }, [refreshDraftList]);

  // Cleanup auto-save on unmount
  useEffect(() => {
    return () => {
      service.stopAutoSave();
    };
  }, [service]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // State
    isAutoSaveEnabled,
    lastSaveTime,
    saveInProgress,
    saveError,
    draftList,
    listLoading,
    listError,
    exportInProgress,
    importInProgress,
    exportError,
    importError,
    
    // Actions
    saveDraft,
    loadDraft,
    deleteDraft,
    enableAutoSave,
    disableAutoSave,
    forceSave,
    refreshDraftList,
    exportDraft,
    importDraft,
    clearErrors,
    updateMetadata
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for auto-saving a specific draft session
 */
export function useAutoSave(session: DraftSession | null, enabled = true) {
  const persistence = useDraftPersistence({ enableAutoSave: enabled });
  
  useEffect(() => {
    if (session && enabled) {
      persistence.enableAutoSave(session);
    } else {
      persistence.disableAutoSave();
    }
    
    return () => {
      persistence.disableAutoSave();
    };
  }, [session, enabled, persistence]);
  
  return {
    isAutoSaveEnabled: persistence.isAutoSaveEnabled,
    lastSaveTime: persistence.lastSaveTime,
    saveError: persistence.saveError,
    forceSave: () => session ? persistence.saveDraft(session) : Promise.resolve(false)
  };
}

/**
 * Hook for managing draft list with real-time updates
 */
export function useDraftListManager() {
  const persistence = useDraftPersistence();
  
  const renameDraft = useCallback(async (draftId: string, newName: string): Promise<boolean> => {
    try {
      await persistence.updateMetadata(draftId, { name: newName });
      return true;
    } catch (error) {
      console.error('Failed to rename draft:', error);
      return false;
    }
  }, [persistence]);
  
  const duplicateDraft = useCallback(async (draftId: string): Promise<string | null> => {
    try {
      const exportData = await persistence.exportDraft(draftId);
      if (!exportData) return null;
      
      return await persistence.importDraft(exportData);
    } catch (error) {
      console.error('Failed to duplicate draft:', error);
      return null;
    }
  }, [persistence]);
  
  return {
    ...persistence,
    renameDraft,
    duplicateDraft
  };
}