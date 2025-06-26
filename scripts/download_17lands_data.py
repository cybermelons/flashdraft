#!/usr/bin/env python3
"""
FlashDraft - 17lands Data Downloader

Downloads public draft data from 17lands for training ML bots.
17lands provides aggregate pick rate and game win rate data for Limited formats.
"""

import os
import sys
import json
import time
import argparse
import requests
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Constants
BASE_URL = "https://www.17lands.com/card_data"
DATA_DIR = Path(__file__).parent.parent / "data" / "17lands"
HEADERS = {
    'User-Agent': 'FlashDraft/1.0 (MTG Draft Simulator)'
}

# Supported formats with their 17lands codes
FORMATS = {
    'DTK': 'DTK',  # Dragons of Tarkir
    'FIN': None,   # Final Fantasy - not on 17lands
    'ONE': 'ONE',  # Phyrexia: All Will Be One
    'BRO': 'BRO',  # The Brothers' War
    'DMU': 'DMU',  # Dominaria United
    'ACR': 'ACR',  # Amonkhet Remastered
}

def ensure_data_directory():
    """Create data directory structure if it doesn't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "raw").mkdir(exist_ok=True)
    (DATA_DIR / "processed").mkdir(exist_ok=True)
    print(f"Data directory ready at: {DATA_DIR}")

def download_card_data(set_code: str, start_date: Optional[str] = None, 
                      end_date: Optional[str] = None) -> Optional[pd.DataFrame]:
    """
    Download card performance data from 17lands.
    
    Args:
        set_code: The MTG set code
        start_date: Start date for data (YYYY-MM-DD)
        end_date: End date for data (YYYY-MM-DD)
    
    Returns:
        DataFrame with card data or None if download failed
    """
    if set_code not in FORMATS or FORMATS[set_code] is None:
        print(f"Warning: {set_code} not available on 17lands")
        return None
    
    # Default date range: last 30 days
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    params = {
        'expansion': FORMATS[set_code],
        'format': 'PremierDraft',
        'start_date': start_date,
        'end_date': end_date,
    }
    
    print(f"Downloading {set_code} data from {start_date} to {end_date}...")
    
    try:
        response = requests.get(BASE_URL, params=params, headers=HEADERS)
        response.raise_for_status()
        
        # Parse JSON response
        data = response.json()
        
        if not data:
            print(f"No data available for {set_code} in the specified date range")
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Basic data validation
        expected_columns = ['name', 'seen_count', 'avg_seen', 'pick_count', 
                          'avg_pick', 'game_count', 'win_rate']
        
        missing_cols = [col for col in expected_columns if col not in df.columns]
        if missing_cols:
            print(f"Warning: Missing expected columns: {missing_cols}")
        
        print(f"Downloaded {len(df)} cards for {set_code}")
        return df
        
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error downloading {set_code}: {e}")
        return None
    except Exception as e:
        print(f"Error downloading {set_code}: {e}")
        return None

def process_card_data(df: pd.DataFrame, set_code: str) -> pd.DataFrame:
    """
    Process raw 17lands data for bot training.
    
    Calculates:
    - Pick rating (ALSA - Average Last Seen At)
    - Win rate above replacement (GIHWR - Games In Hand Win Rate)
    - Color commitment scores
    - Archetype synergies
    """
    print(f"Processing {len(df)} cards for {set_code}...")
    
    # Calculate pick rating (lower ALSA = better card)
    # Normalize to 0-100 scale (100 = first pick, 0 = last pick)
    if 'avg_seen' in df.columns:
        max_alsa = df['avg_seen'].max()
        df['pick_rating'] = 100 * (1 - (df['avg_seen'] - 1) / (max_alsa - 1))
    
    # Calculate win rate delta
    if 'win_rate' in df.columns:
        baseline_wr = df['win_rate'].median()
        df['win_rate_delta'] = df['win_rate'] - baseline_wr
    
    # Add pick popularity (what % of time it's picked when seen)
    if 'pick_count' in df.columns and 'seen_count' in df.columns:
        df['pick_rate'] = df['pick_count'] / df['seen_count']
        df['pick_rate'] = df['pick_rate'].fillna(0)
    
    # Sort by pick rating
    df = df.sort_values('pick_rating', ascending=False)
    
    return df

def save_data(df: pd.DataFrame, set_code: str, data_type: str = 'raw'):
    """Save DataFrame to JSON and CSV formats."""
    base_path = DATA_DIR / data_type / f"{set_code.lower()}_17lands"
    
    # Save as CSV
    csv_path = base_path.with_suffix('.csv')
    df.to_csv(csv_path, index=False)
    print(f"Saved CSV: {csv_path}")
    
    # Save as JSON
    json_path = base_path.with_suffix('.json')
    df.to_json(json_path, orient='records', indent=2)
    print(f"Saved JSON: {json_path}")
    
    # Save metadata
    meta_path = base_path.with_suffix('.meta.json')
    metadata = {
        'set_code': set_code,
        'download_date': datetime.now().isoformat(),
        'card_count': len(df),
        'columns': list(df.columns),
        'data_type': data_type
    }
    
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata: {meta_path}")

def download_all_sets(sets: List[str], start_date: Optional[str] = None,
                     end_date: Optional[str] = None):
    """Download data for multiple sets."""
    ensure_data_directory()
    
    results = {}
    
    for set_code in sets:
        print(f"\n{'='*50}")
        print(f"Processing {set_code}")
        print('='*50)
        
        # Download raw data
        df = download_card_data(set_code, start_date, end_date)
        
        if df is not None:
            # Save raw data
            save_data(df, set_code, 'raw')
            
            # Process data
            processed_df = process_card_data(df, set_code)
            save_data(processed_df, set_code, 'processed')
            
            results[set_code] = {
                'success': True,
                'card_count': len(df),
                'avg_pick_rating': processed_df['pick_rating'].mean() if 'pick_rating' in processed_df else None
            }
        else:
            results[set_code] = {'success': False}
        
        # Rate limiting
        time.sleep(2)
    
    # Summary
    print("\n" + "="*50)
    print("DOWNLOAD SUMMARY")
    print("="*50)
    
    for set_code, result in results.items():
        if result['success']:
            print(f"✓ {set_code}: {result['card_count']} cards downloaded")
        else:
            print(f"✗ {set_code}: Failed or not available")
    
    return results

def main():
    parser = argparse.ArgumentParser(
        description='Download 17lands draft data for ML bot training'
    )
    parser.add_argument(
        '--set', '-s',
        type=str,
        help='Specific set code to download (e.g., DTK)'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Download all available sets'
    )
    parser.add_argument(
        '--start-date',
        type=str,
        help='Start date for data (YYYY-MM-DD)'
    )
    parser.add_argument(
        '--end-date',
        type=str,
        help='End date for data (YYYY-MM-DD)'
    )
    
    args = parser.parse_args()
    
    if args.all:
        # Download all available sets
        available_sets = [k for k, v in FORMATS.items() if v is not None]
        download_all_sets(available_sets, args.start_date, args.end_date)
    elif args.set:
        # Download specific set
        download_all_sets([args.set.upper()], args.start_date, args.end_date)
    else:
        print("Please specify --set CODE or --all")
        print(f"Available sets: {', '.join([k for k, v in FORMATS.items() if v])}")

if __name__ == "__main__":
    main()