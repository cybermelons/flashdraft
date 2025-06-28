/** @jsxImportSource react */
/**
 * Error and Loading State Demo Component
 * 
 * Demonstrates and tests all error boundaries and loading states in the application.
 * Used for development and testing purposes.
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import {
  ErrorBoundary,
  DraftEngineErrorBoundary,
  RouterErrorBoundary,
  CardErrorBoundary
} from './ErrorBoundary';
import LoadingScreen from './LoadingScreen';
import ErrorScreen from './ErrorScreen';
import NewCard from './NewCard';

export const ErrorLoadingStateDemo: React.FC = () => {
  const [demoState, setDemoState] = useState({
    showLoading: false,
    showError: false,
    throwError: false,
    errorType: 'generic' as 'generic' | 'draft' | 'router' | 'card'
  });

  // Trigger different types of errors
  const triggerError = useCallback((type: string) => {
    setDemoState(prev => ({ ...prev, throwError: true, errorType: type as any }));
  }, []);

  // Reset demo state
  const resetDemo = useCallback(() => {
    setDemoState({
      showLoading: false,
      showError: false,
      throwError: false,
      errorType: 'generic'
    });
  }, []);

  // Component that throws errors for testing
  const ErrorThrowingComponent: React.FC<{ errorType: string }> = ({ errorType }) => {
    React.useEffect(() => {
      if (demoState.throwError) {
        switch (errorType) {
          case 'draft':
            throw new Error('Draft engine error: Invalid pick action');
          case 'router':
            throw new Error('Router error: Invalid navigation state');
          case 'card':
            throw new Error('Card error: Failed to load card image');
          default:
            throw new Error('Generic application error');
        }
      }
    }, [errorType]);

    return <div className="p-4 bg-green-100 rounded">Component loaded successfully</div>;
  };

  // Mock card for card error boundary testing
  const mockCard = {
    id: 'test-card',
    name: 'Test Card',
    manaCost: '{2}{U}',
    typeLine: 'Creature — Test',
    oracleText: 'This is a test card for error boundary testing.',
    imageUrl: 'invalid-url-to-trigger-error.jpg',
    setCode: 'TEST',
    rarity: 'common' as const
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Error Boundaries & Loading States Demo
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <button
              onClick={() => setDemoState(prev => ({ ...prev, showLoading: true }))}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
              Show Loading
            </button>
            
            <button
              onClick={() => setDemoState(prev => ({ ...prev, showError: true }))}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded transition-colors"
            >
              Show Error Screen
            </button>
            
            <button
              onClick={() => triggerError('generic')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
            >
              Trigger Generic Error
            </button>
            
            <button
              onClick={resetDemo}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
            >
              Reset Demo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => triggerError('draft')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
            >
              Draft Engine Error
            </button>
            
            <button
              onClick={() => triggerError('router')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
            >
              Router Error
            </button>
            
            <button
              onClick={() => triggerError('card')}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded transition-colors"
            >
              Card Error
            </button>
          </div>
        </div>

        {/* Loading State Demo */}
        {demoState.showLoading && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Loading Screen Demo</h2>
            <div className="h-64 border-2 border-dashed border-gray-300 rounded-lg">
              <LoadingScreen message="Loading demo content..." />
            </div>
          </div>
        )}

        {/* Error Screen Demo */}
        {demoState.showError && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Error Screen Demo</h2>
            <div className="h-64 border-2 border-dashed border-gray-300 rounded-lg">
              <ErrorScreen
                error="This is a demo error message to show the error screen component."
                onRetry={() => setDemoState(prev => ({ ...prev, showError: false }))}
                onNavigateHome={() => alert('Navigate home clicked')}
              />
            </div>
          </div>
        )}

        {/* Error Boundaries Demo */}
        <div className="space-y-8">
          {/* Generic Error Boundary */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Generic Error Boundary</h2>
            <ErrorBoundary
              boundaryName="DemoGeneric"
              onError={(errorDetails) => console.log('Generic error caught:', errorDetails)}
            >
              <div className="bg-white p-4 rounded-lg shadow border-2 border-dashed border-gray-300">
                <ErrorThrowingComponent errorType="generic" />
              </div>
            </ErrorBoundary>
          </div>

          {/* Draft Engine Error Boundary */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Draft Engine Error Boundary</h2>
            <DraftEngineErrorBoundary>
              <div className="bg-white p-4 rounded-lg shadow border-2 border-dashed border-blue-300">
                <ErrorThrowingComponent errorType="draft" />
              </div>
            </DraftEngineErrorBoundary>
          </div>

          {/* Router Error Boundary */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Router Error Boundary</h2>
            <RouterErrorBoundary>
              <div className="bg-white p-4 rounded-lg shadow border-2 border-dashed border-purple-300">
                <ErrorThrowingComponent errorType="router" />
              </div>
            </RouterErrorBoundary>
          </div>

          {/* Card Error Boundary */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Card Error Boundary</h2>
            <CardErrorBoundary cardId="test-card">
              <div className="bg-white p-4 rounded-lg shadow border-2 border-dashed border-pink-300">
                {demoState.throwError && demoState.errorType === 'card' ? (
                  <ErrorThrowingComponent errorType="card" />
                ) : (
                  <div className="flex space-x-4">
                    <NewCard
                      card={mockCard}
                      size="medium"
                      canInteract={true}
                    />
                    <div className="text-sm text-gray-600">
                      <p>This card component is wrapped in a CardErrorBoundary.</p>
                      <p>Click "Card Error" to trigger an error and see the fallback.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardErrorBoundary>
          </div>
        </div>

        {/* Error Boundary Features */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Error Boundary Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-green-800 mb-2">✅ What Works</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Catches JavaScript errors in component tree</li>
                <li>• Displays fallback UI instead of white screen</li>
                <li>• Logs errors for debugging and reporting</li>
                <li>• Provides retry functionality</li>
                <li>• Specialized boundaries for different error types</li>
                <li>• Recovery actions for specific error scenarios</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-orange-800 mb-2">⚠️ Limitations</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Cannot catch errors in event handlers</li>
                <li>• Cannot catch errors in async code</li>
                <li>• Cannot catch errors during SSR</li>
                <li>• Cannot catch errors in the error boundary itself</li>
                <li>• Use try-catch for async operations</li>
                <li>• Use error states for event handler errors</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Current State Display */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <h3 className="font-medium mb-2">Current Demo State</h3>
          <pre className="text-sm">
            {JSON.stringify(demoState, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ErrorLoadingStateDemo;