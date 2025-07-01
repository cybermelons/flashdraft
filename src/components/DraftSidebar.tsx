/**
 * Draft Sidebar - Draft information and controls
 * 
 * Shows picked cards, draft statistics, filters, and controls.
 */

import React from 'react';
import { useStore } from '@nanostores/react';
import { 
  $currentDraft,
  $humanDeckCards,
  $selectedCard 
} from '@/stores/draftStore';
import { 
  $sidebarOpen,
  $sortBy,
  $filterBy,
  uiActions 
} from '@/stores/uiStore';
import { Card } from './Card';

interface DraftSidebarProps {
  className?: string;
}

/**
 * Sidebar component for draft interface
 */
// Calculate converted mana cost from mana cost string
function calculateCMC(manaCost?: string): number {
  if (!manaCost) return 0;
  
  // Remove curly braces and count numeric values
  const matches = manaCost.match(/\{(\d+)\}/g);
  let cmc = 0;
  
  if (matches) {
    matches.forEach(match => {
      const num = parseInt(match.replace(/[{}]/g, ''));
      cmc += num;
    });
  }
  
  // Count colored mana symbols
  const coloredSymbols = manaCost.match(/\{[WUBRG]\}/g);
  if (coloredSymbols) {
    cmc += coloredSymbols.length;
  }
  
  return cmc;
}

