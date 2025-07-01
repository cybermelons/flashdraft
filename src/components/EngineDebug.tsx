/**
 * Engine Debug Component - Shows the true engine state
 *
 * This component displays the actual engine state vs viewing state
 * to help debug navigation and state management issues.
 */

import { useStore } from "@nanostores/react";
import { useState } from "react";
import {
  $currentDraft,
  $viewingPosition,
  $isViewingCurrent,
  $canPick,
  draftEngine,
} from "@/stores/draftStore";

export function EngineDebug() {
  const [isMinimized, setIsMinimized] = useState(false);
  const currentDraft = useStore($currentDraft);
  const viewingPosition = useStore($viewingPosition);
  const isViewingCurrent = useStore($isViewingCurrent);
  const canPick = useStore($canPick);

  if (!currentDraft) return null;

  // Get the actual engine state directly from the engine
  // This should always show the true engine position, not viewing position
  const engineState = draftEngine.getDraftState(currentDraft.draftId);
  if (!engineState) return null;

  const humanDeckSize =
    engineState.playerDecks[engineState.humanPlayerIndex]?.length || 0;

  return (
    <div
      className={`fixed bottom-4 left-4 bg-black/90 text-white rounded-lg shadow-xl font-mono text-xs transition-all duration-200 ${
        isMinimized ? "w-auto" : "w-80"
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="text-green-400 font-bold">🔧 Engine Debug</div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-gray-400 hover:text-white ml-4"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isMinimized ? "M12 6v6m0 0v6m0-6h6m-6 0H6" : "M20 12H4"}
            ></path>
          </svg>
        </button>
      </div>

      {!isMinimized && (
        <>
          <div className="p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Engine Position:</span>
              <span className="text-yellow-400">
                P{engineState.currentRound}P{engineState.currentPick}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Viewing Position:</span>
              <span className="text-blue-400">
                P{viewingPosition.round}P{viewingPosition.pick}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Engine Status:</span>
              <span
                className={
                  engineState.status === "active"
                    ? "text-green-400"
                    : "text-gray-400"
                }
              >
                {engineState.status}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Human Deck Size:</span>
              <span className="text-white">{humanDeckSize} cards</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Is Viewing Current:</span>
              <span
                className={isViewingCurrent ? "text-green-400" : "text-red-400"}
              >
                {isViewingCurrent ? "YES" : "NO"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Can Pick:</span>
              <span className={canPick ? "text-green-400" : "text-red-400"}>
                {canPick ? "YES" : "NO"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Pack Source:</span>
              <span className="text-purple-400">
                {isViewingCurrent ? "Current State" : "Replay"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Actions Count:</span>
              <span className="text-white">
                {engineState.actionHistory.length}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Last Action:</span>
              <span className="text-cyan-400 text-[10px]">
                {engineState.actionHistory.length > 0
                  ? engineState.actionHistory[
                      engineState.actionHistory.length - 1
                    ].type
                  : "None"}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-500">
            {" "}
            URL controls viewing only. Engine state is immutable.
          </div>
        </>
      )}
    </div>
  );
}

