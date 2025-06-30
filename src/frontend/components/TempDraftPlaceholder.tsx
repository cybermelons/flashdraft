/**
 * Temporary Draft Placeholder
 * 
 * Placeholder component during service layer refactor.
 * Will be replaced with new clean components in Phase 4.
 */

export interface TempDraftPlaceholderProps {
  routeType: string;
  draftId?: string | null;
  round?: number | null;
  pick?: number | null;
}

export function TempDraftPlaceholder({ routeType, draftId, round, pick }: TempDraftPlaceholderProps) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-800 mb-4">
          🚧 Draft System Under Construction
        </h2>
        <p className="text-yellow-700 mb-4">
          We're rebuilding the draft system with a clean service layer architecture.
        </p>
        
        <div className="bg-white rounded border p-4 mb-4">
          <h3 className="font-medium mb-2">Current Route Info:</h3>
          <ul className="text-sm space-y-1">
            <li><strong>Route Type:</strong> {routeType}</li>
            {draftId && <li><strong>Draft ID:</strong> {draftId}</li>}
            {round && <li><strong>Round:</strong> {round}</li>}
            {pick && <li><strong>Pick:</strong> {pick}</li>}
          </ul>
        </div>
        
        <div className="text-sm text-yellow-600">
          <p><strong>Progress:</strong> Phase 1 - Service Layer Implementation</p>
          <p><strong>Next:</strong> Create DraftService.ts for business logic</p>
        </div>
      </div>
    </div>
  );
}