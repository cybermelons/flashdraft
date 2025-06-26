"""
FlashDraft - ML Bot Service

Loads trained ML models and provides pick recommendations for draft bots.
"""

import os
import json
import pickle
import random
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# Assuming we're in the backend services directory
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
MODELS_DIR = DATA_DIR / "models"

class MLBotService:
    """Service for ML-powered draft bot decisions."""
    
    def __init__(self):
        self.loaded_models: Dict[str, Dict[str, Any]] = {}
        self.feature_extractors: Dict[str, Any] = {}
    
    def load_bot_model(self, set_code: str, bot_personality: str = 'silver') -> bool:
        """
        Load a trained bot model for a specific set and personality.
        
        Args:
            set_code: MTG set code (e.g., 'DTK')
            bot_personality: Bot skill level ('bronze', 'silver', 'gold', 'mythic')
        
        Returns:
            True if model loaded successfully
        """
        model_path = MODELS_DIR / set_code.lower() / f"{bot_personality}_bot.pkl"
        
        if not model_path.exists():
            print(f"Model not found: {model_path}")
            return False
        
        try:
            with open(model_path, 'rb') as f:
                model_data = pickle.load(f)
            
            # Cache the loaded model
            if set_code not in self.loaded_models:
                self.loaded_models[set_code] = {}
            
            self.loaded_models[set_code][bot_personality] = model_data
            print(f"Loaded {bot_personality} bot for {set_code}")
            return True
            
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def extract_features(self, card: Dict[str, Any]) -> np.ndarray:
        """
        Extract features from a card for ML prediction.
        
        Features match those used in training:
        - cmc, card types, rarity, power/toughness, colors
        """
        features = []
        
        # CMC
        features.append(float(card.get('cmc', 0)))
        
        # Card type indicators
        type_line = card.get('type_line', '').lower()
        features.append(1 if 'creature' in type_line else 0)
        features.append(1 if 'instant' in type_line else 0)
        features.append(1 if 'sorcery' in type_line else 0)
        features.append(1 if 'enchantment' in type_line else 0)
        features.append(1 if 'artifact' in type_line else 0)
        features.append(1 if 'land' in type_line else 0)
        
        # Rarity score
        rarity_map = {'common': 1, 'uncommon': 2, 'rare': 3, 'mythic': 4}
        rarity = card.get('rarity', 'common')
        features.append(rarity_map.get(rarity, 1))
        
        # Power/Toughness
        try:
            power = float(card.get('power', 0))
        except (ValueError, TypeError):
            power = 0.0
        features.append(power)
        
        try:
            toughness = float(card.get('toughness', 0))
        except (ValueError, TypeError):
            toughness = 0.0
        features.append(toughness)
        
        # Number of colors
        color_identity = card.get('color_identity', [])
        features.append(len(color_identity) if isinstance(color_identity, list) else 0)
        
        return np.array(features).reshape(1, -1)
    
    def predict_pick_value(self, card: Dict[str, Any], set_code: str, 
                          bot_personality: str, context: Optional[Dict] = None) -> float:
        """
        Predict the pick value of a card for a bot.
        
        Args:
            card: Card data dictionary
            set_code: MTG set code
            bot_personality: Bot personality
            context: Optional draft context (picked cards, pack position, etc.)
        
        Returns:
            Pick value score (0-100)
        """
        # Check if model is loaded
        if set_code not in self.loaded_models or bot_personality not in self.loaded_models[set_code]:
            if not self.load_bot_model(set_code, bot_personality):
                # Fallback to rule-based evaluation
                return self._fallback_evaluation(card, bot_personality)
        
        model_data = self.loaded_models[set_code][bot_personality]
        model = model_data['base_model']
        scaler = model_data['scaler']
        config = model_data['config']
        
        # Extract features
        features = self.extract_features(card)
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Get base prediction
        base_score = model.predict(features_scaled)[0]
        
        # Apply personality adjustments
        adjusted_score = self._apply_personality(
            base_score, card, config, context
        )
        
        return float(np.clip(adjusted_score, 0, 100))
    
    def _apply_personality(self, base_score: float, card: Dict[str, Any],
                          config: Dict[str, Any], context: Optional[Dict] = None) -> float:
        """Apply personality-based adjustments to the base score."""
        score = base_score
        
        # Skill level adjustment (how close to optimal)
        skill_level = config['skill_level']
        optimal_adjustment = (100 - base_score) * (1 - skill_level) * 0.3
        score += optimal_adjustment
        
        # Rare bias
        if card.get('rarity') in ['rare', 'mythic']:
            score *= config['rare_bias']
        
        # Add randomness based on personality
        randomness = config['randomness']
        noise = np.random.normal(0, randomness * 20)
        score += noise
        
        # Color commitment (if context provided)
        if context and 'picked_colors' in context:
            picked_colors = context['picked_colors']
            card_colors = set(card.get('color_identity', []))
            
            if picked_colors and card_colors:
                # Bonus for matching colors
                color_match = len(picked_colors.intersection(card_colors)) / len(card_colors)
                commitment_bonus = color_match * config['color_commitment'] * 10
                score += commitment_bonus
        
        return score
    
    def _fallback_evaluation(self, card: Dict[str, Any], bot_personality: str) -> float:
        """Simple rule-based evaluation when ML model not available."""
        # Base score by rarity
        rarity_scores = {
            'common': 40,
            'uncommon': 55,
            'rare': 70,
            'mythic': 85
        }
        
        score = rarity_scores.get(card.get('rarity', 'common'), 40)
        
        # Creature bonus
        if 'creature' in card.get('type_line', '').lower():
            score += 5
        
        # Removal bonus
        oracle_text = card.get('oracle_text', '').lower()
        if any(word in oracle_text for word in ['destroy', 'exile', 'damage', 'counter']):
            score += 10
        
        # Personality adjustments
        personality_multipliers = {
            'bronze': 0.8,
            'silver': 0.9,
            'gold': 1.0,
            'mythic': 1.1
        }
        
        score *= personality_multipliers.get(bot_personality, 1.0)
        
        # Add some randomness
        score += random.uniform(-10, 10)
        
        return float(np.clip(score, 0, 100))
    
    def get_pick_rankings(self, cards: List[Dict[str, Any]], set_code: str,
                         bot_personality: str, context: Optional[Dict] = None) -> List[Tuple[int, float]]:
        """
        Get pick rankings for a list of cards.
        
        Returns:
            List of (card_index, score) tuples sorted by score descending
        """
        rankings = []
        
        for i, card in enumerate(cards):
            score = self.predict_pick_value(card, set_code, bot_personality, context)
            rankings.append((i, score))
        
        # Sort by score descending
        rankings.sort(key=lambda x: x[1], reverse=True)
        
        return rankings
    
    def choose_pick(self, cards: List[Dict[str, Any]], set_code: str,
                   bot_personality: str, context: Optional[Dict] = None) -> int:
        """
        Choose which card to pick from a pack.
        
        Returns:
            Index of the chosen card
        """
        rankings = self.get_pick_rankings(cards, set_code, bot_personality, context)
        
        if not rankings:
            return 0
        
        # Usually pick the top card, but add some variance for lower skill bots
        config = BOT_PERSONALITIES.get(bot_personality, BOT_PERSONALITIES['silver'])
        
        # Higher skill = more likely to pick the best card
        if random.random() < config['skill_level']:
            return rankings[0][0]
        else:
            # Sometimes pick 2nd or 3rd best
            pick_range = min(3, len(rankings))
            weights = [0.6, 0.3, 0.1][:pick_range]
            choice_idx = random.choices(range(pick_range), weights=weights)[0]
            return rankings[choice_idx][0]


# Bot personality configurations (matching training script)
BOT_PERSONALITIES = {
    'bronze': {
        'name': 'Bronze Bot',
        'skill_level': 0.3,
        'randomness': 0.4,
        'rare_bias': 1.5,
        'color_commitment': 0.5,
    },
    'silver': {
        'name': 'Silver Bot',
        'skill_level': 0.5,
        'randomness': 0.3,
        'rare_bias': 1.2,
        'color_commitment': 0.7,
    },
    'gold': {
        'name': 'Gold Bot',
        'skill_level': 0.7,
        'randomness': 0.2,
        'rare_bias': 1.0,
        'color_commitment': 0.85,
    },
    'mythic': {
        'name': 'Mythic Bot',
        'skill_level': 0.9,
        'randomness': 0.1,
        'rare_bias': 0.9,
        'color_commitment': 0.95,
    }
}

# Singleton instance
_ml_bot_service = None

def get_ml_bot_service() -> MLBotService:
    """Get or create the singleton ML bot service."""
    global _ml_bot_service
    if _ml_bot_service is None:
        _ml_bot_service = MLBotService()
    return _ml_bot_service