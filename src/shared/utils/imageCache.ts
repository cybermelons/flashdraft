/**
 * FlashDraft - Card Image Caching System
 * 
 * Handles downloading, caching, and optimization of MTG card images
 * from Scryfall for offline draft simulation.
 */

import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import type { MTGCard, MTGImageUris } from '../types/card';

// Cache directory structure
const CACHE_DIR = path.join(process.cwd(), 'public', 'images', 'cards');
const CACHE_INDEX_FILE = path.join(CACHE_DIR, '_cache_index.json');

// Image size preferences for different contexts
export type ImageSize = 'small' | 'normal' | 'large' | 'png';

export interface ImageCacheEntry {
  card_id: string;
  card_name: string;
  sizes: Partial<Record<ImageSize, {
    local_path: string;
    original_url: string;
    file_size: number;
    cached_at: number;
    etag?: string;
  }>>;
  last_accessed: number;
}

export interface ImageCacheIndex {
  entries: Record<string, ImageCacheEntry>;
  stats: {
    total_images: number;
    total_size_bytes: number;
    last_cleanup: number;
  };
}

class ImageCacheManager {
  private index: ImageCacheIndex | null = null;
  private indexLoaded = false;

  async ensureCacheDir(): Promise<void> {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }

  async loadIndex(): Promise<ImageCacheIndex> {
    if (this.index && this.indexLoaded) return this.index;

    try {
      const data = await fs.readFile(CACHE_INDEX_FILE, 'utf-8');
      this.index = JSON.parse(data);
    } catch (error) {
      // Create new index if file doesn't exist
      this.index = {
        entries: {},
        stats: {
          total_images: 0,
          total_size_bytes: 0,
          last_cleanup: Date.now()
        }
      };
    }

    this.indexLoaded = true;
    return this.index;
  }

  async saveIndex(): Promise<void> {
    if (!this.index) return;
    
    await this.ensureCacheDir();
    await fs.writeFile(CACHE_INDEX_FILE, JSON.stringify(this.index, null, 2));
  }

  generateCacheKey(cardId: string, size: ImageSize): string {
    return crypto.createHash('md5').update(`${cardId}_${size}`).digest('hex');
  }

  getCachedImagePath(cardId: string, size: ImageSize): string {
    const cacheKey = this.generateCacheKey(cardId, size);
    const ext = size === 'png' ? 'png' : 'jpg';
    return path.join(CACHE_DIR, `${cacheKey}.${ext}`);
  }

  getPublicImagePath(cardId: string, size: ImageSize): string {
    const cacheKey = this.generateCacheKey(cardId, size);
    const ext = size === 'png' ? 'png' : 'jpg';
    return `/images/cards/${cacheKey}.${ext}`;
  }

  async downloadImage(url: string, localPath: string): Promise<{
    success: boolean;
    size: number;
    etag?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const file = fs.open(localPath, 'w');
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          resolve({
            success: false,
            size: 0,
            error: `HTTP ${response.statusCode}: ${response.statusMessage}`
          });
          return;
        }

        let size = 0;
        const etag = response.headers.etag;

