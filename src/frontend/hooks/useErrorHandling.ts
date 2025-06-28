/**
 * React hook for error handling
 * 
 * Provides comprehensive error handling capabilities for React components,
 * integrating with the ErrorHandlingService and providing recovery actions.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getErrorService,
  handleError as serviceHandleError,
  createErrorContext,
  type ApplicationError,
  type ErrorContext,
  type RecoveryAction
} from '../services/ErrorHandlingService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UseErrorHandlingOptions {
  enableAutoReport?: boolean;
  context?: Partial<ErrorContext>;
  maxErrors?: number;
  enableRecovery?: boolean;
}

export interface ErrorState {
  errors: ApplicationError[];
  currentError: ApplicationError | null;
  isErrorModalOpen: boolean;
  hasUnresolvedErrors: boolean;
}

export interface UseErrorHandlingReturn extends ErrorState {
  // Error handling
  handleError: (error: any, customContext?: Partial<ErrorContext>) => ApplicationError;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  
  // Error display
  showErrorModal: (error: ApplicationError) => void;
  hideErrorModal: () => void;
  
  // Recovery
  executeRecoveryAction: (action: RecoveryAction) => Promise<void>;
  getRecoveryActions: (error: ApplicationError) => RecoveryAction[];
  
  // Error reporting
  reportError: (error: any, customContext?: Partial<ErrorContext>) => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useErrorHandling(options: UseErrorHandlingOptions = {}): UseErrorHandlingReturn {
  const {
    enableAutoReport = true,
    context: baseContext = {},
    maxErrors = 10,
    enableRecovery = true
  } = options;

  // State
  const [errorState, setErrorState] = useState<ErrorState>({
    errors: [],
    currentError: null,
    isErrorModalOpen: false,
    hasUnresolvedErrors: false
  });

  // Service reference
  const serviceRef = useRef(getErrorService());
  const service = serviceRef.current;

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  const handleError = useCallback((error: any, customContext?: Partial<ErrorContext>): ApplicationError => {
    const fullContext = createErrorContext({
      ...baseContext,
      ...customContext
    });

    const applicationError = serviceHandleError(error, fullContext);

    // Add to local state
    setErrorState(prev => ({
      ...prev,
      errors: [applicationError, ...prev.errors.slice(0, maxErrors - 1)],
      hasUnresolvedErrors: true
    }));

    // Auto-report if enabled
    if (enableAutoReport) {
      console.error('Error handled:', applicationError);
    }

    return applicationError;
  }, [baseContext, maxErrors, enableAutoReport]);

  const clearError = useCallback((errorId: string) => {
    setErrorState(prev => {
      const filteredErrors = prev.errors.filter(err => err.id !== errorId);
      return {
        ...prev,
        errors: filteredErrors,
        currentError: prev.currentError?.id === errorId ? null : prev.currentError,
        isErrorModalOpen: prev.currentError?.id === errorId ? false : prev.isErrorModalOpen,
        hasUnresolvedErrors: filteredErrors.length > 0
      };
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrorState({
      errors: [],
      currentError: null,
      isErrorModalOpen: false,
      hasUnresolvedErrors: false
    });
  }, []);

  // ============================================================================
  // ERROR DISPLAY
  // ============================================================================

  const showErrorModal = useCallback((error: ApplicationError) => {
    setErrorState(prev => ({
      ...prev,
      currentError: error,
      isErrorModalOpen: true
    }));
  }, []);

  const hideErrorModal = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      currentError: null,
      isErrorModalOpen: false
    }));
  }, []);

  // ============================================================================
  // RECOVERY ACTIONS
  // ============================================================================

  const executeRecoveryAction = useCallback(async (action: RecoveryAction): Promise<void> => {
    try {
      await action.action();
      
      // Hide modal after successful recovery
      hideErrorModal();
    } catch (recoveryError) {
      console.error('Recovery action failed:', recoveryError);
      
      // Handle the recovery error itself
      handleError(recoveryError, {
        action: `Recovery action: ${action.id}`,
        component: 'ErrorRecovery'
      });
    }
  }, [hideErrorModal, handleError]);

  const getRecoveryActions = useCallback((error: ApplicationError): RecoveryAction[] => {
    return error.recovery || [];
  }, []);

  // ============================================================================
  // ERROR REPORTING
  // ============================================================================

  const reportError = useCallback((error: any, customContext?: Partial<ErrorContext>) => {
    const applicationError = handleError(error, customContext);
    
    // Additional reporting logic could go here
    // e.g., send to external service, show toast notification, etc.
    
    return applicationError;
  }, [handleError]);

  // ============================================================================
  // SERVICE EVENT HANDLING
  // ============================================================================

  useEffect(() => {
    const handleServiceError = (error: ApplicationError) => {
      // Only add to state if it's not already there (to avoid duplicates)
      setErrorState(prev => {
        const exists = prev.errors.some(err => err.id === error.id);
        if (exists) return prev;

        return {
          ...prev,
          errors: [error, ...prev.errors.slice(0, maxErrors - 1)],
          hasUnresolvedErrors: true
        };
      });
    };

    service.addListener(handleServiceError);
    
    return () => {
      service.removeListener(handleServiceError);
    };
  }, [service, maxErrors]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // State
    ...errorState,
    
    // Actions
    handleError,
    clearError,
    clearAllErrors,
    showErrorModal,
    hideErrorModal,
    executeRecoveryAction,
    getRecoveryActions,
    reportError
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for draft-specific error handling
 */
export function useDraftErrorHandling(draftId?: string) {
  return useErrorHandling({
    context: {
      component: 'Draft',
      draftId
    },
    enableAutoReport: true,
    enableRecovery: true
  });
}

/**
 * Hook for component-specific error handling
 */
export function useComponentErrorHandling(componentName: string) {
  return useErrorHandling({
    context: {
      component: componentName
    },
    maxErrors: 5,
    enableAutoReport: true
  });
}

/**
 * Hook for async operation error handling
 */
export function useAsyncErrorHandling() {
  const errorHandling = useErrorHandling({
    enableAutoReport: true,
    enableRecovery: false
  });

  const wrapAsync = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    context?: Partial<ErrorContext>
  ): Promise<T | null> => {
    try {
      return await asyncFunction();
    } catch (error) {
      errorHandling.handleError(error, {
        ...context,
        action: 'Async operation'
      });
      return null;
    }
  }, [errorHandling]);

  return {
    ...errorHandling,
    wrapAsync
  };
}

/**
 * Hook for form validation error handling
 */
export function useFormErrorHandling() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const errorHandling = useErrorHandling({
    context: {
      component: 'Form'
    },
    enableAutoReport: false,
    enableRecovery: false
  });

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const { [field]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const handleValidationError = useCallback((validationResult: any) => {
    if (validationResult && typeof validationResult === 'object') {
      Object.entries(validationResult).forEach(([field, message]) => {
        if (typeof message === 'string') {
          setFieldError(field, message);
        }
      });
    }
  }, [setFieldError]);

  return {
    ...errorHandling,
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleValidationError,
    hasFieldErrors: Object.keys(fieldErrors).length > 0
  };
}