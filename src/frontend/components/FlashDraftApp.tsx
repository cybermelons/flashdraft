/** @jsxImportSource react */
/**
 * FlashDraft Root Application Component
 * 
 * Main application entry point using the new DraftSession engine architecture.
 * Provides routing, error boundaries, and global state management.
 */

import * as React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import DraftPageRouter from './DraftPageRouter';

export interface FlashDraftAppProps {
  className?: string;
}

export const FlashDraftApp: React.FC<FlashDraftAppProps> = ({ className = '' }) => {
  return (
    <ErrorBoundary
      boundaryName="FlashDraftApp"
      onError={(errorDetails) => {
        console.error('Root application error:', errorDetails);
        
        // In production, this would report to error tracking service
        if (process.env.NODE_ENV === 'production') {
          // Report to Sentry, Bugsnag, etc.
        }
      }}
      fallback={(error, errorInfo, retry) => (
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 text-6xl mb-4">💥</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Application Error
            </h2>
            <p className="text-gray-600 mb-6">
              FlashDraft encountered an unexpected error and needs to be restarted.
            </p>
            
            <div className="space-y-2">
              <button
                onClick={retry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                Restart Application
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors"
              >
                Reload Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    >
      <div className={`min-h-screen bg-gray-100 ${className}`}>
        <DraftPageRouter className="h-screen" />
      </div>
    </ErrorBoundary>
  );
};

export default FlashDraftApp;