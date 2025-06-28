/** @jsxImportSource react */
/**
 * Draft Page Router Component
 * 
 * Handles client-side routing for draft pages using the new engine architecture.
 * Integrates with browser history and URL parameters.
 */

import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useDraftFromURL } from '../hooks/useFlashDraft';
import { RouterErrorBoundary } from './ErrorBoundary';
import NewDraftApp from './NewDraftApp';
import DraftListPage from './DraftListPage';
import LoadingScreen from './LoadingScreen';
import ErrorScreen from './ErrorScreen';

export interface DraftPageRouterProps {
  className?: string;
}

// Route types
type Route = 
  | { type: 'home' }
  | { type: 'draft-list' }
  | { type: 'draft-new' }
  | { type: 'draft-active'; draftId: string; round?: number; pick?: number }
  | { type: 'not-found'; path: string };

export const DraftPageRouter: React.FC<DraftPageRouterProps> = ({ className = '' }) => {
  const [currentRoute, setCurrentRoute] = useState<Route>({ type: 'home' });
  const [navigationError, setNavigationError] = useState<string | null>(null);

  // Parse current URL to determine route
  const parseRoute = useCallback((): Route => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    try {
      if (path === '/' || path === '') {
        return { type: 'home' };
      }

      if (path === '/draft' || path === '/draft/') {
        return { type: 'draft-list' };
      }

      if (path === '/draft/new') {
        return { type: 'draft-new' };
      }

      // Draft with ID: /draft/{id} or /draft/{id}/p{round}p{pick}
      const draftMatch = path.match(/^\/draft\/([^\/]+)(?:\/p(\d+)p(\d+))?$/);
      if (draftMatch) {
        const [, draftId, roundStr, pickStr] = draftMatch;
        return {
          type: 'draft-active',
          draftId,
          round: roundStr ? parseInt(roundStr, 10) : undefined,
          pick: pickStr ? parseInt(pickStr, 10) : undefined
        };
      }

      return { type: 'not-found', path };
    } catch (error) {
      console.error('Error parsing route:', error);
      return { type: 'not-found', path };
    }
  }, []);

  // Handle browser navigation (back/forward)
  const handlePopState = useCallback(() => {
    const newRoute = parseRoute();
    setCurrentRoute(newRoute);
    setNavigationError(null);
  }, [parseRoute]);

  // Initialize route and set up navigation listener
  useEffect(() => {
    const initialRoute = parseRoute();
    setCurrentRoute(initialRoute);

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseRoute, handlePopState]);

  // Navigation functions
  const navigateTo = useCallback((path: string, replace = false) => {
    try {
      if (replace) {
        window.history.replaceState(null, '', path);
      } else {
        window.history.pushState(null, '', path);
      }
      
      const newRoute = parseRoute();
      setCurrentRoute(newRoute);
      setNavigationError(null);
    } catch (error) {
      console.error('Navigation error:', error);
      setNavigationError(`Failed to navigate to ${path}`);
    }
  }, [parseRoute]);

  const navigateToHome = useCallback(() => navigateTo('/'), [navigateTo]);
  const navigateToDraftList = useCallback(() => navigateTo('/draft'), [navigateTo]);
  const navigateToNewDraft = useCallback(() => navigateTo('/draft/new'), [navigateTo]);
  const navigateToDraft = useCallback((draftId: string, round?: number, pick?: number) => {
    const path = round && pick 
      ? `/draft/${draftId}/p${round}p${pick}`
      : `/draft/${draftId}`;
    navigateTo(path);
  }, [navigateTo]);

  // Error state
  if (navigationError) {
    return (
      <ErrorScreen
        error={navigationError}
        onRetry={() => {
          setNavigationError(null);
          window.location.reload();
        }}
        onNavigateHome={navigateToHome}
        className={className}
      />
    );
  }

  // Render appropriate page based on route
  const renderPage = () => {
    switch (currentRoute.type) {
      case 'home':
        return (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">FlashDraft</h1>
              <p className="text-xl text-gray-600 mb-8">
                MTG Draft Simulator & Learning Platform
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={navigateToNewDraft}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors"
                >
                  🎲 Start New Draft
                </button>
                
                <div>
                  <button
                    onClick={navigateToDraftList}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    📂 View Saved Drafts
                  </button>
                </div>
              </div>
              
              <div className="mt-8 text-sm text-gray-500">
                Practice MTG drafts with realistic AI opponents
              </div>
            </div>
          </div>
        );

      case 'draft-list':
        return (
          <DraftListPage
            onNavigateHome={navigateToHome}
            onNavigateToNewDraft={navigateToNewDraft}
            onNavigateToDraft={navigateToDraft}
          />
        );

      case 'draft-new':
        return (
          <NewDraftApp 
            className="h-full"
          />
        );

      case 'draft-active':
        return (
          <DraftActivePageWrapper
            draftId={currentRoute.draftId}
            expectedRound={currentRoute.round}
            expectedPick={currentRoute.pick}
            onNavigateHome={navigateToHome}
            onNavigateToDraftList={navigateToDraftList}
            onNavigateToNewDraft={navigateToNewDraft}
          />
        );

      case 'not-found':
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🤔</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
              <p className="text-gray-600 mb-6">
                The page "{currentRoute.path}" doesn't exist.
              </p>
              
              <div className="space-x-4">
                <button
                  onClick={navigateToHome}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Go Home
                </button>
                <button
                  onClick={navigateToNewDraft}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Start Draft
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <ErrorScreen
            error="Unknown route type"
            onNavigateHome={navigateToHome}
            className="h-full"
          />
        );
    }
  };

  return (
    <RouterErrorBoundary>
      <div className={className}>
        {renderPage()}
      </div>
    </RouterErrorBoundary>
  );
};

// Wrapper component for active draft pages
interface DraftActivePageWrapperProps {
  draftId: string;
  expectedRound?: number;
  expectedPick?: number;
  onNavigateHome: () => void;
  onNavigateToDraftList: () => void;
  onNavigateToNewDraft: () => void;
}

const DraftActivePageWrapper: React.FC<DraftActivePageWrapperProps> = ({
  draftId,
  expectedRound,
  expectedPick,
  onNavigateHome,
  onNavigateToDraftList,
  onNavigateToNewDraft
}) => {
  const flashDraft = useDraftFromURL();

  // Loading state
  if (flashDraft.isLoadingFromURL) {
    return (
      <LoadingScreen
        message={`Loading draft ${draftId}...`}
        className="h-full"
      />
    );
  }

  // Error state
  if (flashDraft.error) {
    return (
      <ErrorScreen
        error={flashDraft.error}
        onRetry={() => window.location.reload()}
        onNavigateHome={onNavigateHome}
        className="h-full"
      />
    );
  }

  // Draft not found
  if (!flashDraft.engine && flashDraft.urlDraftId === draftId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Draft Not Found</h2>
          <p className="text-gray-600 mb-6">
            The draft "{draftId}" could not be loaded.
          </p>
          
          <div className="space-x-4">
            <button
              onClick={onNavigateToDraftList}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              View Drafts
            </button>
            <button
              onClick={onNavigateToNewDraft}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              New Draft
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render main draft app
  return (
    <NewDraftApp className="h-full" />
  );
};

export default DraftPageRouter;