/**
 * Main export file for FlashDraft components
 * 
 * Exports both legacy components (for backward compatibility) and new engine-based components.
 */

// Legacy components (using Zustand store)
export { default as DraftApp } from './DraftApp';
export { default as DraftInterface } from './DraftInterface';
export { default as PackDisplay } from './PackDisplay';
export { default as Card } from './Card';
export { default as DecklistView } from './DecklistView';

// New engine-based components
export { default as NewDraftApp } from './NewDraftApp';
export { default as NewDraftInterface } from './NewDraftInterface';
export { default as NewPackDisplay } from './NewPackDisplay';
export { default as NewCard } from './NewCard';

// Setup and flow components
export { default as DraftSetupScreen } from './DraftSetupScreen';
export { default as LoadingScreen } from './LoadingScreen';
export { default as ErrorScreen } from './ErrorScreen';

// Draft interface components
export { default as DraftHeader } from './DraftHeader';
export { default as PickConfirmationBar } from './PickConfirmationBar';
export { default as PickedCardsSidebar } from './PickedCardsSidebar';
export { default as DraftCompleteScreen } from './DraftCompleteScreen';
export { default as CardDetailsModal } from './CardDetailsModal';

// Error boundary components
export { 
  ErrorBoundary,
  DraftEngineErrorBoundary,
  RouterErrorBoundary,
  CardErrorBoundary,
  useErrorHandler
} from './ErrorBoundary';

// Navigation and routing components
export { default as FlashDraftApp } from './FlashDraftApp';
export { default as DraftPageRouter } from './DraftPageRouter';
export { default as DraftListPage } from './DraftListPage';

// Architecture validation (development)
export { default as ArchitectureValidation } from './ArchitectureValidation';
export { default as ErrorLoadingStateDemo } from './ErrorLoadingStateDemo';
export { default as UserFlowTests } from './UserFlowTests';

// Type exports
export type { NewDraftAppProps } from './NewDraftApp';
export type { NewDraftInterfaceProps } from './NewDraftInterface';
export type { NewPackDisplayProps } from './NewPackDisplay';
export type { NewCardProps } from './NewCard';
export type { DraftSetupScreenProps } from './DraftSetupScreen';
export type { LoadingScreenProps } from './LoadingScreen';
export type { ErrorScreenProps } from './ErrorScreen';
export type { DraftHeaderProps } from './DraftHeader';
export type { PickConfirmationBarProps } from './PickConfirmationBar';
export type { PickedCardsSidebarProps } from './PickedCardsSidebar';
export type { DraftCompleteScreenProps } from './DraftCompleteScreen';
export type { CardDetailsModalProps } from './CardDetailsModal';
export type { FlashDraftAppProps } from './FlashDraftApp';
export type { DraftPageRouterProps } from './DraftPageRouter';
export type { DraftListPageProps } from './DraftListPage';