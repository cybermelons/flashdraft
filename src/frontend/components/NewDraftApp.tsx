/** @jsxImportSource react */
/**
 * FlashDraft - New Draft Application Component
 * 
 * Root React component using the new DraftSession engine architecture.
 * Provides setup, draft flow, and error handling with clean separation.
 */

import * as React from 'react';
import { useEffect } from 'react';
import { useFlashDraft } from '../hooks/useFlashDraft';
import { DraftEngineErrorBoundary } from './ErrorBoundary';
import NewDraftInterface from './NewDraftInterface';
import DraftSetupScreen from './DraftSetupScreen';
import LoadingScreen from './LoadingScreen';
import ErrorScreen from './ErrorScreen';
import { clearCorruptedDrafts } from '../utils/clearCorruptedData';

export interface NewDraftAppProps {
  className?: string;
}

export const NewDraftApp: React.FC<NewDraftAppProps> = ({ className = '' }) => {
  const flashDraft = useFlashDraft({
    autoLoadFromURL: true,
    autoSave: true,
    enableSync: true
  });

  // Clear corrupted data on startup
  useEffect(() => {
    clearCorruptedDrafts().catch(err => 
      console.error('Failed to clear corrupted drafts:', err)
    );
  }, []);

  // Loading state
  if (flashDraft.loading) {
    return (
      <LoadingScreen 
        message={
          !flashDraft.engine ? 'Loading draft...' :
          flashDraft.setup.loadingSet ? 'Loading set data...' :
          'Preparing draft...'
        }
        className={className}
      />
    );
  }

  // Error state
  if (flashDraft.error) {
    return (
      <ErrorScreen
        error={flashDraft.error}
        onRetry={() => {
          flashDraft.clearAllErrors();
          window.location.reload();
        }}
        onNavigateHome={() => window.location.href = '/'}
        className={className}
      />
    );
  }

  // Setup screen (no draft exists)
  if (flashDraft.needsSetup) {
    return (
      <DraftSetupScreen
        setup={flashDraft.setup}
        onStartDraft={flashDraft.createAndStartDraft}
        loading={flashDraft.loading}
        className={className}
      />
    );
  }

  // Main draft interface
  return (
    <DraftEngineErrorBoundary>
      <NewDraftInterface
        flashDraft={flashDraft}
        className={className}
      />
    </DraftEngineErrorBoundary>
  );
};

export default NewDraftApp;