/**
 * Error Boundary Components
 * 
 * Comprehensive error handling for the FlashDraft application,
 * including specialized boundaries for different component types.
 */

import React, { Component, ReactNode } from 'react';

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  eventType?: string;
}

export interface ErrorDetails {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: number;
  userAgent: string;
  location: string;
}

// ============================================================================
// BASE ERROR BOUNDARY
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode);
  onError?: (errorDetails: ErrorDetails) => void;
  enableRetry?: boolean;
  retryCount?: number;
  boundaryName?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryAttempts = 0;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = generateErrorId();
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails: ErrorDetails = {
      error,
      errorInfo: {
        ...errorInfo,
        errorBoundary: this.props.boundaryName || 'ErrorBoundary'
      },
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      location: window.location.href
    };

    this.setState({ errorInfo });

    // Call error handler if provided
    this.props.onError?.(errorDetails);

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // Report error to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(errorDetails);
    }
  }

  private reportError = (errorDetails: ErrorDetails) => {
    // In a real application, this would send to an error reporting service
    // like Sentry, Bugsnag, or a custom endpoint
    console.warn('Error reported:', {
      message: errorDetails.error.message,
      stack: errorDetails.error.stack,
      timestamp: errorDetails.timestamp,
      location: errorDetails.location
    });
  };

  private handleRetry = () => {
    const { retryCount = 3 } = this.props;
    
    if (this.retryAttempts < retryCount) {
      this.retryAttempts++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });
    }
  };

  private renderFallback() {
    const { fallback, enableRetry = true } = this.props;
    const { error, errorInfo } = this.state;

    if (!error || !errorInfo) {
      return <DefaultErrorFallback onRetry={this.handleRetry} />;
    }

    if (typeof fallback === 'function') {
      return fallback(error, errorInfo, this.handleRetry);
    }

    if (fallback) {
      return fallback;
    }

    return (
      <DefaultErrorFallback 
        error={error}
        errorInfo={errorInfo}
        onRetry={enableRetry ? this.handleRetry : undefined}
        retryAttempts={this.retryAttempts}
      />
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

// ============================================================================
// SPECIALIZED ERROR BOUNDARIES
// ============================================================================

/**
 * Error boundary specifically for draft engine components
 */
export function DraftEngineErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      boundaryName="DraftEngine"
      onError={(errorDetails) => {
        // Handle draft engine specific errors
        console.error('Draft engine error:', errorDetails);
        
        // Could trigger specific recovery actions
        // like reloading the draft state or redirecting to draft list
      }}
      fallback={(error, errorInfo, retry) => (
        <DraftEngineErrorFallback 
          error={error}
          onRetry={retry}
          onNavigateToList={() => window.location.href = '/draft'}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for router components
 */
export function RouterErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      boundaryName="Router"
      onError={(errorDetails) => {
        console.error('Router error:', errorDetails);
      }}
      fallback={(error, errorInfo, retry) => (
        <RouterErrorFallback 
          error={error}
          onRetry={retry}
          onNavigateHome={() => window.location.href = '/'}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for card components
 */
export function CardErrorBoundary({ children, cardId }: { children: ReactNode; cardId?: string }) {
  return (
    <ErrorBoundary
      boundaryName="Card"
      onError={(errorDetails) => {
        console.error(`Card error (${cardId}):`, errorDetails);
      }}
      fallback={() => (
        <CardErrorFallback cardId={cardId} />
      )}
      enableRetry={false} // Don't retry card rendering errors
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================================================
// ERROR FALLBACK COMPONENTS
// ============================================================================

interface DefaultErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  onRetry?: () => void;
  retryAttempts?: number;
}

function DefaultErrorFallback({ error, errorInfo, onRetry, retryAttempts = 0 }: DefaultErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">
          {error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
        </p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left text-sm text-gray-500 mb-4 p-2 bg-gray-100 rounded">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-32">
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Reload Page
          </button>
          
          {onRetry && retryAttempts < 3 && (
            <button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Try Again {retryAttempts > 0 && `(${retryAttempts}/3)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface DraftEngineErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  onNavigateToList: () => void;
}

function DraftEngineErrorFallback({ error, onRetry, onNavigateToList }: DraftEngineErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
        <div className="text-red-500 text-6xl mb-4">🎯</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Draft Error</h2>
        <p className="text-gray-600 mb-6">
          There was a problem with the draft engine. This might be due to corrupted draft data or a temporary issue.
        </p>
        
        <div className="space-y-2 mb-6">
          <button
            onClick={onRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
          
          <button
            onClick={onNavigateToList}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Draft List
          </button>
          
          <button
            onClick={() => window.location.href = '/draft/new'}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Start New Draft
          </button>
        </div>
        
        <p className="text-xs text-gray-500">
          If this problem persists, try clearing your browser data or contact support.
        </p>
      </div>
    </div>
  );
}

interface RouterErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  onNavigateHome: () => void;
}

function RouterErrorFallback({ error, onRetry, onNavigateHome }: RouterErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
        <div className="text-red-500 text-6xl mb-4">🗺️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Navigation Error</h2>
        <p className="text-gray-600 mb-6">
          There was a problem loading this page. The URL might be invalid or the content is no longer available.
        </p>
        
        <div className="space-y-2">
          <button
            onClick={onRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
          
          <button
            onClick={onNavigateHome}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

interface CardErrorFallbackProps {
  cardId?: string;
}

function CardErrorFallback({ cardId }: CardErrorFallbackProps) {
  return (
    <div className="w-full h-32 bg-gray-200 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center">
      <div className="text-center text-gray-500">
        <div className="text-2xl mb-1">⚠️</div>
        <div className="text-sm">Card Error</div>
        {cardId && <div className="text-xs">{cardId}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for error reporting and handling
 */
export function useErrorHandler() {
  const reportError = React.useCallback((error: Error, context?: string) => {
    const errorDetails: ErrorDetails = {
      error,
      errorInfo: {
        componentStack: '',
        errorBoundary: context || 'Manual'
      },
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      location: window.location.href
    };

    console.error('Manual error report:', errorDetails);
    
    // Report to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to error reporting service
    }
  }, []);

  return { reportError };
}