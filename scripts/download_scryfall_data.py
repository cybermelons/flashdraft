#!/usr/bin/env python3
"""
FlashDraft - Scryfall Data Download Script

Downloads MTG set data from Scryfall API for draft simulation.
Supports downloading specific sets and caching locally.
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


# Scryfall API configuration
SCRYFALL_API_BASE = "https://api.scryfall.com"
SCRYFALL_SETS_ENDPOINT = "/sets"
SCRYFALL_CARDS_ENDPOINT = "/cards/search"

# Rate limiting (Scryfall requests 50-100ms between requests)
REQUEST_DELAY = 0.1  # 100ms between requests

# Data directories
DATA_DIR = Path(__file__).parent.parent / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
SETS_DATA_DIR = RAW_DATA_DIR / "sets"
CARDS_DATA_DIR = RAW_DATA_DIR / "cards"


class ScryfallDownloader:
    """Downloads and caches MTG set data from Scryfall API."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'FlashDraft-MTG-Simulator/0.1.0'
        })
        
        # Create data directories
        SETS_DATA_DIR.mkdir(parents=True, exist_ok=True)
        CARDS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    def _make_request(self, url: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make rate-limited request to Scryfall API."""
        time.sleep(REQUEST_DELAY)
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        
        return response.json()
    
    def get_all_sets(self) -> List[Dict[str, Any]]:
        """Download list of all MTG sets from Scryfall."""
        print("Downloading all sets from Scryfall...")
        
        url = urljoin(SCRYFALL_API_BASE, SCRYFALL_SETS_ENDPOINT)
        data = self._make_request(url)
        
        sets_data = data.get('data', [])
        
        # Cache the sets data
        sets_file = SETS_DATA_DIR / "all_sets.json"
        with open(sets_file, 'w') as f:
            json.dump(sets_data, f, indent=2)
        
        print(f"Downloaded {len(sets_data)} sets, cached to {sets_file}")
        return sets_data
    
    def find_set_by_code(self, set_code: str) -> Optional[Dict[str, Any]]:
        """Find set information by set code."""
        sets_file = SETS_DATA_DIR / "all_sets.json"
        
        if not sets_file.exists():
            print("Sets data not found, downloading...")
            self.get_all_sets()
        
        with open(sets_file, 'r') as f:
            sets_data = json.load(f)
        
        for set_info in sets_data:
            if set_info.get('code', '').upper() == set_code.upper():
                return set_info
        
        return None
    
    def download_set_cards(self, set_code: str, include_extras: bool = False) -> List[Dict[str, Any]]:
        """Download all cards for a specific set."""
        set_code = set_code.upper()
        print(f"Downloading cards for set: {set_code}")
        
        # Check if set exists
        set_info = self.find_set_by_code(set_code)
        if not set_info:
            raise ValueError(f"Set '{set_code}' not found in Scryfall database")
        
        print(f"Found set: {set_info['name']} ({set_info['code']})")
        print(f"Set type: {set_info.get('set_type', 'unknown')}")
        print(f"Card count: {set_info.get('card_count', 'unknown')}")
        
        # Build search query
        query = f"set:{set_code}"
        if not include_extras:
            query += " -is:extra"  # Exclude extra cards (tokens, etc.)
        
        url = urljoin(SCRYFALL_API_BASE, SCRYFALL_CARDS_ENDPOINT)
        params = {
            'q': query,
            'order': 'set',
            'unique': 'prints'
        }
        
        all_cards = []
        page = 1
        
        while True:
            print(f"Downloading page {page}...")
            
            data = self._make_request(url, params)
            cards = data.get('data', [])
            all_cards.extend(cards)
            
            print(f"Downloaded {len(cards)} cards (total: {len(all_cards)})")
            
            # Check if there are more pages
            if not data.get('has_more', False):
                break
            
            # Get next page URL
            next_page = data.get('next_page')
            if not next_page:
                break
            
            url = next_page
            params = None  # Next page URL already includes params
            page += 1
        
        # Cache the cards data
        cards_file = CARDS_DATA_DIR / f"{set_code.lower()}_cards.json"
        with open(cards_file, 'w') as f:
            json.dump({
                'set_info': set_info,
                'cards': all_cards,
                'download_timestamp': time.time(),
                'total_cards': len(all_cards)
            }, f, indent=2)
        
        print(f"Downloaded {len(all_cards)} cards for {set_code}, cached to {cards_file}")
        return all_cards
    
    def get_draft_boosters_info(self, set_code: str) -> Dict[str, Any]:
        """Get booster pack information for draft simulation."""
        set_info = self.find_set_by_code(set_code)
        if not set_info:
            raise ValueError(f"Set '{set_code}' not found")
        
        booster_info = {
            'set_code': set_code.upper(),
            'set_name': set_info['name'],
            'booster_configs': set_info.get('booster', {}),
            'card_count': set_info.get('card_count', 0),
            'set_type': set_info.get('set_type', 'unknown')
        }
        
        return booster_info


def main():
    """Main CLI interface for downloading set data."""
    parser = argparse.ArgumentParser(
        description="Download MTG set data from Scryfall API"
    )
    parser.add_argument(
        'set_code',
        nargs='?',  # Make set_code optional
        help="MTG set code to download (e.g., 'FIN', 'TDM', 'BRO')"
    )
    parser.add_argument(
        '--include-extras',
        action='store_true',
        help="Include extra cards (tokens, etc.)"
    )
    parser.add_argument(
        '--list-sets',
        action='store_true',
        help="List all available sets and exit"
    )
    
    args = parser.parse_args()
    
    downloader = ScryfallDownloader()
    
    if args.list_sets:
        print("Downloading list of all sets...")
        sets = downloader.get_all_sets()
        
        print("\nRecent sets suitable for draft:")
        for set_info in sets[:20]:  # Show first 20 sets
            set_type = set_info.get('set_type', 'unknown')
            if set_type in ['expansion', 'core', 'draft_innovation']:
                print(f"  {set_info['code'].upper():4} - {set_info['name']} ({set_info.get('card_count', '?')} cards)")
        
        return
    
    if not args.set_code:
        print("Error: set_code is required when not using --list-sets", file=sys.stderr)
        parser.print_help()
        sys.exit(1)
    
    try:
        # Download cards for the specified set
        cards = downloader.download_set_cards(args.set_code, args.include_extras)
        
        # Get booster information
        booster_info = downloader.get_draft_boosters_info(args.set_code)
        print(f"\nBooster configuration: {booster_info['booster_configs']}")
        
        print(f"\nSuccessfully downloaded {len(cards)} cards for set {args.set_code.upper()}")
        print(f"Data saved to: {CARDS_DATA_DIR / f'{args.set_code.lower()}_cards.json'}")
        
    except Exception as e:
        print(f"Error downloading set data: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()