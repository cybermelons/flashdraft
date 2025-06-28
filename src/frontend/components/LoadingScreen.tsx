/** @jsxImportSource react */
/**
 * Loading Screen Component
 * 
 * Displays loading state with customizable message and spinner.
 * Purely presentational component.
 */

import * as React from 'react';

export interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  className = ''
}) => {
  return (
    <div className={`h-full flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{message}</h2>
        <p className="text-gray-600">Please wait while we prepare your experience</p>
      </div>
    </div>
  );
};

export default LoadingScreen;