        file.then(fileHandle => {
          const writeStream = fileHandle.createWriteStream();
          
          response.on('data', (chunk) => {
            size += chunk.length;
            writeStream.write(chunk);
          });

          response.on('end', async () => {
            await writeStream.end();
            await fileHandle.close();
            resolve({ success: true, size, etag });
          });

          response.on('error', async (error) => {
            await writeStream.end();
            await fileHandle.close();
            // Clean up partial file
            try {
              await fs.unlink(localPath);
            } catch {}
            resolve({ success: false, size: 0, error: error.message });
          });
        }).catch(error => {
          resolve({ success: false, size: 0, error: error.message });
        });

      }).on('error', (error) => {
        resolve({ success: false, size: 0, error: error.message });
      });
    });
  }

  async cacheCardImage(
    card: MTGCard, 
    size: ImageSize = 'normal',
    force: boolean = false
  ): Promise<{
    success: boolean;
    local_path?: string;
    public_path?: string;
    error?: string;
    from_cache?: boolean;
  }> {
    const index = await this.loadIndex();
    const localPath = this.getCachedImagePath(card.id, size);
    const publicPath = this.getPublicImagePath(card.id, size);

    // Check if already cached (unless force refresh)
    if (!force && index.entries[card.id]?.sizes[size]) {
      const entry = index.entries[card.id].sizes[size]!;
      
      // Verify file still exists
      try {
        await fs.access(entry.local_path);
        
        // Update last accessed time
        index.entries[card.id].last_accessed = Date.now();
        await this.saveIndex();
        
        return {
          success: true,
          local_path: entry.local_path,
          public_path: publicPath,
          from_cache: true
        };
      } catch {
        // File was deleted, remove from index and re-download
        delete index.entries[card.id].sizes[size];
      }
    }

    // Get image URL
    const imageUris = card.image_uris;
    if (!imageUris || !imageUris[size]) {
      return {
        success: false,
        error: `No ${size} image available for card ${card.name}`
      };
    }

    await this.ensureCacheDir();

    // Download image
    console.log(`Downloading ${size} image for ${card.name}...`);
    const downloadResult = await this.downloadImage(imageUris[size], localPath);

    if (!downloadResult.success) {
      return {
        success: false,
        error: downloadResult.error
      };
    }

    // Update cache index
    if (!index.entries[card.id]) {
      index.entries[card.id] = {
        card_id: card.id,
        card_name: card.name,
        sizes: {},
        last_accessed: Date.now()
      };
    }

    index.entries[card.id].sizes[size] = {
      local_path: localPath,
      original_url: imageUris[size],
      file_size: downloadResult.size,
      cached_at: Date.now(),
      etag: downloadResult.etag
    };

    index.entries[card.id].last_accessed = Date.now();

    // Update stats
    index.stats.total_images++;
    index.stats.total_size_bytes += downloadResult.size;

    await this.saveIndex();

    return {
      success: true,
      local_path: localPath,
      public_path: publicPath,
      from_cache: false
    };
  }

  async cacheSetImages(
    cards: MTGCard[],
    sizes: ImageSize[] = ['normal'],
    onProgress?: (current: number, total: number, cardName: string) => void
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ card: string; error: string }>;
  }> {
    const result = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ card: string; error: string }>
    };

    const total = cards.length * sizes.length;
    let current = 0;

    for (const card of cards) {
      for (const size of sizes) {
        current++;
        onProgress?.(current, total, card.name);

        try {
          const cacheResult = await this.cacheCardImage(card, size);
          
          if (cacheResult.success) {
            result.successful++;
          } else {
            result.failed++;
            result.errors.push({
              card: card.name,
              error: cacheResult.error || 'Unknown error'
            });
          }

          // Small delay to avoid overwhelming Scryfall
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          result.failed++;
          result.errors.push({
            card: card.name,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return result;
  }

  async getCachedImagePath(cardId: string, size: ImageSize = 'normal'): Promise<string | null> {
    const index = await this.loadIndex();
    const entry = index.entries[cardId]?.sizes[size];
    
    if (!entry) return null;

    // Verify file exists
    try {
      await fs.access(entry.local_path);
      
      // Update last accessed
      index.entries[cardId].last_accessed = Date.now();
      await this.saveIndex();
      
      return this.getPublicImagePath(cardId, size);
    } catch {
      // Remove from index if file doesn't exist
      delete index.entries[cardId].sizes[size];
      await this.saveIndex();
      return null;
    }
  }

  async cleanupCache(options: {
    maxAge?: number; // milliseconds
    maxSize?: number; // bytes
    dryRun?: boolean;
  } = {}): Promise<{
    removed_files: number;
    freed_bytes: number;
    errors: string[];
  }> {
    const {
      maxAge = 30 * 24 * 60 * 60 * 1000, // 30 days
      maxSize = 1024 * 1024 * 1024, // 1GB
      dryRun = false
    } = options;

    const index = await this.loadIndex();
    const now = Date.now();
    const result = {
      removed_files: 0,
      freed_bytes: 0,
      errors: [] as string[]
    };

    const toRemove: Array<{ cardId: string; size: ImageSize; entry: any }> = [];

    // Find old files
    for (const [cardId, cardEntry] of Object.entries(index.entries)) {
      if (now - cardEntry.last_accessed > maxAge) {
        for (const [size, sizeEntry] of Object.entries(cardEntry.sizes)) {
          toRemove.push({
            cardId,
            size: size as ImageSize,
            entry: sizeEntry
          });
        }
      }
    }

    // Sort by last accessed (oldest first) if we need to free space
    if (index.stats.total_size_bytes > maxSize) {
      const allEntries = Object.entries(index.entries).flatMap(([cardId, cardEntry]) =>
        Object.entries(cardEntry.sizes).map(([size, sizeEntry]) => ({
          cardId,
          size: size as ImageSize,
          entry: sizeEntry,
          last_accessed: cardEntry.last_accessed
        }))
      );

      allEntries.sort((a, b) => a.last_accessed - b.last_accessed);

      let currentSize = index.stats.total_size_bytes;
      for (const item of allEntries) {
        if (currentSize <= maxSize) break;
        
        if (!toRemove.some(r => r.cardId === item.cardId && r.size === item.size)) {
          toRemove.push(item);
          currentSize -= item.entry.file_size;
        }
      }
    }

    // Remove files
    for (const item of toRemove) {
      try {
        if (!dryRun) {
          await fs.unlink(item.entry.local_path);
          delete index.entries[item.cardId].sizes[item.size];
          
          // Remove entire card entry if no sizes left
          if (Object.keys(index.entries[item.cardId].sizes).length === 0) {
            delete index.entries[item.cardId];
          }
        }

        result.removed_files++;
        result.freed_bytes += item.entry.file_size;

      } catch (error) {
        result.errors.push(
          `Failed to remove ${item.entry.local_path}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (!dryRun) {
      // Update stats
      index.stats.total_images -= result.removed_files;
      index.stats.total_size_bytes -= result.freed_bytes;
      index.stats.last_cleanup = now;
      
      await this.saveIndex();
    }

    return result;
  }

  async getCacheStats(): Promise<{
    total_cards: number;
    total_images: number;
    total_size_mb: number;
    oldest_access: number;
    newest_access: number;
  }> {
    const index = await this.loadIndex();
    
    let oldestAccess = Date.now();
    let newestAccess = 0;

    for (const entry of Object.values(index.entries)) {
      oldestAccess = Math.min(oldestAccess, entry.last_accessed);
      newestAccess = Math.max(newestAccess, entry.last_accessed);
    }

    return {
      total_cards: Object.keys(index.entries).length,
      total_images: index.stats.total_images,
      total_size_mb: Math.round(index.stats.total_size_bytes / (1024 * 1024) * 100) / 100,
      oldest_access: oldestAccess,
      newest_access: newestAccess
    };
  }
}

// Export singleton instance
export const imageCache = new ImageCacheManager();

// Convenience functions
export async function cacheCardImage(
  card: MTGCard, 
  size: ImageSize = 'normal'
): Promise<string | null> {
  const result = await imageCache.cacheCardImage(card, size);
  return result.success ? result.public_path! : null;
}

export async function getCachedImageUrl(
  cardId: string, 
  size: ImageSize = 'normal'
): Promise<string | null> {
  return imageCache.getCachedImagePath(cardId, size);
}

export async function preloadSetImages(
  cards: MTGCard[],
  sizes: ImageSize[] = ['normal'],
  onProgress?: (current: number, total: number, cardName: string) => void
): Promise<void> {
  const result = await imageCache.cacheSetImages(cards, sizes, onProgress);
  
  if (result.failed > 0) {
    console.warn(`Failed to cache ${result.failed} images:`);
    result.errors.forEach(error => {
      console.warn(`  ${error.card}: ${error.error}`);
    });
  }
  
  console.log(`Successfully cached ${result.successful} card images`);
}
