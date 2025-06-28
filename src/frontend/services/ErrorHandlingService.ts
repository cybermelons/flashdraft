/**
 * Error Handling Service
 * 
 * Centralized error handling for the FlashDraft application,
 * including specific handling for draft engine errors.
 */

import type { DraftError } from '../../engine/types/errors';
import type { DraftSession } from '../../engine/DraftSession';

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApplicationError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  timestamp: number;
  context?: ErrorContext;
  recovery?: RecoveryAction[];
}

export type ErrorType = 
  | 'DRAFT_ENGINE_ERROR'
  | 'PERSISTENCE_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'ROUTING_ERROR'
  | 'COMPONENT_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  draftId?: string;
  component?: string;
  action?: string;
  userAgent?: string;
  location?: string;
  sessionData?: any;
}

export interface RecoveryAction {
  id: string;
  label: string;
  action: () => void | Promise<void>;
  type: 'retry' | 'navigate' | 'reset' | 'reload';
}

export interface ErrorHandler {
  canHandle: (error: any) => boolean;
  handle: (error: any, context?: ErrorContext) => ApplicationError;
  getSeverity: (error: any) => ErrorSeverity;
  getRecoveryActions: (error: any, context?: ErrorContext) => RecoveryAction[];
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class ErrorHandlingService {
  private handlers: Map<string, ErrorHandler> = new Map();
  private errorLog: ApplicationError[] = [];
  private maxLogSize = 100;
  private listeners: Set<(error: ApplicationError) => void> = new Set();

  constructor() {
    this.initializeDefaultHandlers();
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  handleError(error: any, context?: ErrorContext): ApplicationError {
    try {
      // Find appropriate handler
      const handler = this.findHandler(error);
      
      // Process error with handler
      const applicationError = handler.handle(error, context);
      
      // Add to error log
      this.addToLog(applicationError);
      
      // Notify listeners
      this.notifyListeners(applicationError);
      
      return applicationError;
    } catch (handlingError) {
      // Fallback error handling
      console.error('Error in error handling:', handlingError);
      return this.createFallbackError(error, context);
    }
  }

  // ============================================================================
  // HANDLER MANAGEMENT
  // ============================================================================

  registerHandler(id: string, handler: ErrorHandler): void {
    this.handlers.set(id, handler);
  }

  unregisterHandler(id: string): void {
    this.handlers.delete(id);
  }

  private findHandler(error: any): ErrorHandler {
    for (const handler of this.handlers.values()) {
      if (handler.canHandle(error)) {
        return handler;
      }
    }
    
    // Return default handler if no specific handler found
    return this.handlers.get('default') || this.createDefaultHandler();
  }

  // ============================================================================
  // ERROR LOG MANAGEMENT
  // ============================================================================

  private addToLog(error: ApplicationError): void {
    this.errorLog.unshift(error);
    
    // Trim log if it exceeds max size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
  }

  getErrorLog(): ApplicationError[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  getErrorsForDraft(draftId: string): ApplicationError[] {
    return this.errorLog.filter(error => error.context?.draftId === draftId);
  }

  // ============================================================================
  // EVENT MANAGEMENT
  // ============================================================================

  addListener(listener: (error: ApplicationError) => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: (error: ApplicationError) => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(error: ApplicationError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  // ============================================================================
  // DEFAULT HANDLERS
  // ============================================================================

  private initializeDefaultHandlers(): void {
    // Draft engine error handler
    this.registerHandler('draft-engine', {
      canHandle: (error) => this.isDraftEngineError(error),
      handle: (error, context) => this.handleDraftEngineError(error, context),
      getSeverity: (error) => this.getDraftEngineErrorSeverity(error),
      getRecoveryActions: (error, context) => this.getDraftEngineRecoveryActions(error, context)
    });

    // Network error handler
    this.registerHandler('network', {
      canHandle: (error) => this.isNetworkError(error),
      handle: (error, context) => this.handleNetworkError(error, context),
      getSeverity: () => 'medium',
      getRecoveryActions: (error, context) => this.getNetworkRecoveryActions(error, context)
    });

    // Validation error handler
    this.registerHandler('validation', {
      canHandle: (error) => this.isValidationError(error),
      handle: (error, context) => this.handleValidationError(error, context),
      getSeverity: () => 'low',
      getRecoveryActions: () => []
    });

    // Default handler
    this.registerHandler('default', this.createDefaultHandler());
  }

  private isDraftEngineError(error: any): boolean {
    return error && (
      error.type?.startsWith('DRAFT_') ||
      error.type?.startsWith('INVALID_') ||
      error.type?.startsWith('PLAYER_') ||
      error.type?.startsWith('PACK_') ||
      error.type?.startsWith('SERIALIZATION_') ||
      error.type?.startsWith('DESERIALIZATION_')
    );
  }

  private handleDraftEngineError(error: DraftError, context?: ErrorContext): ApplicationError {
    return {
      id: this.generateErrorId(),
      type: 'DRAFT_ENGINE_ERROR',
      severity: this.getDraftEngineErrorSeverity(error),
      message: this.formatDraftEngineErrorMessage(error),
      details: error,
      timestamp: Date.now(),
      context,
      recovery: this.getDraftEngineRecoveryActions(error, context)
    };
  }

  private getDraftEngineErrorSeverity(error: DraftError): ErrorSeverity {
    switch (error.type) {
      case 'INVALID_PICK':
      case 'WRONG_PLAYER':
        return 'low';
      
      case 'CARD_NOT_AVAILABLE':
      case 'NO_PACK_AVAILABLE':
      case 'INVALID_ACTION':
        return 'medium';
      
      case 'DRAFT_NOT_ACTIVE':
      case 'SERIALIZATION_ERROR':
      case 'DESERIALIZATION_ERROR':
        return 'high';
      
      default:
        return 'medium';
    }
  }

  private formatDraftEngineErrorMessage(error: DraftError): string {
    const baseMessage = error.message || 'An error occurred in the draft engine';
    
    switch (error.type) {
      case 'INVALID_PICK':
        return 'Cannot make that pick. The card may no longer be available.';
      
      case 'CARD_NOT_AVAILABLE':
        return 'The selected card is not available in your current pack.';
      
      case 'NO_PACK_AVAILABLE':
        return 'No draft pack is currently available. Please wait for other players.';
      
      case 'DRAFT_NOT_ACTIVE':
        return 'The draft is not currently active. Please start or join a draft first.';
      
      case 'SERIALIZATION_ERROR':
        return 'Unable to save the draft. Your progress may not be preserved.';
      
      case 'DESERIALIZATION_ERROR':
        return 'Unable to load the saved draft. The save data may be corrupted.';
      
      default:
        return baseMessage;
    }
  }

  private getDraftEngineRecoveryActions(error: DraftError, context?: ErrorContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.type) {
      case 'INVALID_PICK':
      case 'CARD_NOT_AVAILABLE':
        actions.push({
          id: 'refresh-pack',
          label: 'Refresh Pack',
          action: () => window.location.reload(),
          type: 'retry'
        });
        break;

      case 'NO_PACK_AVAILABLE':
        actions.push({
          id: 'wait-and-retry',
          label: 'Wait and Retry',
          action: () => setTimeout(() => window.location.reload(), 2000),
          type: 'retry'
        });
        break;

      case 'DRAFT_NOT_ACTIVE':
        actions.push({
          id: 'go-to-drafts',
          label: 'View Draft List',
          action: () => window.location.href = '/draft',
          type: 'navigate'
        });
        actions.push({
          id: 'start-new-draft',
          label: 'Start New Draft',
          action: () => window.location.href = '/draft/new',
          type: 'navigate'
        });
        break;

      case 'SERIALIZATION_ERROR':
      case 'DESERIALIZATION_ERROR':
        actions.push({
          id: 'clear-storage',
          label: 'Clear Storage',
          action: () => {
            if (context?.draftId) {
              localStorage.removeItem(`flashdraft_${context.draftId}`);
            }
            window.location.reload();
          },
          type: 'reset'
        });
        break;
    }

    // Always add a generic reload action
    actions.push({
      id: 'reload',
      label: 'Reload Page',
      action: () => window.location.reload(),
      type: 'reload'
    });

    return actions;
  }

  private isNetworkError(error: any): boolean {
    return error instanceof TypeError && error.message.includes('fetch') ||
           error?.status >= 400 ||
           error?.name === 'NetworkError';
  }

  private handleNetworkError(error: any, context?: ErrorContext): ApplicationError {
    return {
      id: this.generateErrorId(),
      type: 'NETWORK_ERROR',
      severity: 'medium',
      message: 'Network connection problem. Please check your internet connection.',
      details: error,
      timestamp: Date.now(),
      context,
      recovery: this.getNetworkRecoveryActions(error, context)
    };
  }

  private getNetworkRecoveryActions(error: any, context?: ErrorContext): RecoveryAction[] {
    return [
      {
        id: 'retry-request',
        label: 'Try Again',
        action: () => window.location.reload(),
        type: 'retry'
      }
    ];
  }

  private isValidationError(error: any): boolean {
    return error?.name === 'ValidationError' || error?.type === 'VALIDATION_ERROR';
  }

  private handleValidationError(error: any, context?: ErrorContext): ApplicationError {
    return {
      id: this.generateErrorId(),
      type: 'VALIDATION_ERROR',
      severity: 'low',
      message: error.message || 'Invalid input provided',
      details: error,
      timestamp: Date.now(),
      context,
      recovery: []
    };
  }

  private createDefaultHandler(): ErrorHandler {
    return {
      canHandle: () => true,
      handle: (error, context) => this.createFallbackError(error, context),
      getSeverity: () => 'medium',
      getRecoveryActions: () => [
        {
          id: 'reload',
          label: 'Reload Page',
          action: () => window.location.reload(),
          type: 'reload'
        }
      ]
    };
  }

  private createFallbackError(error: any, context?: ErrorContext): ApplicationError {
    return {
      id: this.generateErrorId(),
      type: 'UNKNOWN_ERROR',
      severity: 'medium',
      message: error?.message || 'An unexpected error occurred',
      details: error,
      timestamp: Date.now(),
      context,
      recovery: [
        {
          id: 'reload',
          label: 'Reload Page',
          action: () => window.location.reload(),
          type: 'reload'
        }
      ]
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// SINGLETON SERVICE INSTANCE
// ============================================================================

let errorService: ErrorHandlingService | null = null;

export function getErrorService(): ErrorHandlingService {
  if (!errorService) {
    errorService = new ErrorHandlingService();
  }
  return errorService;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function handleError(error: any, context?: ErrorContext): ApplicationError {
  return getErrorService().handleError(error, context);
}

export function reportError(error: any, context?: ErrorContext): void {
  const applicationError = handleError(error, context);
  console.error('Error reported:', applicationError);
}

export function createErrorContext(options: Partial<ErrorContext> = {}): ErrorContext {
  return {
    userAgent: navigator.userAgent,
    location: window.location.href,
    ...options
  };
}