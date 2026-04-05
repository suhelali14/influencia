"""
Advanced ML Models for Smart Creator-Campaign Matching
- Multiple models: RandomForest, XGBoost, Neural Network
- India-trained XGBoost (R²=0.86) + PyTorch Neural Network (MSE=0.40)
- Ensemble scoring: combines sklearn + India-trained models
- Predicts match score, engagement, ROI
- Uses sophisticated feature engineering
"""
import os
import sys
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
import joblib
import json
import logging

logger = logging.getLogger(__name__)

# Create directories
os.makedirs('ai/models', exist_ok=True)
os.makedirs('ai/data', exist_ok=True)

# Try importing advanced ML libraries
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logger.warning("⚠️ XGBoost not installed — India XGBoost model will be unavailable")

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("⚠️ PyTorch not installed — India Neural Network model will be unavailable")


class IndiaNN(nn.Module):
    """PyTorch neural network matching the India-trained architecture (128→64→32→1)"""
    def __init__(self, input_dim: int):
        super(IndiaNN, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.network(x)


class MatchingMLModel:
    """
    Ensemble ML model for creator-campaign matching.
    
    Loads and combines predictions from up to 5 models:
      1. RandomForest match score (sklearn .pkl)         — weight 0.25
      2. GradientBoosting ROI predictor (sklearn .pkl)   — weight 0.10
      3. RandomForest engagement (sklearn .pkl)           — weight 0.10
      4. India XGBoost regressor (xgboost .json, R²=0.86) — weight 0.35
      5. India Neural Network (PyTorch .pth, MSE=0.40)   — weight 0.20
    
    Falls back to whichever subset of models are available.
    """
    
    # Ensemble weights — India models get higher weight due to superior metrics
    ENSEMBLE_WEIGHTS = {
        'sklearn_match':  0.25,
        'india_xgboost':  0.35,
        'india_nn':       0.20,
        'sklearn_roi':    0.10,
        'sklearn_engage': 0.10,
    }
    
    def __init__(self):
        self.match_model = None
        self.roi_model = None
        self.engagement_model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        
        # India-trained advanced models
        self.india_xgboost = None
        self.india_nn = None
        self.india_nn_input_dim = None
        
    def load_training_data(self):
        """Load processed training data"""
        print("📥 Loading training data...")
        
        if not os.path.exists('ai/data/training_data.csv'):
            print("❌ Training data not found. Run ETL pipeline first.")
            return None
        
        data = pd.read_csv('ai/data/training_data.csv')
        print(f"✅ Loaded {len(data)} training samples")
        return data
    
    def prepare_features(self, data: pd.DataFrame):
        """Prepare features for training"""
        print("🔧 Preparing features...")
        
        # Select feature columns
        feature_cols = [
            'category_match', 'followers_match', 'engagement_match', 'platform_match',
            'experience_score', 'overall_rating', 'num_categories', 'num_languages',
            'estimated_followers', 'estimated_engagement_rate', 'campaign_budget',
            'campaign_duration_days', 'budget_fit', 'versatility_score', 'success_rate'
        ]
        
        # Filter only available columns
        available_cols = [col for col in feature_cols if col in data.columns]
        self.feature_names = available_cols
        
        X = data[available_cols].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=available_cols)
        
        # Create target: match score (0-100)
        y_match = (
            data['category_match'] * 30 +
            data['followers_match'] * 15 +
            data['engagement_match'] * 10 +
            data['platform_match'] * 10 +
            data['experience_score'] * 4 +
            data['overall_rating'] * 3 +
            data['budget_fit'] * 10 +
            data['outcome'] * 15  # Bonus for successful collaborations
        ).clip(0, 100)
        
        # Create target: estimated ROI (percentage)
        y_roi = (
            data['estimated_engagement_rate'] * 1000 +
            data['overall_rating'] * 20 +
            (data['category_match'] * 50) +
            (data['outcome'] * 100)
        ).clip(0, 300)
        
        # Create target: predicted engagement
        y_engagement = data['estimated_engagement_rate'] * 100
        
        print(f"✅ Prepared {X_scaled.shape[1]} features")
        return X_scaled, y_match, y_roi, y_engagement
    
    def train_match_score_model(self, X, y):
        """Train match score prediction model"""
        print("🤖 Training match score model...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train Random Forest
        rf_model = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        rf_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = rf_model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"  📊 Match Score Model Performance:")
        print(f"     MSE: {mse:.2f}")
        print(f"     MAE: {mae:.2f}")
        print(f"     R²: {r2:.3f}")
        
        # Cross-validation
        cv_scores = cross_val_score(rf_model, X, y, cv=5, scoring='r2')
        print(f"     CV R² (mean): {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
        
        self.match_model = rf_model
        return rf_model
    
    def train_roi_model(self, X, y):
        """Train ROI prediction model"""
        print("🤖 Training ROI prediction model...")
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train Gradient Boosting
        gb_model = GradientBoostingRegressor(
            n_estimators=150,
            max_depth=8,
            learning_rate=0.1,
            random_state=42
        )
        gb_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = gb_model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"  📊 ROI Model Performance:")
        print(f"     MSE: {mse:.2f}")
        print(f"     MAE: {mae:.2f}")
        print(f"     R²: {r2:.3f}")
        
        self.roi_model = gb_model
        return gb_model
    
    def train_engagement_model(self, X, y):
        """Train engagement prediction model"""
        print("🤖 Training engagement prediction model...")
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train Random Forest
        rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        rf_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = rf_model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"  📊 Engagement Model Performance:")
        print(f"     MSE: {mse:.2f}")
        print(f"     MAE: {mae:.2f}")
        print(f"     R²: {r2:.3f}")
        
        self.engagement_model = rf_model
        return rf_model
    
    def get_feature_importance(self):
        """Get feature importance from models"""
        if self.match_model:
            importance = pd.DataFrame({
                'feature': self.feature_names,
                'importance': self.match_model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            print("\n📊 Top 10 Most Important Features:")
            print(importance.head(10).to_string(index=False))
    
    def save_models(self):
        """Save trained models"""
        print("\n💾 Saving models...")
        
        if self.match_model:
            joblib.dump(self.match_model, 'ai/models/match_score_model.pkl')
            print("  ✅ Saved match score model")
        
        if self.roi_model:
            joblib.dump(self.roi_model, 'ai/models/roi_model.pkl')
            print("  ✅ Saved ROI model")
        
        if self.engagement_model:
            joblib.dump(self.engagement_model, 'ai/models/engagement_model.pkl')
            print("  ✅ Saved engagement model")
        
        # Save scaler and feature names
        joblib.dump(self.scaler, 'ai/models/scaler.pkl')
        with open('ai/models/feature_names.json', 'w') as f:
            json.dump(self.feature_names, f)
        print("  ✅ Saved scaler and feature names")
    
    def load_models(self):
        """Load all pre-trained models (sklearn + India XGBoost + India NN)"""
        print("📥 Loading pre-trained models...")
        loaded_any = False
        
        # ── 1. Load sklearn models ──────────────────────────────────────
        try:
            self.match_model = joblib.load('ai/models/match_score_model.pkl')
            self.roi_model = joblib.load('ai/models/roi_model.pkl')
            self.engagement_model = joblib.load('ai/models/engagement_model.pkl')
            self.scaler = joblib.load('ai/models/scaler.pkl')
            
            with open('ai/models/feature_names.json', 'r') as f:
                self.feature_names = json.load(f)
            
            print("  ✅ sklearn models loaded (match, ROI, engagement)")
            loaded_any = True
        except Exception as e:
            print(f"  ⚠️ sklearn models not found: {e}")
        
        # ── 2. Load India XGBoost model (R²=0.86) ──────────────────────
        india_xgb_path = 'ai/models/india_xgboost_model.json'
        if XGBOOST_AVAILABLE and os.path.exists(india_xgb_path):
            try:
                self.india_xgboost = xgb.XGBRegressor()
                self.india_xgboost.load_model(india_xgb_path)
                print("  ✅ India XGBoost model loaded (R²=0.86, trained on 15K India creators)")
                loaded_any = True
            except Exception as e:
                print(f"  ⚠️ India XGBoost load failed: {e}")
                self.india_xgboost = None
        else:
            if not XGBOOST_AVAILABLE:
                print("  ⚠️ XGBoost library not installed — skipping India XGBoost")
            elif not os.path.exists(india_xgb_path):
                print(f"  ⚠️ India XGBoost model file not found at {india_xgb_path}")
        
        # ── 3. Load India Neural Network (MSE=0.40) ────────────────────
        india_nn_path = 'ai/models/india_neural_network.pth'
        if TORCH_AVAILABLE and os.path.exists(india_nn_path):
            try:
                # Load training report to get input dimensions
                report_path = 'ai/models/india_training_report.json'
                if os.path.exists(report_path):
                    with open(report_path, 'r') as f:
                        report = json.load(f)
                    self.india_nn_input_dim = report['data_stats']['features']
                else:
                    # Fallback: use same feature count as sklearn
                    self.india_nn_input_dim = len(self.feature_names) if self.feature_names else 32
                
                self.india_nn = IndiaNN(input_dim=self.india_nn_input_dim)
                state_dict = torch.load(india_nn_path, map_location='cpu', weights_only=True)
                self.india_nn.load_state_dict(state_dict)
                self.india_nn.eval()
                print(f"  ✅ India Neural Network loaded (MSE=0.40, input_dim={self.india_nn_input_dim})")
                loaded_any = True
            except Exception as e:
                print(f"  ⚠️ India Neural Network load failed: {e}")
                self.india_nn = None
        else:
            if not TORCH_AVAILABLE:
                print("  ⚠️ PyTorch not installed — skipping India Neural Network")
            elif not os.path.exists(india_nn_path):
                print(f"  ⚠️ India NN model file not found at {india_nn_path}")
        
        # ── Summary ────────────────────────────────────────────────────
        models_loaded = []
        if self.match_model: models_loaded.append("sklearn-match")
        if self.roi_model: models_loaded.append("sklearn-roi")
        if self.engagement_model: models_loaded.append("sklearn-engagement")
        if self.india_xgboost: models_loaded.append("india-xgboost")
        if self.india_nn: models_loaded.append("india-nn")
        print(f"  📦 Models loaded: [{', '.join(models_loaded)}]")
        
        if loaded_any:
            print("✅ Model loading complete")
        else:
            print("❌ No models loaded — predictions will use rule-based fallback")
        
        return loaded_any
    
    def predict(self, creator_campaign_features: dict):
        """
        Ensemble prediction using all available models.
        
        Combines sklearn RandomForest, India XGBoost, and India Neural Network
        using weighted averaging. Automatically adjusts weights based on which
        models are loaded.
        """
        if not self.match_model and not self.india_xgboost and not self.india_nn:
            print("❌ No models loaded. Train or load models first.")
            return None
        
        # Prepare features
        feature_values = [creator_campaign_features.get(f, 0) for f in self.feature_names]
        X = np.array(feature_values).reshape(1, -1)
        
        scores = {}
        active_weights = {}
        
        # ── 1. sklearn match score ──────────────────────────────────────
        if self.match_model:
            try:
                X_scaled = self.scaler.transform(X)
                sklearn_score = float(self.match_model.predict(X_scaled)[0])
                scores['sklearn_match'] = np.clip(sklearn_score, 0, 100)
                active_weights['sklearn_match'] = self.ENSEMBLE_WEIGHTS['sklearn_match']
            except Exception as e:
                logger.warning(f"sklearn match prediction failed: {e}")
        
        # ── 2. India XGBoost ────────────────────────────────────────────
        if self.india_xgboost:
            try:
                # XGBoost was trained with the same feature set from FeatureEngineer
                # Pad or truncate to match training dimensions
                xgb_input = self._prepare_india_features(feature_values)
                xgb_score = float(self.india_xgboost.predict(np.array([xgb_input]))[0])
                scores['india_xgboost'] = np.clip(xgb_score * 100, 0, 100)  # trained on 0-1 scale
                active_weights['india_xgboost'] = self.ENSEMBLE_WEIGHTS['india_xgboost']
            except Exception as e:
                logger.warning(f"India XGBoost prediction failed: {e}")
        
        # ── 3. India Neural Network ─────────────────────────────────────
        if self.india_nn and TORCH_AVAILABLE:
            try:
                nn_input = self._prepare_india_features(feature_values)
                with torch.no_grad():
                    X_tensor = torch.FloatTensor([nn_input])
                    nn_score = float(self.india_nn(X_tensor).item())
                scores['india_nn'] = np.clip(nn_score * 100, 0, 100)  # sigmoid output 0-1
                active_weights['india_nn'] = self.ENSEMBLE_WEIGHTS['india_nn']
            except Exception as e:
                logger.warning(f"India Neural Network prediction failed: {e}")
        
        # ── Weighted ensemble ───────────────────────────────────────────
        if scores:
            total_weight = sum(active_weights.values())
            normalized_weights = {k: v / total_weight for k, v in active_weights.items()}
            ensemble_score = sum(scores[k] * normalized_weights[k] for k in scores)
        else:
            ensemble_score = 50.0  # neutral fallback
        
        # ── ROI + Engagement from sklearn (if available) ────────────────
        roi_estimate = 100.0
        engagement_estimate = 5.0
        if self.roi_model:
            try:
                X_scaled = self.scaler.transform(X) if 'X_scaled' not in dir() else X_scaled
                roi_estimate = float(self.roi_model.predict(X_scaled)[0])
            except Exception:
                pass
        if self.engagement_model:
            try:
                X_scaled = self.scaler.transform(X) if 'X_scaled' not in dir() else X_scaled
                engagement_estimate = float(self.engagement_model.predict(X_scaled)[0])
            except Exception:
                pass
        
        result = {
            'match_score': np.clip(ensemble_score, 0, 100),
            'estimated_roi': np.clip(roi_estimate, 0, 300),
            'estimated_engagement': np.clip(engagement_estimate, 0, 100),
            'model_scores': scores,
            'model_weights': normalized_weights if scores else {},
            'ensemble_method': 'weighted_average',
            'models_used': list(scores.keys()),
        }
        
        logger.info(
            f"🎯 Ensemble prediction: {result['match_score']:.1f} "
            f"(models: {', '.join(scores.keys())})"
        )
        
        return result
    
    def _prepare_india_features(self, feature_values: list) -> list:
        """
        Prepare feature vector for India-trained models.
        
        The India models were trained with 32 features from FeatureEngineer.
        If we have fewer features (15 from sklearn), pad with zeros.
        If we have more, truncate.
        """
        target_dim = self.india_nn_input_dim or 32
        if len(feature_values) >= target_dim:
            return feature_values[:target_dim]
        else:
            # Pad with zeros
            return feature_values + [0.0] * (target_dim - len(feature_values))
    
    def train_all(self):
        """Train all models"""
        print("🚀 Starting ML Model Training Pipeline...\n")
        
        # Load data
        data = self.load_training_data()
        if data is None:
            return
        
        # Prepare features
        X, y_match, y_roi, y_engagement = self.prepare_features(data)
        
        # Train models
        self.train_match_score_model(X, y_match)
        self.train_roi_model(X, y_roi)
        self.train_engagement_model(X, y_engagement)
        
        # Feature importance
        self.get_feature_importance()
        
        # Save models
        self.save_models()
        
        print("\n🎉 ML Training Pipeline completed successfully!")


if __name__ == "__main__":
    ml_model = MatchingMLModel()
    ml_model.train_all()
