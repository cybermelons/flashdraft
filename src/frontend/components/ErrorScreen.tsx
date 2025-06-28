/** @jsxImportSource react */
/**
 * Error Screen Component
 * 
 * Displays error state with recovery actions.
 * Purely presentational component.
 */

import * as React from 'react';

export interface ErrorScreenProps {
  error: string;
  onRetry?: () => void;
  onNavigateHome?: () => void;
  className?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  error,
  onRetry,
  onNavigateHome,
  className = ''
}) => {
  return (
    <div className={`h-full flex items-center justify-center ${className}`}>
      <div className="text-center max-w-md">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        
        <div className="space-x-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          )}
          
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Go Home
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;