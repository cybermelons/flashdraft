/**
 * Draft Sidebar - Draft information and controls
 * 
 * Shows picked cards, draft statistics, filters, and controls.
 */

import React from 'react';
import { useStore } from '@nanostores/react';
import { 
  $currentDraft,
  $humanDeck,
  $selectedCard 
} from '@/stores/draftStore';
import { 
  $sidebarOpen,
  $sortBy,
  $filterBy,
  uiStateActions 
} from '@/stores/uiStore';
import { Card } from './Card';

interface DraftSidebarProps {
  className?: string;
}

/**
 * Sidebar component for draft interface
 */
export function DraftSidebar({ className = '' }: DraftSidebarProps) {
  const currentDraft = useStore($currentDraft);
  const humanDeck = useStore($humanDeck);
  const selectedCard = useStore($selectedCard);
  const sidebarOpen = useStore($sidebarOpen);
  const sortBy = useStore($sortBy);
  const filterBy = useStore($filterBy);

  if (!currentDraft) return null;

  const toggleSidebar = () => {
    uiStateActions.toggleSidebar();
  };

  const handleSortChange = (newSort: string) => {
    uiStateActions.setSortBy(newSort as any);
  };

  const handleColorFilter = (color: string) => {
    const currentColors = filterBy.colors;
    const newColors = currentColors.includes(color)
      ? currentColors.filter(c => c !== color)
      : [...currentColors, color];
    
    uiStateActions.updateFilters({ colors: newColors });
  };

  const clearFilters = () => {
    uiStateActions.clearFilters();
  };

  const getColorStats = () => {
    const stats = { W: 0, U: 0, B: 0, R: 0, G: 0, Colorless: 0 };
    
    // This would need actual card data to calculate properly
    // For now, just return empty stats
    return stats;
  };

  const colorStats = getColorStats();

  return (
    <aside className={`draft-sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${className}`}>
      {/* Sidebar Toggle */}
      <button
        onClick={toggleSidebar}
        className="sidebar-toggle"
        title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? '→' : '←'}
      </button>

      <div className="sidebar-content">
        {/* Selected Card Detail */}
        {selectedCard && (
          <div className="selected-card-section">
            <h3>Selected Card</h3>
            <Card 
              card={selectedCard}
              isSelected={true}
              canInteract={false}
              size="medium"
            />
            <div className="card-details">
              <div className="card-info">
                <strong>{selectedCard.name}</strong>
                {selectedCard.manaCost && (
                  <div className="mana-cost">{selectedCard.manaCost}</div>
                )}
                <div className="type-line">{selectedCard.type}</div>
                <div className="rarity">{selectedCard.rarity}</div>
              </div>
            </div>
          </div>
        )}

        {/* Picked Cards */}
        <div className="picked-cards-section">
          <h3>Your Picks ({humanDeck.length})</h3>
          
          {/* Color distribution */}
          <div className="color-stats">
            <div className="color-distribution">
              {Object.entries(colorStats).map(([color, count]) => (
                <div key={color} className={`color-stat color-${color.toLowerCase()}`}>
                  <span className="color-symbol">{color}</span>
                  <span className="color-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Picked cards list */}
          <div className="picked-cards-list">
            {humanDeck.length === 0 ? (
              <p className="no-picks">No cards picked yet</p>
            ) : (
              <div className="picked-cards-grid">
                {humanDeck.map(cardId => (
                  <div key={cardId} className="picked-card-item">
                    {/* This would need card data lookup */}
                    <div className="picked-card-placeholder">
                      {cardId}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="filters-section">
          <h3>Filters & Sorting</h3>
          
          {/* Sort options */}
          <div className="sort-options">
            <label htmlFor="sort-select">Sort by:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="sort-select"
            >
              <option value="cmc">Mana Cost</option>
              <option value="name">Name</option>
              <option value="color">Color</option>
              <option value="rarity">Rarity</option>
              <option value="type">Type</option>
            </select>
          </div>

          {/* Color filters */}
          <div className="color-filters">
            <div className="filter-label">Colors:</div>
            <div className="color-filter-buttons">
              {['W', 'U', 'B', 'R', 'G'].map(color => (
                <button
                  key={color}
                  onClick={() => handleColorFilter(color)}
                  className={`color-filter-btn color-${color.toLowerCase()} ${
                    filterBy.colors.includes(color) ? 'active' : ''
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
              className="btn btn-secondary btn-sm"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Draft Statistics */}
        <div className="stats-section">
          <h3>Draft Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Round:</span>
              <span className="stat-value">{currentDraft.currentRound}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pick:</span>
              <span className="stat-value">{currentDraft.currentPick}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cards:</span>
              <span className="stat-value">{humanDeck.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Status:</span>
              <span className="stat-value">{currentDraft.status}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
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