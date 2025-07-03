/**
 * Settings Interface - Application settings and preferences
 * 
 * Allows users to configure various app settings including
 * debug mode, theme preferences, and gameplay options.
 */

import { useStore } from '@nanostores/react';
import { useState } from 'react';
import React from 'react';
import { 
  $theme,
  $cardSize,
  $quickPickMode,
  $doubleClickToPick,
  $animationsEnabled,
  $soundEnabled,
  uiActions
} from '@/stores/uiStore';
import { Card } from '@/components/Card';
import { SelectedCardOverlay } from '@/components/SelectedCardOverlay';
import { LayoutHeader } from '@/components/LayoutHeader';
import { HeaderButton } from '@/components/HeaderButton';
import type { Card as CardType } from '@/lib/engine/PackGenerator';

interface SettingsInterfaceProps {
  className?: string;
}

export function SettingsInterface({ className = '' }: SettingsInterfaceProps) {
  const theme = useStore($theme);
  const cardSize = useStore($cardSize);
  const quickPickMode = useStore($quickPickMode);
  const doubleClickToPick = useStore($doubleClickToPick);
  const animationsEnabled = useStore($animationsEnabled);
  const soundEnabled = useStore($soundEnabled);
  
  // Local state for debug settings
  const [showEngineDebug, setShowEngineDebug] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showEngineDebug') !== 'false';
    }
    return true;
  });

  // Local state for card preview interaction
  const [previewSelectedCard, setPreviewSelectedCard] = useState<CardType | null>(null);
  const [previewHoveredCard, setPreviewHoveredCard] = useState<CardType | null>(null);
  const [showQuickPickFlash, setShowQuickPickFlash] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  
  // Auto-select card initially to show the overlay by default
  React.useEffect(() => {
    if (!quickPickMode && !previewSelectedCard) {
      setPreviewSelectedCard(sampleCard);
    }
  }, [quickPickMode]);

  // Sample card for preview - using Vivi from FIN set
  const sampleCard: CardType = {
    id: 'ecc1027a-8c07-44a0-bdde-fa2844cff694',
    name: 'Vivi Ornitier',
    mana_cost: '{1}{U}{R}',
    type_line: 'Legendary Creature — Wizard',
    type: 'Legendary Creature — Wizard',
    oracle_text: '{0}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier\'s power. Activate only during your turn and only once each turn.\nWhenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each opponent.',
    colors: ['U', 'R'],
    color_identity: ['U', 'R'],
    set: 'FIN',
    collector_number: '248',
    rarity: 'mythic',
    cmc: 3,
    power: '0',
    toughness: '1',
    image_uris: {
      small: 'https://cards.scryfall.io/small/front/e/c/ecc1027a-8c07-44a0-bdde-fa2844cff694.jpg?1748706721',
      normal: 'https://cards.scryfall.io/normal/front/e/c/ecc1027a-8c07-44a0-bdde-fa2844cff694.jpg?1748706721',
      large: 'https://cards.scryfall.io/large/front/e/c/ecc1027a-8c07-44a0-bdde-fa2844cff694.jpg?1748706721',
    }
  };

  // Determine pick mode description
  const getPickModeDescription = () => {
    if (quickPickMode) return 'Click to pick immediately';
    if (doubleClickToPick) return 'Double-click to confirm';
    return 'Click to select, use confirm button';
  };

  const handleDebugToggle = (enabled: boolean) => {
    setShowEngineDebug(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('showEngineDebug', String(enabled));
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${className}`}>
      <LayoutHeader 
        title="Settings"
      />

      {/* Settings Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Developer Settings */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
              Developer Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Engine Debug Panel</h3>
                  <p className="text-sm text-slate-400">Show technical debug information during drafts</p>
                </div>
                <button
                  onClick={() => handleDebugToggle(!showEngineDebug)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showEngineDebug ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showEngineDebug ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              Display Settings
            </h2>
            
            <div className="space-y-4">
              {/* Theme */}
              <div>
                <h3 className="text-white font-medium mb-2">Theme</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['system', 'light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => uiActions.setTheme(t)}
                      className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                        theme === t
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Size with Preview */}
              <div>
                <h3 className="text-white font-medium mb-2">Card Size</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => uiActions.setCardSize(size)}
                      className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                        cardSize === size
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300'
                      }`}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
                {/* Card Preview - Using exact PackDisplay structure */}
                <div className="bg-slate-900/50 rounded-xl p-4 flex justify-center">
                  <div className="w-fit">
                    {/* Real PackDisplay-style card with overlay - exactly like in PackDisplay */}
                    <div className="relative inline-block">
                      {/* SelectedCardOverlay as sibling to Card, not wrapping it */}
                      {(!quickPickMode || showQuickPickFlash || isMouseDown) && (
                        <SelectedCardOverlay 
                          isSelected={previewSelectedCard?.id === sampleCard.id || showQuickPickFlash || (quickPickMode && isMouseDown)} 
                          label={
                            quickPickMode 
                              ? (isMouseDown ? "Confirm" : "Picked!") 
                              : (doubleClickToPick ? "Confirm" : "Selected")
                          }
                          isHovered={previewHoveredCard?.id === sampleCard.id}
                          size={cardSize}
                        />
                      )}
                      {/* Real Card component with exact same props as PackDisplay */}
                      <div
                        onMouseDown={() => quickPickMode && setIsMouseDown(true)}
                        onMouseUp={() => setIsMouseDown(false)}
                        onMouseLeave={() => setIsMouseDown(false)}
                      >
                        <Card
                          card={sampleCard}
                          isSelected={previewSelectedCard?.id === sampleCard.id}
                          isHovered={previewHoveredCard?.id === sampleCard.id}
                          canInteract={true}
                          onClick={() => {
                            if (quickPickMode) {
                              // In quick pick mode, flash the confirmation
                              setShowQuickPickFlash(true);
                              setTimeout(() => setShowQuickPickFlash(false), 300);
                            } else {
                              // In normal mode, toggle selection
                              setPreviewSelectedCard(previewSelectedCard?.id === sampleCard.id ? null : sampleCard);
                            }
                          }}
                          onDoubleClick={() => {
                            if (doubleClickToPick) {
                              setPreviewSelectedCard(null);
                              // Simulate pick in preview
                            }
                          }}
                          onMouseEnter={() => setPreviewHoveredCard(sampleCard)}
                          onMouseLeave={() => setPreviewHoveredCard(null)}
                          size={cardSize}
                          responsive={false}
                        />
                      </div>
                    </div>
                    {/* Show the pick mode description below */}
                    <div className="mt-2 text-center text-sm text-slate-400">
                      {getPickModeDescription()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Animations */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Animations</h3>
                  <p className="text-sm text-slate-400">Enable smooth transitions and effects</p>
                </div>
                <button
                  onClick={() => uiActions.setAnimationsEnabled(!animationsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    animationsEnabled ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Gameplay Settings */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              Gameplay Settings
            </h2>
            
            <div className="space-y-4">
              {/* Pick Mode Settings */}
              <div>
                <h3 className="text-white font-medium mb-3">Pick Mode</h3>
                <div className="space-y-4">
                  {/* Quick Pick Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30">
                    <div>
                      <div className="text-white font-medium">Quick Pick Mode</div>
                      <div className="text-sm text-slate-400">Click once to immediately pick a card</div>
                    </div>
                    <button
                      onClick={() => uiActions.setQuickPickMode(!quickPickMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        quickPickMode ? 'bg-blue-600' : 'bg-slate-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        quickPickMode ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Double-Click option - always visible but disabled when quick pick is on */}
                  <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                    quickPickMode ? 'bg-slate-700/20 opacity-50' : 'bg-slate-700/30'
                  }`}>
                    <div>
                      <div className={`font-medium ${quickPickMode ? 'text-slate-400' : 'text-white'}`}>
                        Double-Click to Confirm
                      </div>
                      <div className="text-sm text-slate-400">
                        {quickPickMode 
                          ? 'Not available in quick pick mode' 
                          : 'Double-click to pick, otherwise use confirm button'}
                      </div>
                    </div>
                    <button
                      onClick={() => !quickPickMode && uiActions.setDoubleClickToPick(!doubleClickToPick)}
                      disabled={quickPickMode}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        quickPickMode 
                          ? 'bg-slate-700 cursor-not-allowed' 
                          : (doubleClickToPick ? 'bg-blue-600' : 'bg-slate-600')
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        doubleClickToPick && !quickPickMode ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sound Effects */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Sound Effects</h3>
                  <p className="text-sm text-slate-400">Play sounds for picks and notifications</p>
                </div>
                <button
                  onClick={() => uiActions.setSoundEnabled(!soundEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    soundEnabled ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">About FlashDraft</h2>
            <div className="space-y-2 text-slate-300">
              <p>FlashDraft is an MTG draft simulator and playtesting platform.</p>
              <p className="text-sm text-slate-400">
                Built with Astro, React, and TypeScript. Draft AI powered by 17lands data.
              </p>
              <div className="pt-4 mt-4 border-t border-slate-700/50">
                <a
                  href="https://github.com/yourusername/flashdraft"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
