#!/usr/bin/env node
/**
 * FlashDraft - Cache Missing Card Images
 * 
 * Downloads and caches card images for sets, with special handling for transform cards.
 */

import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'public', 'images', 'cards');
const DATA_DIR = path.join(process.cwd(), 'data', 'raw', 'cards');

// Ensure cache directory exists
async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

// Generate cache key for image
function generateCacheKey(cardId, size = 'normal') {
  return crypto.createHash('md5').update(`${cardId}_${size}`).digest('hex');
}

// Download image from URL
async function downloadImage(url, localPath) {
  return new Promise((resolve) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        resolve({ success: false, error: `HTTP ${response.statusCode}` });
        return;
      }

      const fileStream = fs.open(localPath, 'w');
      let size = 0;

      fileStream.then(fileHandle => {
        const writeStream = fileHandle.createWriteStream();
        
        response.on('data', (chunk) => {
          size += chunk.length;
          writeStream.write(chunk);
        });

        response.on('end', async () => {
          await writeStream.end();
          await fileHandle.close();
          resolve({ success: true, size });
        });

        response.on('error', async (error) => {
          await writeStream.end();
          await fileHandle.close();
          try {
            await fs.unlink(localPath);
          } catch {}
          resolve({ success: false, error: error.message });
        });
      }).catch(error => {
        resolve({ success: false, error: error.message });
      });

    }).on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

// Get image URL from card (handles transform cards)
function getCardImageUrl(card, size = 'normal') {
  // Try top-level image_uris first
  if (card.image_uris && card.image_uris[size]) {
    return card.image_uris[size];
  }
  
  // For transform cards, use first face
  if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
    return card.card_faces[0].image_uris[size];
  }
  
  return null;
}

// Cache image for a card
async function cacheCardImage(card, size = 'normal') {
  const imageUrl = getCardImageUrl(card, size);
  
  if (!imageUrl) {
    return { success: false, error: `No ${size} image URL found` };
  }

  const cacheKey = generateCacheKey(card.id, size);
  const ext = size === 'png' ? 'png' : 'jpg';
  const localPath = path.join(CACHE_DIR, `${cacheKey}.${ext}`);

  // Check if already cached
  try {
    await fs.access(localPath);
    return { success: true, cached: true, path: localPath };
  } catch {
    // File doesn't exist, need to download
  }

  console.log(`Downloading ${size} image for ${card.name}...`);
  const result = await downloadImage(imageUrl, localPath);
  
  if (result.success) {
    return { success: true, cached: false, path: localPath, size: result.size };
  } else {
    return { success: false, error: result.error };
  }
}

// Cache images for a set
async function cacheSetImages(setCode) {
  const setFile = path.join(DATA_DIR, `${setCode.toLowerCase()}_cards.json`);
  
  try {
    const data = await fs.readFile(setFile, 'utf-8');
    const setData = JSON.parse(data);
    const cards = setData.cards || setData; // Handle both formats
    
    console.log(`Caching images for ${cards.length} cards from ${setCode.toUpperCase()}...`);
    
    let successful = 0;
    let failed = 0;
    let cached = 0;
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      
      console.log(`[${i + 1}/${cards.length}] Processing ${card.name}...`);
      
      // Cache normal size image
      const result = await cacheCardImage(card, 'normal');
      
      if (result.success) {
        if (result.cached) {
          cached++;
          console.log(`  ✓ Already cached`);
        } else {
          successful++;
          console.log(`  ✓ Downloaded (${Math.round(result.size / 1024)}KB)`);
        }
      } else {
        failed++;
        console.log(`  ✗ Failed: ${result.error}`);
      }
      
      // Small delay to be nice to Scryfall
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\nCompleted ${setCode.toUpperCase()}:`);
    console.log(`  ${successful} downloaded`);
    console.log(`  ${cached} already cached`);
    console.log(`  ${failed} failed`);
    
  } catch (error) {
    console.error(`Error processing ${setCode}: ${error.message}`);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node cache_missing_images.js <set1> [set2] ...');
    console.log('Example: node cache_missing_images.js fin dtk');
    process.exit(1);
  }
  
  await ensureCacheDir();
  
  for (const setCode of args) {
    await cacheSetImages(setCode);
    console.log(''); // Empty line between sets
  }
  
  console.log('Image caching complete!');
}

main().catch(console.error);