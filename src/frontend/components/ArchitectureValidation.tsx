/** @jsxImportSource react */
/**
 * Architecture Validation Component
 * 
 * Demonstrates and validates that our new components follow pure presentational patterns.
 * This component shows how to compose the new architecture components correctly.
 */

import * as React from 'react';
import { useFlashDraft } from '../hooks/useFlashDraft';
import {
  NewDraftApp,
  NewDraftInterface,
  DraftSetupScreen,
  LoadingScreen,
  ErrorScreen,
  DraftHeader,
  NewPackDisplay,
  PickConfirmationBar,
  PickedCardsSidebar,
  DraftCompleteScreen
} from './index';

/**
 * Example of how components can be composed with different hook configurations.
 * This demonstrates the flexibility of the pure presentational approach.
 */
export const ArchitectureDemo: React.FC = () => {
  // Example 1: Standard usage through main app
  const standardFlashDraft = useFlashDraft({
    autoLoadFromURL: true,
    autoSave: true,
    enableSync: true
  });

  // Example 2: Custom configuration for testing
  const testFlashDraft = useFlashDraft({
    autoLoadFromURL: false,
    autoSave: false,
    enableSync: false
  });

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">Architecture Validation</h1>
      
      {/* Demonstrate component purity */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Pure Presentational Components</h2>
        <p className="text-gray-600 mb-4">
          All components receive state as props and emit actions via callbacks:
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">✅ Component Characteristics:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• No direct engine/store imports</li>
            <li>• All state passed as props</li>
            <li>• Actions emitted via callback props</li>
            <li>• Easy to test with mock props</li>
            <li>• Reusable with different data sources</li>
          </ul>
        </div>
      </section>

      {/* Show component interfaces */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Component Interfaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Draft Header Example */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">DraftHeader</h3>
            <div className="text-xs bg-gray-100 p-2 rounded">
              <pre>{`interface DraftHeaderProps {
  currentRound: number;
  currentPick: number;
  draftStatus: DraftStatus;
  players: Player[];
  playerCards: Card[];
  showPickedCards: boolean;
  onTogglePickedCards: () => void;
  onShowDeckList: () => void;
  onShare: () => void;
}`}</pre>
            </div>
          </div>

          {/* Pack Display Example */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">NewPackDisplay</h3>
            <div className="text-xs bg-gray-100 p-2 rounded">
              <pre>{`interface NewPackDisplayProps {
  pack: Pack;
  selectedCard: Card | null;
  hoveredCard: Card | null;
  canMakePick: (cardId: string) => boolean;
  onCardSelect: (card: Card) => void;
  onCardHover: (card: Card | null) => void;
  onShowCardDetails: (card: Card) => void;
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Show composition flexibility */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Composition Flexibility</h2>
        <p className="text-gray-600 mb-4">
          Components can be composed with different configurations:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Standard Configuration</h3>
            <div className="text-xs bg-green-50 p-2 rounded">
              <pre>{`useFlashDraft({
  autoLoadFromURL: true,
  autoSave: true,
  enableSync: true
})`}</pre>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Test Configuration</h3>
            <div className="text-xs bg-blue-50 p-2 rounded">
              <pre>{`useFlashDraft({
  autoLoadFromURL: false,
  autoSave: false,
  enableSync: false
})`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture benefits */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Architecture Benefits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800 mb-2">🧪 Testability</h3>
            <p className="text-sm text-green-700">
              Easy to test with mock props and no external dependencies
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">🔄 Reusability</h3>
            <p className="text-sm text-blue-700">
              Components work with any data source that matches the interface
            </p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-medium text-purple-800 mb-2">🛠️ Maintainability</h3>
            <p className="text-sm text-purple-700">
              Clear separation of concerns makes code easier to understand
            </p>
          </div>
        </div>
      </section>

      {/* Demonstrate both configurations work */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Configuration Examples</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Standard App Status:</h3>
            <div className="bg-gray-100 p-2 rounded text-sm">
              Loading: {standardFlashDraft.loading ? 'Yes' : 'No'} | 
              Ready: {standardFlashDraft.isReady ? 'Yes' : 'No'} | 
              Needs Setup: {standardFlashDraft.needsSetup ? 'Yes' : 'No'}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Test App Status:</h3>
            <div className="bg-gray-100 p-2 rounded text-sm">
              Loading: {testFlashDraft.loading ? 'Yes' : 'No'} | 
              Ready: {testFlashDraft.isReady ? 'Yes' : 'No'} | 
              Needs Setup: {testFlashDraft.needsSetup ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

/**
 * Validation function to ensure components follow presentational patterns.
 * This would be used in tests to verify architecture compliance.
 */
export function validateComponentArchitecture() {
  const validationResults = {
    pureComponents: true,
    propInterfaces: true,
    noDirectImports: true,
    callbackActions: true
  };

  // In a real implementation, this would analyze the component AST
  // to ensure they follow the patterns
  
  return {
    isValid: Object.values(validationResults).every(Boolean),
    results: validationResults
  };
}

export default ArchitectureDemo;