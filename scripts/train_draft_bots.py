#!/usr/bin/env python3
"""
FlashDraft - ML Bot Training Script

Trains pairwise ranking models for draft bots using 17lands data.
Creates bot personalities with different skill levels.
"""

import os
import sys
import json
import pickle
import argparse
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple, Any
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Constants
DATA_DIR = Path(__file__).parent.parent / "data"
MODELS_DIR = DATA_DIR / "models"
PROCESSED_DATA_DIR = DATA_DIR / "17lands" / "processed"

# Bot personality configurations
BOT_PERSONALITIES = {
    'bronze': {
        'name': 'Bronze Bot',
        'skill_level': 0.3,
        'randomness': 0.4,
        'rare_bias': 1.5,  # Overvalues rares
        'color_commitment': 0.5,  # Poor color discipline
        'description': 'New player - picks rares highly, poor signals'
    },
    'silver': {
        'name': 'Silver Bot',
        'skill_level': 0.5,
        'randomness': 0.3,
        'rare_bias': 1.2,
        'color_commitment': 0.7,
        'description': 'Intermediate - decent card evaluation, some signals'
    },
    'gold': {
        'name': 'Gold Bot',
        'skill_level': 0.7,
        'randomness': 0.2,
        'rare_bias': 1.0,
        'color_commitment': 0.85,
        'description': 'Experienced - good evaluation, reads signals'
    },
    'mythic': {
        'name': 'Mythic Bot',
        'skill_level': 0.9,
        'randomness': 0.1,
        'rare_bias': 0.9,  # Knows when to pass rares
        'color_commitment': 0.95,
        'description': 'Expert - optimal picks, excellent signals'
    }
}

def ensure_directories():
    """Create necessary directories."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Models directory: {MODELS_DIR}")

def load_17lands_data(set_code: str) -> pd.DataFrame:
    """Load processed 17lands data for a set."""
    json_path = PROCESSED_DATA_DIR / f"{set_code.lower()}_17lands.json"
    csv_path = PROCESSED_DATA_DIR / f"{set_code.lower()}_17lands.csv"
    
    if json_path.exists():
        print(f"Loading {set_code} data from JSON...")
        return pd.read_json(json_path)
    elif csv_path.exists():
        print(f"Loading {set_code} data from CSV...")
        return pd.read_csv(csv_path)
    else:
        raise FileNotFoundError(f"No 17lands data found for {set_code}")

def load_scryfall_data(set_code: str) -> pd.DataFrame:
    """Load Scryfall card data to merge with 17lands."""
    cards_path = DATA_DIR / "raw" / "cards" / f"{set_code.lower()}_cards.json"
    
    if not cards_path.exists():
        raise FileNotFoundError(f"No Scryfall data found for {set_code}")
    
    with open(cards_path, 'r') as f:
        data = json.load(f)
    
    # Extract card list
    cards = data.get('cards', [])
    df = pd.DataFrame(cards)
    
    # Select relevant columns
    columns = ['name', 'mana_cost', 'cmc', 'type_line', 'colors', 
               'color_identity', 'rarity', 'power', 'toughness']
    
    return df[columns]

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineer features for ML model training.
    
    Features include:
    - Card type indicators (creature, instant, sorcery, etc.)
    - Mana curve position
    - Color requirements
    - Power/toughness for creatures
    - Rarity encoding
    """
    # Type indicators
    df['is_creature'] = df['type_line'].str.contains('Creature', case=False).astype(int)
    df['is_instant'] = df['type_line'].str.contains('Instant', case=False).astype(int)
    df['is_sorcery'] = df['type_line'].str.contains('Sorcery', case=False).astype(int)
    df['is_enchantment'] = df['type_line'].str.contains('Enchantment', case=False).astype(int)
    df['is_artifact'] = df['type_line'].str.contains('Artifact', case=False).astype(int)
    df['is_land'] = df['type_line'].str.contains('Land', case=False).astype(int)
    
    # Rarity encoding
    rarity_map = {'common': 1, 'uncommon': 2, 'rare': 3, 'mythic': 4}
    df['rarity_score'] = df['rarity'].map(rarity_map).fillna(1)
    
    # Convert power/toughness to numeric
    df['power_num'] = pd.to_numeric(df['power'], errors='coerce').fillna(0)
    df['toughness_num'] = pd.to_numeric(df['toughness'], errors='coerce').fillna(0)
    
    # Color complexity (number of colors)
    df['num_colors'] = df['color_identity'].apply(lambda x: len(x) if isinstance(x, list) else 0)
    
    # Mana curve buckets
    df['cmc_bucket'] = pd.cut(df['cmc'], bins=[-1, 1, 2, 3, 4, 5, 100], 
                              labels=['0-1', '2', '3', '4', '5', '6+'])
    
    return df

