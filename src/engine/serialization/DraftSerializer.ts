/**
 * Enhanced serialization system for DraftSession
 * 
 * Provides robust save/load functionality with version management
 * and extensibility for future ML bot models.
 */

import type { 
  DraftState, 
  DraftAction, 
  DraftConfig, 
  SerializedDraft,
  BotPersonality 
} from '../types/core';
import type { ActionResult } from '../types/errors';

// ============================================================================
// SERIALIZATION INTERFACES
// ============================================================================

export interface SerializationOptions {
  includeSetData?: boolean; // Whether to include full set data in serialization
  compressHistory?: boolean; // Whether to compress action history
  includeMetadata?: boolean; // Whether to include performance metadata
}

export interface DraftMetadata {
  playerCount: number;
  setCode: string;
  totalPicks: number;
  completedRounds: number;
  averagePickTime?: number; // For future timing analysis
  botPersonalities: BotPersonality[];
  draftStartTime: number;
  lastUpdateTime: number;
}

export interface EnhancedSerializedDraft extends SerializedDraft {
  metadata: DraftMetadata;
  checksum: string; // For integrity verification
  format: 'enhanced' | 'compact' | 'ml-training'; // Different serialization formats
}

// ============================================================================
// DRAFT SERIALIZER CLASS
// ============================================================================

export class DraftSerializer {
  private readonly currentVersion = '1.1.0';
  
