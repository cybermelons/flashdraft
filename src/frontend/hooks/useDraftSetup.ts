/**
 * React hook for draft setup and configuration
 * 
 * Handles MTG set data loading, draft configuration, and initial setup.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DraftConfig, MTGSetData, BotPersonality } from '../../engine/types/core';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SetDataCache {
  [setCode: string]: MTGSetData;
}

export interface DraftSetupConfig {
  setCode: string;
  playerCount: number;
  botPersonalities: BotPersonality[];
}

export interface UseDraftSetupReturn {
  // Set data management
  availableSets: string[];
  setData: MTGSetData | null;
  loadingSet: boolean;
  setError: string | null;
  
  // Configuration
  config: DraftSetupConfig;
  updateConfig: (updates: Partial<DraftSetupConfig>) => void;
  
  // Actions
  loadSetData: (setCode: string) => Promise<boolean>;
  createDraftConfig: () => DraftConfig | null;
  
  // Validation
  isConfigValid: boolean;
  validationErrors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AVAILABLE_SETS = ['FIN', 'DTK', 'TEST'] as const;
const AVAILABLE_PERSONALITIES: BotPersonality[] = ['bronze', 'silver', 'gold', 'mythic'];

const DEFAULT_CONFIG: DraftSetupConfig = {
  setCode: 'FIN',
  playerCount: 8,
  botPersonalities: ['silver', 'silver', 'silver', 'silver', 'gold', 'gold', 'mythic']
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useDraftSetup(): UseDraftSetupReturn {
  // State
  const [setDataCache, setSetDataCache] = useState<SetDataCache>({});
  const [loadingSet, setLoadingSet] = useState(false);
  const [setError, setSetError] = useState<string | null>(null);
  const [config, setConfig] = useState<DraftSetupConfig>(DEFAULT_CONFIG);

  // Derived state
  const availableSets = useMemo(() => [...AVAILABLE_SETS], []);
  const setData = useMemo(() => setDataCache[config.setCode] || null, [setDataCache, config.setCode]);

  // ============================================================================
  // SET DATA MANAGEMENT
  // ============================================================================

  const loadSetData = useCallback(async (setCode: string): Promise<boolean> => {
    // Return cached data if available
    if (setDataCache[setCode]) {
      return true;
    }

    try {
      setLoadingSet(true);
      setSetError(null);

      const response = await fetch(`/api/sets/${setCode}`);
      if (!response.ok) {
        throw new Error(`Failed to load set ${setCode}: ${response.statusText}`);
      }

      const data: MTGSetData = await response.json();
      
      // Validate set data
      if (!data.cards || data.cards.length === 0) {
        throw new Error(`Set ${setCode} has no cards`);
      }

      setSetDataCache(prev => ({
        ...prev,
        [setCode]: data
      }));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to load set ${setCode}`;
      setSetError(message);
      console.error('Set loading error:', err);
      return false;
    } finally {
      setLoadingSet(false);
    }
  }, [setDataCache]);

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  const updateConfig = useCallback((updates: Partial<DraftSetupConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      
      // Adjust bot personalities array if player count changed
      if (updates.playerCount !== undefined) {
        const botCount = newConfig.playerCount - 1; // Subtract 1 for human player
        const currentBots = newConfig.botPersonalities;
        
        if (currentBots.length > botCount) {
          // Trim excess bots
          newConfig.botPersonalities = currentBots.slice(0, botCount);
        } else if (currentBots.length < botCount) {
          // Add more bots with default personality
          const additionalBots = Array(botCount - currentBots.length).fill('silver' as BotPersonality);
          newConfig.botPersonalities = [...currentBots, ...additionalBots];
        }
      }
      
      return newConfig;
    });
  }, []);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validationErrors = useMemo((): string[] => {
    const errors: string[] = [];

    // Player count validation
    if (config.playerCount < 2 || config.playerCount > 8) {
      errors.push('Player count must be between 2 and 8');
    }

    // Bot personalities validation
    const expectedBotCount = config.playerCount - 1;
    if (config.botPersonalities.length !== expectedBotCount) {
      errors.push(`Need exactly ${expectedBotCount} bot personalities for ${config.playerCount} players`);
    }

    // Set code validation
    if (!AVAILABLE_SETS.includes(config.setCode as any)) {
      errors.push(`Set code ${config.setCode} is not available`);
    }

    // Set data validation
    if (!setData && !loadingSet) {
      errors.push(`Set data for ${config.setCode} not loaded`);
    }

    return errors;
  }, [config, setData, loadingSet]);

  const isConfigValid = useMemo(() => validationErrors.length === 0, [validationErrors]);

  // ============================================================================
  // DRAFT CONFIG CREATION
  // ============================================================================

  const createDraftConfig = useCallback((): DraftConfig | null => {
    if (!setData) {
      setSetError('Set data not loaded');
      return null;
    }

    if (!isConfigValid) {
      setSetError('Configuration is invalid');
      return null;
    }

    return {
      setCode: config.setCode,
      setData: setData,
      playerCount: config.playerCount,
      humanPlayerId: 'human-1',
      botPersonalities: config.botPersonalities
    };
  }, [setData, config, isConfigValid]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Auto-load set data when set code changes
  useEffect(() => {
    if (config.setCode && !setDataCache[config.setCode] && !loadingSet) {
      loadSetData(config.setCode);
    }
  }, [config.setCode, setDataCache, loadingSet, loadSetData]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // Set data
    availableSets,
    setData,
    loadingSet,
    setError,
    
    // Configuration
    config,
    updateConfig,
    
    // Actions
    loadSetData,
    createDraftConfig,
    
    // Validation
    isConfigValid,
    validationErrors
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get available bot personalities
 */
export function getAvailableBotPersonalities(): BotPersonality[] {
  return [...AVAILABLE_PERSONALITIES];
}

/**
 * Generate random bot personalities for a given player count
 */
export function generateRandomBotPersonalities(playerCount: number): BotPersonality[] {
  const botCount = playerCount - 1; // Subtract human player
  const personalities: BotPersonality[] = [];
  
  for (let i = 0; i < botCount; i++) {
    const randomIndex = Math.floor(Math.random() * AVAILABLE_PERSONALITIES.length);
    personalities.push(AVAILABLE_PERSONALITIES[randomIndex]);
  }
  
  return personalities;
}

/**
 * Get default bot distribution for balanced gameplay
 */
export function getBalancedBotPersonalities(playerCount: number): BotPersonality[] {
  const botCount = playerCount - 1;
  const personalities: BotPersonality[] = [];
  
  // Distribute personalities based on player count
  if (botCount <= 3) {
    // Small pods: mostly silver with one gold
    personalities.push('gold');
    for (let i = 1; i < botCount; i++) {
      personalities.push('silver');
    }
  } else if (botCount <= 5) {
    // Medium pods: mix of silver and gold
    personalities.push('mythic');
    personalities.push('gold');
    for (let i = 2; i < botCount; i++) {
      personalities.push('silver');
    }
  } else {
    // Full pods: diverse skill levels
    personalities.push('mythic');
    personalities.push('gold', 'gold');
    for (let i = 3; i < botCount; i++) {
      personalities.push('silver');
    }
  }
  
  return personalities;
}