def create_training_data(merged_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
    """
    Create feature matrix and target values for training.
    """
    # Features for the model
    feature_cols = [
        'cmc', 'is_creature', 'is_instant', 'is_sorcery', 
        'is_enchantment', 'is_artifact', 'is_land',
        'rarity_score', 'power_num', 'toughness_num', 'num_colors'
    ]
    
    # Add 17lands features if available
    if 'pick_rating' in merged_df.columns:
        feature_cols.extend(['pick_rate', 'win_rate_delta'])
    
    X = merged_df[feature_cols].fillna(0).values
    
    # Target is the pick rating (0-100 scale)
    y = merged_df['pick_rating'].values if 'pick_rating' in merged_df.columns else None
    
    return X, y

def train_base_model(X: np.ndarray, y: np.ndarray) -> Tuple[Any, StandardScaler]:
    """
    Train the base ranking model using Random Forest.
    """
    print("Training base model...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Model performance:")
    print(f"  MSE: {mse:.2f}")
    print(f"  R²: {r2:.3f}")
    
    return model, scaler

def create_bot_personalities(base_model: Any, scaler: StandardScaler, 
                           set_code: str) -> Dict[str, Any]:
    """
    Create different bot personalities based on the base model.
    """
    personalities = {}
    
    for bot_id, config in BOT_PERSONALITIES.items():
        print(f"\nCreating {config['name']}...")
        
        personality = {
            'id': bot_id,
            'set_code': set_code,
            'base_model': base_model,
            'scaler': scaler,
            'config': config,
            'created_at': pd.Timestamp.now().isoformat()
        }
        
        personalities[bot_id] = personality
    
    return personalities

def save_models(personalities: Dict[str, Any], set_code: str):
    """Save trained models and configurations."""
    set_models_dir = MODELS_DIR / set_code.lower()
    set_models_dir.mkdir(exist_ok=True)
    
    for bot_id, personality in personalities.items():
        # Save as pickle
        model_path = set_models_dir / f"{bot_id}_bot.pkl"
        with open(model_path, 'wb') as f:
            pickle.dump(personality, f)
        print(f"Saved {bot_id} bot to {model_path}")
    
    # Save metadata
    meta_path = set_models_dir / "metadata.json"
    metadata = {
        'set_code': set_code,
        'bot_types': list(personalities.keys()),
        'created_at': pd.Timestamp.now().isoformat(),
        'features': ['cmc', 'is_creature', 'is_instant', 'is_sorcery', 
                    'is_enchantment', 'is_artifact', 'is_land',
                    'rarity_score', 'power_num', 'toughness_num', 'num_colors']
    }
    
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)

def train_set_bots(set_code: str):
    """Train all bot personalities for a given set."""
    print(f"\nTraining bots for {set_code}")
    print("="*50)
    
    try:
        # Load 17lands data
        lands_df = load_17lands_data(set_code)
        print(f"Loaded {len(lands_df)} cards from 17lands")
        
        # Load Scryfall data
        scryfall_df = load_scryfall_data(set_code)
        print(f"Loaded {len(scryfall_df)} cards from Scryfall")
        
        # Merge datasets on card name
        merged_df = pd.merge(
            scryfall_df, lands_df, 
            on='name', 
            how='inner',
            suffixes=('_scryfall', '_17lands')
        )
        print(f"Merged {len(merged_df)} cards")
        
        # Engineer features
        featured_df = engineer_features(merged_df)
        
        # Create training data
        X, y = create_training_data(featured_df)
        
        if y is None:
            print("Warning: No pick ratings found, using fallback ranking")
            # Fallback: use rarity and CMC for basic ranking
            y = 50 + (featured_df['rarity_score'] * 10) - (featured_df['cmc'] * 2)
            y = np.clip(y, 0, 100)
        
        # Train base model
        base_model, scaler = train_base_model(X, y)
        
        # Create bot personalities
        personalities = create_bot_personalities(base_model, scaler, set_code)
        
        # Save models
        save_models(personalities, set_code)
        
        print(f"\n✓ Successfully trained {len(personalities)} bot personalities for {set_code}")
        
    except FileNotFoundError as e:
        print(f"✗ Error: {e}")
        print(f"  Please run download_17lands_data.py first for {set_code}")
    except Exception as e:
        print(f"✗ Error training {set_code}: {e}")
        import traceback
        traceback.print_exc()

def main():
    parser = argparse.ArgumentParser(
        description='Train ML draft bots using 17lands data'
    )
    parser.add_argument(
        '--set', '-s',
        type=str,
        help='Set code to train (e.g., DTK)'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Train bots for all available sets'
    )
    
    args = parser.parse_args()
    
    ensure_directories()
    
    if args.all:
        # Find all available processed data
        available_sets = []
        if PROCESSED_DATA_DIR.exists():
            for f in PROCESSED_DATA_DIR.glob("*_17lands.json"):
                set_code = f.stem.replace('_17lands', '').upper()
                available_sets.append(set_code)
        
        if not available_sets:
            print("No processed 17lands data found!")
            print("Please run download_17lands_data.py first")
            return
        
        print(f"Found data for: {', '.join(available_sets)}")
        for set_code in available_sets:
            train_set_bots(set_code)
    
    elif args.set:
        train_set_bots(args.set.upper())
    
    else:
        print("Please specify --set CODE or --all")

if __name__ == "__main__":
    main()