  /**
   * Serialize a draft state with enhanced options
   */
  serialize(
    state: DraftState, 
    options: SerializationOptions = {}
  ): ActionResult<string> {
    try {
      const {
        includeSetData = false,
        compressHistory = false,
        includeMetadata = true
      } = options;

      if (includeMetadata) {
        // Create enhanced serialized draft with metadata and checksum
        const serialized: EnhancedSerializedDraft = {
          id: state.id,
          config: includeSetData ? state.config : this.createConfigWithoutSetData(state.config),
          history: compressHistory ? this.compressHistory(state.history) : state.history,
          timestamp: Date.now(),
          version: this.currentVersion,
          metadata: this.createMetadata(state),
          checksum: '',
          format: 'enhanced'
        };

        // Calculate checksum for integrity
        serialized.checksum = this.calculateChecksum(serialized);

        return {
          success: true,
          data: JSON.stringify(serialized, null, 2)
        };
      } else {
        // Create basic serialized draft without metadata/checksum
        const basic: SerializedDraft = {
          id: state.id,
          config: includeSetData ? state.config : this.createConfigWithoutSetData(state.config),
          history: compressHistory ? this.compressHistory(state.history) : state.history,
          timestamp: Date.now(),
          version: this.currentVersion
        };

        return {
          success: true,
          data: JSON.stringify(basic)
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'SERIALIZATION_ERROR',
          message: 'Failed to serialize draft state',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Deserialize a draft state with validation
   */
  deserialize(data: string): ActionResult<SerializedDraft> {
    try {
      const parsed = JSON.parse(data);
      
      // Version compatibility check
      const versionResult = this.validateVersion(parsed.version);
      if (!versionResult.success) {
        return versionResult;
      }

      // Checksum validation for enhanced format
      if (parsed.format === 'enhanced' && parsed.checksum) {
        const checksumResult = this.validateChecksum(parsed);
        if (!checksumResult.success) {
          return checksumResult;
        }
      }

      // Migrate if needed
      const migrated = this.migrate(parsed);
      
      return {
        success: true,
        data: migrated
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'DESERIALIZATION_ERROR',
          message: 'Failed to parse draft data',
          details: error instanceof Error ? error.message : 'Invalid JSON'
        }
      };
    }
  }

  /**
   * Serialize for ML training data (compact format with relevant features)
   */
  serializeForMLTraining(state: DraftState): ActionResult<string> {
    try {
      const trainingData = {
        id: state.id,
        setCode: state.config.setCode,
        playerCount: state.config.playerCount,
        history: state.history.filter(action => action.type === 'MAKE_PICK'),
        picks: this.extractPickSequence(state),
        metadata: {
          format: 'ml-training',
          version: this.currentVersion,
          timestamp: Date.now()
        }
      };

      return {
        success: true,
        data: JSON.stringify(trainingData)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'SERIALIZATION_ERROR',
          message: 'Failed to serialize for ML training',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private createConfigWithoutSetData(config: DraftConfig): any {
    const { setData, ...configWithoutSetData } = config;
    return configWithoutSetData;
  }

  private createMetadata(state: DraftState): DraftMetadata {
    const totalPicks = state.players.reduce((sum, player) => sum + player.pickedCards.length, 0);
    
    return {
      playerCount: state.players.length,
      setCode: state.config.setCode,
      totalPicks,
      completedRounds: state.currentRound - 1,
      botPersonalities: state.players
        .filter(p => !p.isHuman)
        .map(p => p.personality || 'silver'),
      draftStartTime: state.createdAt,
      lastUpdateTime: state.updatedAt
    };
  }

  private compressHistory(history: DraftAction[]): DraftAction[] {
    // For now, just return as-is. Could implement compression in the future
    // e.g., remove redundant actions, compress pick sequences, etc.
    return history;
  }

  private calculateChecksum(serialized: Omit<EnhancedSerializedDraft, 'checksum'>): string {
    // Simple checksum - in production might use a proper hash function
    // Create a deterministic string representation by sorting keys recursively
    const content = this.stringifyDeterministic(serialized);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private stringifyDeterministic(obj: any, seen = new WeakSet()): string {
    if (obj === null || obj === undefined) {
      return String(obj);
    }
    
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return JSON.stringify(obj);
    }
    
    if (typeof obj === 'object') {
      // Check for circular references
      if (seen.has(obj)) {
        throw new Error('Converting circular structure to checksum string');
      }
      seen.add(obj);
      
      let result: string;
      if (Array.isArray(obj)) {
        result = '[' + obj.map(item => this.stringifyDeterministic(item, seen)).join(',') + ']';
      } else {
        const keys = Object.keys(obj).sort();
        const pairs = keys.map(key => `"${key}":${this.stringifyDeterministic(obj[key], seen)}`);
        result = '{' + pairs.join(',') + '}';
      }
      
      seen.delete(obj);
      return result;
    }
    
    return String(obj);
  }

  private validateVersion(version: string): ActionResult<void> {
    const supportedVersions = ['1.0.0', '1.1.0'];
    
    if (!supportedVersions.includes(version)) {
      return {
        success: false,
        error: {
          type: 'INCOMPATIBLE_VERSION',
          message: `Unsupported draft version: ${version}`,
          version,
          supportedVersions
        }
      };
    }

    return { success: true, data: undefined };
  }

  private validateChecksum(serialized: EnhancedSerializedDraft): ActionResult<void> {
    const { checksum, ...content } = serialized;
    const expectedChecksum = this.calculateChecksum(content);
    
    if (checksum !== expectedChecksum) {
      return {
        success: false,
        error: {
          type: 'SERIALIZATION_ERROR',
          message: 'Draft data integrity check failed',
          details: 'Checksum mismatch - data may be corrupted'
        }
      };
    }

    return { success: true, data: undefined };
  }

  private migrate(data: any): SerializedDraft {
    // Handle version migrations
    if (data.version === '1.0.0') {
      // Migrate from v1.0.0 to current format
      return {
        id: data.id,
        config: data.config,
        history: data.history,
        timestamp: data.timestamp,
        version: this.currentVersion
      };
    }

    // Already current version or newer format
    return data;
  }

  private extractPickSequence(state: DraftState): Array<{
    playerId: string;
    cardId: string;
    round: number;
    pick: number;
    packPosition: number;
    isHuman: boolean;
    personality?: BotPersonality;
  }> {
    const picks: any[] = [];
    
    // Extract pick data for ML training
    state.history.forEach((action, index) => {
      if (action.type === 'MAKE_PICK') {
        const player = state.players.find(p => p.id === action.playerId);
        if (player) {
          picks.push({
            playerId: action.playerId,
            cardId: action.cardId,
            round: Math.floor(index / (state.players.length * 15)) + 1,
            pick: (index % 15) + 1,
            packPosition: player.position,
            isHuman: player.isHuman,
            personality: player.personality
          });
        }
      }
    });

    return picks;
  }
}

// ============================================================================
// PERSISTENCE UTILITIES
// ============================================================================

export interface DraftPersistence {
  save(draftId: string, serializedData: string): Promise<boolean>;
  load(draftId: string): Promise<string | null>;
  list(): Promise<string[]>;
  delete(draftId: string): Promise<boolean>;
}

export class LocalStoragePersistence implements DraftPersistence {
  private readonly keyPrefix = 'flashdraft_';

  async save(draftId: string, serializedData: string): Promise<boolean> {
    try {
      const key = this.keyPrefix + draftId;
      localStorage.setItem(key, serializedData);
      
      // Update draft list
      await this.updateDraftList(draftId);
      
      return true;
    } catch (error) {
      console.error('Failed to save draft:', error);
      return false;
    }
  }

  async load(draftId: string): Promise<string | null> {
    try {
      const key = this.keyPrefix + draftId;
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  async list(): Promise<string[]> {
    try {
      const listKey = this.keyPrefix + 'list';
      const listData = localStorage.getItem(listKey);
      return listData ? JSON.parse(listData) : [];
    } catch (error) {
      console.error('Failed to list drafts:', error);
      return [];
    }
  }

  async delete(draftId: string): Promise<boolean> {
    try {
      const key = this.keyPrefix + draftId;
      localStorage.removeItem(key);
      
      // Update draft list
      await this.removeDraftFromList(draftId);
      
      return true;
    } catch (error) {
      console.error('Failed to delete draft:', error);
      return false;
    }
  }

  private async updateDraftList(draftId: string): Promise<void> {
    const drafts = await this.list();
    if (!drafts.includes(draftId)) {
      drafts.push(draftId);
      const listKey = this.keyPrefix + 'list';
      localStorage.setItem(listKey, JSON.stringify(drafts));
    }
  }

  private async removeDraftFromList(draftId: string): Promise<void> {
    const drafts = await this.list();
    const filtered = drafts.filter(id => id !== draftId);
    const listKey = this.keyPrefix + 'list';
    localStorage.setItem(listKey, JSON.stringify(filtered));
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createDraftSerializer(): DraftSerializer {
  return new DraftSerializer();
}

export function createLocalStoragePersistence(): LocalStoragePersistence {
  return new LocalStoragePersistence();
}

// ============================================================================
// FUTURE ML INTEGRATION HOOKS
// ============================================================================

/**
 * Interface for future ML bot models
 * 
 * This provides a clean extension point for adding ML-based bots
 * that can be trained on 17lands data or other datasets.
 */
export interface MLBotModel {
  readonly modelId: string;
  readonly version: string;
  readonly trainingData: string; // Description of training data used
  
  predict(
    availableCards: any[],
    pickedCards: any[],
    draftContext: any
  ): Promise<{ cardId: string; confidence: number }>;
  
  serialize(): string;
  deserialize(data: string): boolean;
}

/**
 * Registry for ML bot models
 * 
 * Allows dynamic loading of different ML models as bot personalities
 */
export class MLBotRegistry {
  private models = new Map<string, MLBotModel>();

  register(personality: string, model: MLBotModel): void {
    this.models.set(personality, model);
  }

  get(personality: string): MLBotModel | undefined {
    return this.models.get(personality);
  }

  list(): string[] {
    return Array.from(this.models.keys());
  }

  async loadModel(personality: string, modelData: string): Promise<boolean> {
    // Future implementation would load ML models
    // For now, just a placeholder
    return false;
  }
}