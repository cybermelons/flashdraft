#!/usr/bin/env python3
"""
FlashDraft - Image Cache Management Script

Downloads and caches MTG card images for offline draft simulation.
Works with the TypeScript image cache system.
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Any
import requests
from urllib.parse import urljoin
import hashlib

# Cache directories
CACHE_DIR = Path(__file__).parent.parent / "public" / "images" / "cards"
DATA_DIR = Path(__file__).parent.parent / "data" / "raw" / "cards"

# Rate limiting for Scryfall
REQUEST_DELAY = 0.1  # 100ms between requests

class ImageCacheManager:
    """Python implementation of image caching to work with TypeScript system."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'FlashDraft-MTG-Simulator/0.1.0'
        })
        
        # Ensure cache directory exists
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    def generate_cache_key(self, card_id: str, size: str) -> str:
        """Generate cache key compatible with TypeScript implementation."""
        return hashlib.md5(f"{card_id}_{size}".encode()).hexdigest()
    
    def get_cached_path(self, card_id: str, size: str) -> Path:
        """Get local cache file path."""
        cache_key = self.generate_cache_key(card_id, size)
        ext = "png" if size == "png" else "jpg"
        return CACHE_DIR / f"{cache_key}.{ext}"
    
    def download_image(self, url: str, local_path: Path) -> Dict[str, Any]:
        """Download image from URL to local path."""
        try:
            time.sleep(REQUEST_DELAY)
            
            response = self.session.get(url, stream=True)
            response.raise_for_status()
            
            size = 0
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        size += len(chunk)
                        f.write(chunk)
            
            return {
                'success': True,
                'size': size,
                'etag': response.headers.get('etag')
            }
            
        except Exception as e:
            # Clean up partial file
            if local_path.exists():
                local_path.unlink()
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def cache_card_images(self, card: Dict[str, Any], sizes: List[str] = ['normal']) -> Dict[str, Any]:
        """Cache images for a single card."""
        results = {}
        
        image_uris = card.get('image_uris', {})
        if not image_uris:
            return {'error': f"No image URIs for card {card['name']}"}
        
        for size in sizes:
            if size not in image_uris:
                results[size] = {'error': f"No {size} image available"}
                continue
            
            local_path = self.get_cached_path(card['id'], size)
            
            # Skip if already cached
            if local_path.exists():
                results[size] = {
                    'success': True,
                    'cached': True,
                    'path': str(local_path)
                }
                continue
            
            print(f"  Downloading {size} image for {card['name']}...")
            result = self.download_image(image_uris[size], local_path)
            
            if result['success']:
                results[size] = {
                    'success': True,
                    'cached': False,
                    'path': str(local_path),
                    'size': result['size']
                }
            else:
                results[size] = result
        
        return results
    
    def cache_set_images(self, set_code: str, sizes: List[str] = ['normal'], force: bool = False) -> Dict[str, Any]:
        """Cache images for all cards in a set."""
        # Load set data
        set_file = DATA_DIR / f"{set_code.lower()}_cards.json"
        
        if not set_file.exists():
            return {
                'error': f"Set data for {set_code} not found. Run download script first."
            }
        
        with open(set_file, 'r') as f:
            set_data = json.load(f)
        
        cards = set_data['cards']
        print(f"Caching images for {len(cards)} cards in set {set_code.upper()}...")
        
        results = {
            'set_code': set_code.upper(),
            'total_cards': len(cards),
            'successful': 0,
            'failed': 0,
            'skipped': 0,
            'errors': [],
            'total_size': 0
        }
        
        for i, card in enumerate(cards, 1):
            if not card.get('image_uris'):
                results['skipped'] += 1
                continue
            
            print(f"[{i}/{len(cards)}] {card['name']}")
            
            card_results = self.cache_card_images(card, sizes)
            
            if 'error' in card_results:
                results['failed'] += 1
                results['errors'].append({
                    'card': card['name'],
                    'error': card_results['error']
                })
                continue
            
            card_success = True
            for size, size_result in card_results.items():
                if size_result.get('success'):
                    if not size_result.get('cached'):
                        results['total_size'] += size_result.get('size', 0)
                else:
                    card_success = False
                    results['errors'].append({
                        'card': card['name'],
                        'size': size,
                        'error': size_result.get('error', 'Unknown error')
                    })
            
            if card_success:
                results['successful'] += 1
            else:
                results['failed'] += 1
        
        return results
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        if not CACHE_DIR.exists():
            return {
                'total_files': 0,
                'total_size': 0,
                'cache_dir': str(CACHE_DIR)
            }
        
        total_files = 0
        total_size = 0
        
        for file_path in CACHE_DIR.iterdir():
            if file_path.is_file() and file_path.suffix in ['.jpg', '.png']:
                total_files += 1
                total_size += file_path.stat().st_size
        
        return {
            'total_files': total_files,
            'total_size': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'cache_dir': str(CACHE_DIR)
        }


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(
        description="Cache MTG card images for FlashDraft"
    )
    parser.add_argument(
        'set_code',
        nargs='?',
        help="MTG set code to cache images for (e.g., 'FIN', 'DTK')"
    )
    parser.add_argument(
        '--sizes',
        nargs='+',
        default=['normal'],
        choices=['small', 'normal', 'large', 'png'],
        help="Image sizes to cache (default: normal)"
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help="Re-download existing cached images"
    )
    parser.add_argument(
        '--stats',
        action='store_true',
        help="Show cache statistics and exit"
    )
    
    args = parser.parse_args()
    
    cache_manager = ImageCacheManager()
    
    if args.stats:
        stats = cache_manager.get_cache_stats()
        print("Image Cache Statistics:")
        print(f"  Total files: {stats['total_files']}")
        print(f"  Total size: {stats['total_size_mb']} MB")
        print(f"  Cache directory: {stats['cache_dir']}")
        return
    
    if not args.set_code:
        print("Error: set_code is required when not using --stats")
        parser.print_help()
        sys.exit(1)
    
    print(f"Caching {', '.join(args.sizes)} images for set {args.set_code.upper()}...")
    
    try:
        results = cache_manager.cache_set_images(
            args.set_code, 
            args.sizes, 
            args.force
        )
        
        if 'error' in results:
            print(f"Error: {results['error']}")
            sys.exit(1)
        
        print(f"\nResults for {results['set_code']}:")
        print(f"  Total cards: {results['total_cards']}")
        print(f"  Successful: {results['successful']}")
        print(f"  Failed: {results['failed']}")
        print(f"  Skipped: {results['skipped']}")
        print(f"  Downloaded size: {round(results['total_size'] / (1024 * 1024), 2)} MB")
        
        if results['errors']:
            print(f"\nErrors ({len(results['errors'])}):")
            for error in results['errors'][:10]:  # Show first 10 errors
                if 'size' in error:
                    print(f"  {error['card']} ({error['size']}): {error['error']}")
                else:
                    print(f"  {error['card']}: {error['error']}")
            
            if len(results['errors']) > 10:
                print(f"  ... and {len(results['errors']) - 10} more")
    
    except Exception as e:
        print(f"Error caching images: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()