export function DraftSidebar({ className = '' }: DraftSidebarProps) {
  const currentDraft = useStore($currentDraft);
  const humanDeckCards = useStore($humanDeckCards);
  const selectedCard = useStore($selectedCard);
  const sidebarOpen = useStore($sidebarOpen);
  const sortBy = useStore($sortBy);
  const filterBy = useStore($filterBy);

  if (!currentDraft) return null;

  const toggleSidebar = () => {
    uiActions.toggleSidebar();
  };

  const handleSortChange = (newSort: string) => {
    uiActions.setSortBy(newSort as any);
  };

  const handleColorFilter = (color: string) => {
    const currentColors = filterBy.colors;
    const newColors = currentColors.includes(color)
      ? currentColors.filter(c => c !== color)
      : [...currentColors, color];
    
    uiActions.updateFilters({ colors: newColors });
  };

  const clearFilters = () => {
    uiActions.clearFilters();
  };

  const getColorStats = () => {
    const stats: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, Colorless: 0 };
    
    humanDeckCards.forEach(card => {
      if (!card.manaCost || card.manaCost === '') {
        stats.Colorless++;
      } else {
        // Count each color symbol in mana cost
        if (card.manaCost.includes('W')) stats.W++;
        if (card.manaCost.includes('U')) stats.U++;
        if (card.manaCost.includes('B')) stats.B++;
        if (card.manaCost.includes('R')) stats.R++;
        if (card.manaCost.includes('G')) stats.G++;
      }
    });
    
    return stats;
  };
  
  const getCardStats = () => {
    const stats = {
      creatures: 0,
      artifacts: 0,
      instants: 0,
      sorceries: 0,
      enchantments: 0,
      planeswalkers: 0,
      lands: 0
    };
    
    humanDeckCards.forEach(card => {
      const typeLine = (card.type || '').toLowerCase();
      if (typeLine.includes('creature')) stats.creatures++;
      if (typeLine.includes('artifact')) stats.artifacts++;
      if (typeLine.includes('instant')) stats.instants++;
      if (typeLine.includes('sorcery')) stats.sorceries++;
      if (typeLine.includes('enchantment')) stats.enchantments++;
      if (typeLine.includes('planeswalker')) stats.planeswalkers++;
      if (typeLine.includes('land')) stats.lands++;
    });
    
    return stats;
  };
  
  const getManaCurve = () => {
    const curve: Record<number, number> = {};
    
    humanDeckCards.forEach(card => {
      // Calculate CMC from mana cost
      const cmc = Math.min(calculateCMC(card.manaCost), 7); // Cap at 7+
      curve[cmc] = (curve[cmc] || 0) + 1;
    });
    
    return curve;
  };

  const colorStats = getColorStats();
  const cardStats = getCardStats();
  const manaCurve = getManaCurve();

  return (
    <>
      {/* Sidebar toggle button - always visible */}
      <button
        onClick={toggleSidebar}
        className="fixed top-20 right-4 z-40 p-3 bg-slate-700/90 hover:bg-slate-600/90 text-slate-300 hover:text-white rounded-xl transition-all duration-200 shadow-lg"
        title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <svg className={`w-5 h-5 transition-transform duration-200 ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
      
      {/* Sidebar sheet */}
      <aside className={`fixed top-0 right-0 h-full w-80 bg-slate-800/95 backdrop-blur-sm border-l border-slate-700/50 flex flex-col transition-transform duration-300 z-30 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      } ${className}`}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">Draft Deck</h2>
          <p className="text-sm text-slate-400 mt-1">{humanDeckCards.length} cards</p>
        </div>

        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Selected Card Detail */}
          {selectedCard && (
            <div className="bg-slate-700/30 rounded-2xl p-4 border border-slate-600/30">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                Selected Card
              </h3>
              <Card 
                card={selectedCard}
                isSelected={true}
                canInteract={false}
                size="medium"
                className="mb-3"
              />
              <div className="space-y-2">
                <div className="font-bold text-white text-lg">{selectedCard.name}</div>
                {selectedCard.mana_cost && (
                  <div className="bg-slate-600/50 text-slate-200 px-3 py-1 rounded-lg text-sm font-mono">
                    {selectedCard.mana_cost}
                  </div>
                )}
                <div className="text-slate-300">{selectedCard.type_line || 'Unknown Type'}</div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                  selectedCard.rarity === 'common' ? 'bg-gray-500/20 text-gray-300' :
                  selectedCard.rarity === 'uncommon' ? 'bg-green-500/20 text-green-300' :
                  selectedCard.rarity === 'rare' ? 'bg-yellow-500/20 text-yellow-300' :
                  selectedCard.rarity === 'mythic' ? 'bg-orange-500/20 text-orange-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {selectedCard.rarity}
                </div>
              </div>
            </div>
          )}

          {/* Picked Cards */}
          <div className="bg-slate-700/30 rounded-2xl p-4 border border-slate-600/30">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
              Your Picks ({humanDeckCards.length})
            </h3>
            
            {/* Color distribution */}
            <div className="mb-4">
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(colorStats).map(([color, count]) => (
                  <div key={color} className={`text-center p-2 rounded-lg ${
                    color === 'W' ? 'bg-yellow-500/20 text-yellow-300' :
                    color === 'U' ? 'bg-blue-500/20 text-blue-300' :
                    color === 'B' ? 'bg-gray-500/20 text-gray-300' :
                    color === 'R' ? 'bg-red-500/20 text-red-300' :
                    color === 'G' ? 'bg-green-500/20 text-green-300' :
                    'bg-slate-500/20 text-slate-300'
                  }`}>
                    <div className="text-xs font-bold">{color}</div>
                    <div className="text-sm font-semibold">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Picked cards list */}
            <div className="space-y-2">
              {humanDeckCards.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                  </svg>
                  <p className="text-sm">No cards picked yet</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {humanDeckCards.map(card => (
                    <div 
                      key={card.id} 
                      className={`flex items-center justify-between bg-slate-600/30 rounded-lg px-3 py-2 border border-slate-500/30 hover:bg-slate-600/50 transition-colors ${
                        card.rarity === 'mythic' ? 'border-orange-500/50' :
                        card.rarity === 'rare' ? 'border-yellow-500/50' :
                        card.rarity === 'uncommon' ? 'border-slate-400/50' :
                        'border-slate-500/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{card.name}</div>
                        <div className="text-xs text-slate-400">{card.type || 'Unknown Type'}</div>
                      </div>
                      <div className="text-xs text-slate-300 font-mono ml-2">{card.manaCost || ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Deck Statistics */}
          <div className="bg-slate-700/30 rounded-2xl p-4 border border-slate-600/30">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              Deck Statistics
            </h3>
            
            {/* Card Type Breakdown */}
            <div className="mb-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Card Types</div>
              <div className="space-y-1 text-sm">
                {cardStats.creatures > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Creatures</span>
                    <span className="text-white font-medium">{cardStats.creatures}</span>
                  </div>
                )}
                {cardStats.instants > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Instants</span>
                    <span className="text-white font-medium">{cardStats.instants}</span>
                  </div>
                )}
                {cardStats.sorceries > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Sorceries</span>
                    <span className="text-white font-medium">{cardStats.sorceries}</span>
                  </div>
                )}
                {cardStats.artifacts > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Artifacts</span>
                    <span className="text-white font-medium">{cardStats.artifacts}</span>
                  </div>
                )}
                {cardStats.enchantments > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Enchantments</span>
                    <span className="text-white font-medium">{cardStats.enchantments}</span>
                  </div>
                )}
                {cardStats.planeswalkers > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Planeswalkers</span>
                    <span className="text-white font-medium">{cardStats.planeswalkers}</span>
                  </div>
                )}
                {cardStats.lands > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Lands</span>
                    <span className="text-white font-medium">{cardStats.lands}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mana Curve */}
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Mana Curve</div>
              <div className="flex items-end gap-1 h-16">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(cmc => {
                  const count = manaCurve[cmc] || 0;
                  const maxCount = Math.max(...Object.values(manaCurve), 1);
                  const height = count > 0 ? (count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={cmc} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-slate-600/50 rounded-t" style={{ height: `${height}%` }}>
                        {count > 0 && (
                          <div className="text-xs text-white text-center mt-1">{count}</div>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{cmc === 7 ? '7+' : cmc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filters and Sorting */}
          <div className="bg-slate-700/30 rounded-2xl p-4 border border-slate-600/30">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"></path>
              </svg>
              Filters
            </h3>
            
            {/* Sort options */}
            <div className="mb-4">
              <label htmlFor="sort-select" className="block text-sm font-medium text-slate-300 mb-2">Sort by:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full bg-slate-600/50 border border-slate-500/50 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cmc">Mana Cost</option>
                <option value="name">Name</option>
                <option value="color">Color</option>
                <option value="rarity">Rarity</option>
                <option value="type">Type</option>
              </select>
            </div>

            {/* Color filters */}
            <div className="mb-4">
              <div className="text-sm font-medium text-slate-300 mb-2">Colors:</div>
              <div className="grid grid-cols-5 gap-1">
                {['W', 'U', 'B', 'R', 'G'].map(color => (
                  <button
                    key={color}
                    onClick={() => handleColorFilter(color)}
                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                      filterBy.colors.includes(color)
                        ? color === 'W' ? 'bg-yellow-500 text-black' :
                          color === 'U' ? 'bg-blue-500 text-white' :
                          color === 'B' ? 'bg-gray-800 text-white' :
                          color === 'R' ? 'bg-red-500 text-white' :
                          'bg-green-500 text-white'
                        : color === 'W' ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30' :
                          color === 'U' ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' :
                          color === 'B' ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30' :
                          color === 'R' ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' :
                          'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                    }`}
                    title={getColorName(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {(filterBy.colors.length > 0 || filterBy.rarities.length > 0) && (
              <button
                onClick={clearFilters}
                className="w-full bg-slate-600/50 hover:bg-slate-500/50 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Draft Statistics */}
          <div className="bg-slate-700/30 rounded-2xl p-4 border border-slate-600/30">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-600/30 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">Round</div>
                <div className="text-lg font-bold text-white">{currentDraft.currentRound}</div>
              </div>
              <div className="bg-slate-600/30 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">Pick</div>
                <div className="text-lg font-bold text-white">{currentDraft.currentPick}</div>
              </div>
              <div className="bg-slate-600/30 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">Cards</div>
                <div className="text-lg font-bold text-white">{humanDeckCards.length}</div>
              </div>
              <div className="bg-slate-600/30 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">Status</div>
                <div className={`text-sm font-semibold ${
                  currentDraft.status === 'active' ? 'text-blue-300' :
                  currentDraft.status === 'completed' ? 'text-green-300' :
                  'text-slate-300'
                }`}>
                  {currentDraft.status}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/**
 * Get full color name from abbreviation
 */
function getColorName(color: string): string {
  switch (color) {
    case 'W': return 'White';
    case 'U': return 'Blue';
    case 'B': return 'Black';
    case 'R': return 'Red';
    case 'G': return 'Green';
    default: return color;
  }
}