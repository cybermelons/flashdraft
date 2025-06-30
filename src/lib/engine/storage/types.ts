/**
 * Storage Types - Interfaces for persistence layer
 */

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

export interface StorageError {
  type: 'QUOTA_EXCEEDED' | 'ACCESS_DENIED' | 'CORRUPTION' | 'UNKNOWN';
  timestamp: number;
  operation: string;
  details: string;
  recoveryAction?: string;
  size?: number;
}

export interface StorageAudit {
  totalSize: number;
  draftCount: number;
  uiStateSize: number;
  freeSpace: number;
  errors: StorageError[];
  lastError?: StorageError;
  usage: {
    drafts: Record<string, number>; // draftId -> size
    actionHistory: number;
    metadata: number;
  };
}

export interface StorageOptions {
  compress?: boolean;
  includeActions?: boolean;
  maxDrafts?: number;
  autoCleanup?: boolean;
}