# Advanced ML/AI Architecture - Technical Specification

## Overview
This document provides detailed technical specifications for building a **production-grade ML/AI system** for influencer-brand matching, powered by research-backed algorithms and modern deep learning techniques.

---

## 1. Two-Tower Deep Neural Network (Primary Recommendation Model)

### Architecture

Based on Google's research: "Sampling-Bias-Corrected Neural Modeling for Large Corpus Item Recommendations" (2019)

```python
"""
Two-Tower Architecture for Creator-Campaign Matching
Inspired by YouTube and Pinterest recommendation systems
"""

import torch
import torch.nn as nn

class CreatorTower(nn.Module):
    """Encodes creator features into dense embedding"""
    def __init__(self, config):
        super().__init__()
        
        # Categorical embeddings
        self.category_emb = nn.Embedding(config.num_categories, 32)
        self.platform_emb = nn.Embedding(config.num_platforms, 16)
        self.language_emb = nn.Embedding(config.num_languages, 16)
        
        # Numeric features normalization
        self.batch_norm = nn.BatchNorm1d(config.num_numeric_features)
        
        # Dense layers
        self.fc_layers = nn.Sequential(
            nn.Linear(config.input_dim, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),  # Final embedding dimension
        )
        
    def forward(self, creator_features):
        # Extract features
        categories = creator_features['categories']
        platforms = creator_features['platforms']
        languages = creator_features['languages']
        numeric = creator_features['numeric']  # followers, engagement, etc.
        
        # Embed categorical features
        cat_emb = self.category_emb(categories).mean(dim=1)  # Multi-hot encoding
        plat_emb = self.platform_emb(platforms).mean(dim=1)
        lang_emb = self.language_emb(languages).mean(dim=1)
        
        # Normalize numeric features
        numeric_norm = self.batch_norm(numeric)
        
        # Concatenate all features
        combined = torch.cat([cat_emb, plat_emb, lang_emb, numeric_norm], dim=1)
        
        # Pass through dense layers
        embedding = self.fc_layers(combined)
        
        # L2 normalize for cosine similarity
        return F.normalize(embedding, p=2, dim=1)


class CampaignTower(nn.Module):
    """Encodes campaign features into dense embedding"""
    def __init__(self, config):
        super().__init__()
        
        # Categorical embeddings
        self.category_emb = nn.Embedding(config.num_categories, 32)
        self.platform_emb = nn.Embedding(config.num_platforms, 16)
        self.brand_industry_emb = nn.Embedding(config.num_industries, 16)
        
        # Text encoder for campaign description (BERT-based)
        self.text_encoder = nn.Linear(768, 64)  # BERT output -> compressed
        
        # Numeric features
        self.batch_norm = nn.BatchNorm1d(config.num_numeric_features)
        
        # Dense layers
        self.fc_layers = nn.Sequential(
            nn.Linear(config.input_dim, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),  # Must match CreatorTower output
        )
        
    def forward(self, campaign_features):
        # Extract features
        category = campaign_features['category']
        platform = campaign_features['platform']
        industry = campaign_features['brand_industry']
        description_emb = campaign_features['description_embedding']  # Pre-computed BERT
        numeric = campaign_features['numeric']  # budget, duration, etc.
        
        # Embed categorical features
        cat_emb = self.category_emb(category)
        plat_emb = self.platform_emb(platform)
        ind_emb = self.brand_industry_emb(industry)
        
        # Encode text
        text_emb = self.text_encoder(description_emb)
        
        # Normalize numeric
        numeric_norm = self.batch_norm(numeric)
        
        # Concatenate
        combined = torch.cat([cat_emb, plat_emb, ind_emb, text_emb, numeric_norm], dim=1)
        
        # Dense layers
        embedding = self.fc_layers(combined)
        
        # L2 normalize
        return F.normalize(embedding, p=2, dim=1)


class TwoTowerMatcher(nn.Module):
    """
    Complete two-tower model for creator-campaign matching
    Outputs:
    - Match score (0-1)
    - Success probability (0-1)
    - Estimated ROI (regression)
    """
    def __init__(self, config):
        super().__init__()
        
        self.creator_tower = CreatorTower(config.creator_config)
        self.campaign_tower = CampaignTower(config.campaign_config)
        
        # Interaction layer (dot product + MLP)
        self.interaction_mlp = nn.Sequential(
            nn.Linear(129, 64),  # 128 (concat) + 1 (dot product)
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
        )
        
        # Multi-task heads
        self.match_score_head = nn.Sequential(
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        self.success_prob_head = nn.Sequential(
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        self.roi_head = nn.Linear(32, 1)  # Regression
        
    def forward(self, creator_features, campaign_features):
        # Get embeddings
        creator_emb = self.creator_tower(creator_features)
        campaign_emb = self.campaign_tower(campaign_features)
        
        # Compute dot product (similarity)
        dot_product = (creator_emb * campaign_emb).sum(dim=1, keepdim=True)
        
        # Concatenate for interaction
        interaction_input = torch.cat([creator_emb, campaign_emb, dot_product], dim=1)
        
        # Interaction layer
        interaction_features = self.interaction_mlp(interaction_input)
        
        # Multi-task outputs
        match_score = self.match_score_head(interaction_features)
        success_prob = self.success_prob_head(interaction_features)
        estimated_roi = self.roi_head(interaction_features)
        
        return {
            'match_score': match_score,
            'success_probability': success_prob,
            'estimated_roi': estimated_roi,
            'creator_embedding': creator_emb,  # For retrieval
            'campaign_embedding': campaign_emb
        }


# Loss function (multi-task learning)
class MultiTaskLoss(nn.Module):
    def __init__(self, weights={'match': 1.0, 'success': 1.0, 'roi': 0.5}):
        super().__init__()
        self.weights = weights
        self.bce = nn.BCELoss()
        self.mse = nn.MSELoss()
        
    def forward(self, predictions, targets):
        loss_match = self.bce(predictions['match_score'], targets['match_label'])
        loss_success = self.bce(predictions['success_probability'], targets['success_label'])
        loss_roi = self.mse(predictions['estimated_roi'], targets['roi_value'])
        
        total_loss = (
            self.weights['match'] * loss_match +
            self.weights['success'] * loss_success +
            self.weights['roi'] * loss_roi
        )
        
        return total_loss, {
            'match_loss': loss_match.item(),
            'success_loss': loss_success.item(),
            'roi_loss': loss_roi.item()
        }
```

---

## 2. Semantic Matching with Transformers

### BERT-based Content Understanding

```python
"""
Transformer-based semantic matching for campaign-creator fit
Uses sentence transformers for efficient embedding generation
"""

from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class SemanticMatcher:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        """
        Pre-trained sentence transformer
        Optimized for semantic search and similarity
        """
        self.model = SentenceTransformer(model_name)
        
    def encode_creator_profile(self, creator):
        """
        Create rich text representation of creator
        """
        text = f"""
        Creator Profile:
        Bio: {creator['bio']}
        Categories: {', '.join(creator['categories'])}
        Past Campaigns: {creator['campaign_history']}
        Content Style: {creator['content_description']}
        Audience: {creator['audience_demographics']}
        """
        return self.model.encode(text, convert_to_tensor=True)
    
    def encode_campaign(self, campaign):
        """
        Create rich text representation of campaign
        """
        text = f"""
        Campaign Details:
        Title: {campaign['title']}
        Description: {campaign['description']}
        Brand: {campaign['brand_name']} - {campaign['brand_description']}
        Requirements: {campaign['requirements']}
        Target Audience: {campaign['target_audience']}
        Goals: {campaign['campaign_goals']}
        """
        return self.model.encode(text, convert_to_tensor=True)
    
    def compute_semantic_similarity(self, creator_embedding, campaign_embedding):
        """
        Compute cosine similarity between embeddings
        """
        return cosine_similarity(
            creator_embedding.cpu().numpy().reshape(1, -1),
            campaign_embedding.cpu().numpy().reshape(1, -1)
        )[0][0]
    
    def find_top_matches(self, campaign, creators, top_k=20):
        """
        Retrieve top K semantically similar creators for a campaign
        """
        campaign_emb = self.encode_campaign(campaign)
        
        scores = []
        for creator in creators:
            creator_emb = self.encode_creator_profile(creator)
            similarity = self.compute_semantic_similarity(creator_emb, campaign_emb)
            scores.append((creator['id'], similarity))
        
        # Sort by similarity
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_k]
```

---

## 3. Collaborative Filtering (User-Item Interactions)

### Matrix Factorization with Neural Networks

```python
"""
Neural Collaborative Filtering
Based on "Neural Collaborative Filtering" (He et al., 2017)
"""

import torch
import torch.nn as nn

class NeuralCollaborativeFiltering(nn.Module):
    def __init__(self, num_creators, num_campaigns, embedding_dim=64):
        super().__init__()
        
        # Generalized Matrix Factorization (GMF) path
        self.creator_gmf_embedding = nn.Embedding(num_creators, embedding_dim)
        self.campaign_gmf_embedding = nn.Embedding(num_campaigns, embedding_dim)
        
        # Multi-Layer Perceptron (MLP) path
        self.creator_mlp_embedding = nn.Embedding(num_creators, embedding_dim)
        self.campaign_mlp_embedding = nn.Embedding(num_campaigns, embedding_dim)
        
        self.mlp = nn.Sequential(
            nn.Linear(embedding_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
        )
        
        # Fusion layer (combine GMF and MLP)
        self.fusion = nn.Linear(embedding_dim + 32, 1)
        
    def forward(self, creator_ids, campaign_ids):
        # GMF path (element-wise product)
        creator_gmf = self.creator_gmf_embedding(creator_ids)
        campaign_gmf = self.campaign_gmf_embedding(campaign_ids)
        gmf_output = creator_gmf * campaign_gmf
        
        # MLP path (concatenation + deep network)
        creator_mlp = self.creator_mlp_embedding(creator_ids)
        campaign_mlp = self.campaign_mlp_embedding(campaign_ids)
        mlp_input = torch.cat([creator_mlp, campaign_mlp], dim=1)
        mlp_output = self.mlp(mlp_input)
        
        # Combine both paths
        fusion_input = torch.cat([gmf_output, mlp_output], dim=1)
        prediction = torch.sigmoid(self.fusion(fusion_input))
        
        return prediction


# Training with negative sampling
class NCFTrainer:
    def __init__(self, model, learning_rate=0.001):
        self.model = model
        self.optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
        self.criterion = nn.BCELoss()
        
    def train_step(self, positive_samples, negative_samples):
        """
        Positive: Actual collaborations
        Negative: Random non-collaborations (sampled)
        """
        self.model.train()
        
        # Positive samples
        creator_ids_pos = positive_samples['creator_ids']
        campaign_ids_pos = positive_samples['campaign_ids']
        predictions_pos = self.model(creator_ids_pos, campaign_ids_pos)
        loss_pos = self.criterion(predictions_pos, torch.ones_like(predictions_pos))
        
        # Negative samples
        creator_ids_neg = negative_samples['creator_ids']
        campaign_ids_neg = negative_samples['campaign_ids']
        predictions_neg = self.model(creator_ids_neg, campaign_ids_neg)
        loss_neg = self.criterion(predictions_neg, torch.zeros_like(predictions_neg))
        
        # Total loss
        loss = loss_pos + loss_neg
        
        # Backprop
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        
        return loss.item()
```

---

## 4. Feature Engineering Pipeline

### Comprehensive Feature Store

```python
"""
Feature engineering for ML models
Includes temporal, behavioral, and contextual features
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class FeatureEngineer:
    """
    Extract and compute features for creator-campaign matching
    """
    
    @staticmethod
    def creator_features(creator, historical_data):
        """
        Compute comprehensive creator features
        """
        features = {}
        
        # === BASIC STATS ===
        features['follower_count'] = creator['followers']
        features['following_count'] = creator['following']
        features['total_posts'] = creator['total_posts']
        features['account_age_days'] = (datetime.now() - creator['created_at']).days
        
        # === ENGAGEMENT METRICS (time-weighted) ===
        features['engagement_rate_7d'] = FeatureEngineer._compute_engagement(
            historical_data, window_days=7
        )
        features['engagement_rate_30d'] = FeatureEngineer._compute_engagement(
            historical_data, window_days=30
        )
        features['engagement_rate_90d'] = FeatureEngineer._compute_engagement(
            historical_data, window_days=90
        )
        
        # === GROWTH METRICS ===
        features['follower_growth_7d'] = FeatureEngineer._compute_growth(
            historical_data, metric='followers', window_days=7
        )
        features['follower_growth_30d'] = FeatureEngineer._compute_growth(
            historical_data, metric='followers', window_days=30
        )
        
        # === CONTENT QUALITY ===
        features['avg_likes_per_post'] = creator['total_likes'] / max(creator['total_posts'], 1)
        features['avg_comments_per_post'] = creator['total_comments'] / max(creator['total_posts'], 1)
        features['avg_shares_per_post'] = creator['total_shares'] / max(creator['total_posts'], 1)
        
        # === CONSISTENCY ===
        features['posting_frequency'] = FeatureEngineer._compute_posting_frequency(
            historical_data
        )
        features['posting_consistency_score'] = FeatureEngineer._compute_consistency(
            historical_data
        )
        
        # === COLLABORATION HISTORY ===
        features['total_campaigns'] = creator['total_campaigns']
        features['successful_campaigns'] = creator['successful_campaigns']
        features['success_rate'] = creator['successful_campaigns'] / max(creator['total_campaigns'], 1)
        features['avg_campaign_rating'] = creator['overall_rating']
        features['total_earnings'] = creator['total_earnings']
        features['avg_earnings_per_campaign'] = creator['total_earnings'] / max(creator['total_campaigns'], 1)
        
        # === RESPONSE METRICS ===
        features['avg_response_time_hours'] = FeatureEngineer._compute_avg_response_time(
            historical_data
        )
        features['acceptance_rate'] = FeatureEngineer._compute_acceptance_rate(
            historical_data
        )
        
        # === AUDIENCE DEMOGRAPHICS ===
        demographics = creator.get('audience_demographics', {})
        features['audience_age_18_24_pct'] = demographics.get('age_18_24', 0)
        features['audience_age_25_34_pct'] = demographics.get('age_25_34', 0)
        features['audience_age_35_44_pct'] = demographics.get('age_35_44', 0)
        features['audience_female_pct'] = demographics.get('female', 50)
        features['audience_male_pct'] = demographics.get('male', 50)
        
        # === REACH & INFLUENCE ===
        features['estimated_reach'] = creator['followers'] * features['engagement_rate_30d']
        features['influence_score'] = FeatureEngineer._compute_influence_score(creator)
        
        # === VERSATILITY ===
        features['num_categories'] = len(creator.get('categories', []))
        features['num_platforms'] = len(creator.get('platforms', []))
        features['category_diversity_score'] = FeatureEngineer._compute_diversity(
            historical_data, dimension='category'
        )
        
        # === VERIFICATION & TRUST ===
        features['is_verified'] = int(creator.get('is_verified', False))
        features['has_business_account'] = int(creator.get('has_business_account', False))
        
        return features
    
    @staticmethod
    def campaign_features(campaign, brand_data):
        """
        Compute campaign features
        """
        features = {}
        
        # === BASIC INFO ===
        features['budget_total'] = campaign['budget']
        features['duration_days'] = (campaign['end_date'] - campaign['start_date']).days
        features['budget_per_day'] = campaign['budget'] / max(features['duration_days'], 1)
        
        # === REQUIREMENTS ===
        requirements = campaign.get('requirements', {})
        features['min_followers_required'] = requirements.get('min_followers', 0)
        features['min_engagement_required'] = requirements.get('min_engagement_rate', 0)
        features['num_deliverables'] = len(requirements.get('deliverables', []))
        features['content_rights_required'] = int(requirements.get('content_rights', False))
        
        # === BRAND REPUTATION ===
        features['brand_total_campaigns'] = brand_data.get('total_campaigns', 0)
        features['brand_avg_rating'] = brand_data.get('avg_rating', 0)
        features['brand_completion_rate'] = brand_data.get('completion_rate', 0)
        
        # === COMPETITIVENESS ===
        features['applications_count'] = campaign.get('applications_count', 0)
        features['competition_level'] = min(features['applications_count'] / 100, 1.0)  # Normalize
        
        # === URGENCY ===
        days_until_start = (campaign['start_date'] - datetime.now()).days
        features['days_until_start'] = max(days_until_start, 0)
        features['is_urgent'] = int(days_until_start < 7)
        
        return features
    
    @staticmethod
    def interaction_features(creator, campaign):
        """
        Compute creator-campaign interaction features
        """
        features = {}
        
        # === MATCH SCORES ===
        creator_categories = set(creator.get('categories', []))
        campaign_category = campaign.get('category')
        features['category_exact_match'] = int(campaign_category in creator_categories)
        
        creator_platforms = set(creator.get('platforms', []))
        campaign_platform = campaign.get('platform')
        features['platform_match'] = int(campaign_platform in creator_platforms)
        
        # === BUDGET FIT ===
        creator_avg_earnings = creator.get('total_earnings', 0) / max(creator.get('total_campaigns', 1), 1)
        campaign_budget = campaign.get('budget', 0)
        features['budget_ratio'] = campaign_budget / max(creator_avg_earnings, 1)
        features['budget_fit_score'] = FeatureEngineer._sigmoid(features['budget_ratio'], midpoint=1.0, steepness=2)
        
        # === AUDIENCE OVERLAP ===
        campaign_target = campaign.get('target_audience', {})
        creator_audience = creator.get('audience_demographics', {})
        features['audience_age_overlap'] = FeatureEngineer._compute_demographic_overlap(
            creator_audience, campaign_target, dimension='age'
        )
        features['audience_gender_overlap'] = FeatureEngineer._compute_demographic_overlap(
            creator_audience, campaign_target, dimension='gender'
        )
        
        # === EXPERIENCE FIT ===
        features['experience_score'] = min(creator.get('total_campaigns', 0) / 10, 1.0)
        
        return features
    
    # Helper methods
    @staticmethod
    def _compute_engagement(historical_data, window_days):
        cutoff_date = datetime.now() - timedelta(days=window_days)
        recent_data = historical_data[historical_data['date'] >= cutoff_date]
        if len(recent_data) == 0:
            return 0.0
        total_engagement = recent_data['likes'] + recent_data['comments'] + recent_data['shares']
        total_followers = recent_data['followers'].mean()
        total_posts = len(recent_data)
        return (total_engagement.sum() / total_followers / total_posts) if total_followers > 0 else 0.0
    
    @staticmethod
    def _compute_growth(historical_data, metric, window_days):
        cutoff_date = datetime.now() - timedelta(days=window_days)
        recent_data = historical_data[historical_data['date'] >= cutoff_date].sort_values('date')
        if len(recent_data) < 2:
            return 0.0
        start_value = recent_data.iloc[0][metric]
        end_value = recent_data.iloc[-1][metric]
        return (end_value - start_value) / max(start_value, 1)
    
    @staticmethod
    def _sigmoid(x, midpoint=1.0, steepness=1.0):
        return 1 / (1 + np.exp(-steepness * (x - midpoint)))
    
    @staticmethod
    def _compute_influence_score(creator):
        # Weighted combination of metrics
        followers_score = np.log10(max(creator['followers'], 1)) / 7  # Normalize to 0-1
        engagement_score = creator.get('engagement_rate_30d', 0)
        success_score = creator.get('success_rate', 0)
        
        return 0.4 * followers_score + 0.3 * engagement_score + 0.3 * success_score
```

---

## 5. Model Ensemble & Inference Pipeline

### Production Inference System

```python
"""
Ensemble multiple models for robust predictions
Combines deep learning, gradient boosting, and collaborative filtering
"""

import joblib
import torch
from typing import Dict, List

class EnsemblePredictor:
    def __init__(self, model_paths: Dict[str, str]):
        """
        Load all models
        """
        # Deep learning model
        self.two_tower_model = torch.load(model_paths['two_tower'])
        self.two_tower_model.eval()
        
        # Gradient boosting
        self.xgboost_model = joblib.load(model_paths['xgboost'])
        
        # Collaborative filtering
        self.ncf_model = torch.load(model_paths['ncf'])
        self.ncf_model.eval()
        
        # Semantic matcher
        self.semantic_matcher = SemanticMatcher()
        
        # Feature engineer
        self.feature_engineer = FeatureEngineer()
        
        # Ensemble weights (learned via validation set)
        self.weights = {
            'two_tower': 0.40,
            'xgboost': 0.30,
            'ncf': 0.20,
            'semantic': 0.10
        }
    
    def predict(self, creator, campaign, historical_data):
        """
        Generate ensemble prediction
        """
        with torch.no_grad():
            # 1. Two-tower prediction
            creator_features = self._prepare_two_tower_features(creator)
            campaign_features = self._prepare_two_tower_features(campaign)
            two_tower_output = self.two_tower_model(creator_features, campaign_features)
            two_tower_score = two_tower_output['match_score'].item()
            
            # 2. XGBoost prediction
            interaction_features = self.feature_engineer.interaction_features(creator, campaign)
            creator_feats = self.feature_engineer.creator_features(creator, historical_data)
            campaign_feats = self.feature_engineer.campaign_features(campaign, {})
            
            all_features = {**creator_feats, **campaign_feats, **interaction_features}
            feature_vector = self._dict_to_vector(all_features)
            xgboost_score = self.xgboost_model.predict_proba([feature_vector])[0][1]
            
            # 3. NCF prediction
            creator_id = torch.tensor([creator['id']])
            campaign_id = torch.tensor([campaign['id']])
            ncf_score = self.ncf_model(creator_id, campaign_id).item()
            
            # 4. Semantic similarity
            semantic_score = self.semantic_matcher.compute_semantic_similarity(
                self.semantic_matcher.encode_creator_profile(creator),
                self.semantic_matcher.encode_campaign(campaign)
            )
            
            # Ensemble combination
            final_score = (
                self.weights['two_tower'] * two_tower_score +
                self.weights['xgboost'] * xgboost_score +
                self.weights['ncf'] * ncf_score +
                self.weights['semantic'] * semantic_score
            )
            
            return {
                'match_score': final_score,
                'success_probability': two_tower_output['success_probability'].item(),
                'estimated_roi': two_tower_output['estimated_roi'].item(),
                'model_breakdown': {
                    'two_tower': two_tower_score,
                    'xgboost': xgboost_score,
                    'ncf': ncf_score,
                    'semantic': semantic_score
                },
                'confidence': self._compute_confidence([
                    two_tower_score, xgboost_score, ncf_score, semantic_score
                ])
            }
    
    def batch_predict(self, campaign, creators: List[dict], top_k=20):
        """
        Efficiently rank many creators for a campaign
        """
        scores = []
        for creator in creators:
            prediction = self.predict(creator, campaign, historical_data={})
            scores.append((creator['id'], prediction['match_score'], prediction))
        
        # Sort by score
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_k]
    
    def _compute_confidence(self, model_scores):
        """
        Compute prediction confidence based on model agreement
        Low variance = high confidence
        """
        variance = np.var(model_scores)
        # Convert variance to confidence (0-1 scale)
        confidence = 1 / (1 + 10 * variance)
        return confidence
```

---

## 6. Training Pipeline with MLOps

### Complete Training Infrastructure

```python
"""
MLOps pipeline for model training, evaluation, and deployment
Includes experiment tracking, model registry, and A/B testing
"""

import mlflow
import mlflow.pytorch
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset

class MatchingDataset(Dataset):
    """PyTorch dataset for creator-campaign pairs"""
    def __init__(self, data, feature_engineer):
        self.data = data
        self.feature_engineer = feature_engineer
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        sample = self.data[idx]
        # Extract and prepare features
        creator_features = self._prepare_creator_features(sample['creator'])
        campaign_features = self._prepare_campaign_features(sample['campaign'])
        labels = {
            'match_label': sample['matched'],
            'success_label': sample['successful'],
            'roi_value': sample['roi']
        }
        return creator_features, campaign_features, labels


class MLTrainingPipeline:
    """
    Complete ML training pipeline with experiment tracking
    """
    def __init__(self, config):
        self.config = config
        mlflow.set_tracking_uri(config.mlflow_uri)
        mlflow.set_experiment(config.experiment_name)
    
    def train_two_tower_model(self, training_data, validation_data):
        """
        Train two-tower model with MLflow tracking
        """
        with mlflow.start_run(run_name="two_tower_training"):
            # Log parameters
            mlflow.log_params({
                'embedding_dim': self.config.embedding_dim,
                'learning_rate': self.config.learning_rate,
                'batch_size': self.config.batch_size,
                'num_epochs': self.config.num_epochs
            })
            
            # Create dataloaders
            train_loader = DataLoader(
                MatchingDataset(training_data, FeatureEngineer()),
                batch_size=self.config.batch_size,
                shuffle=True
            )
            
            val_loader = DataLoader(
                MatchingDataset(validation_data, FeatureEngineer()),
                batch_size=self.config.batch_size
            )
            
            # Initialize model
            model = TwoTowerMatcher(self.config)
            optimizer = torch.optim.Adam(model.parameters(), lr=self.config.learning_rate)
            criterion = MultiTaskLoss()
            
            # Training loop
            best_val_loss = float('inf')
            for epoch in range(self.config.num_epochs):
                train_loss = self._train_epoch(model, train_loader, optimizer, criterion)
                val_loss, metrics = self._validate(model, val_loader, criterion)
                
                # Log metrics
                mlflow.log_metrics({
                    'train_loss': train_loss,
                    'val_loss': val_loss,
                    'precision@10': metrics['precision_at_10'],
                    'recall@100': metrics['recall_at_100'],
                    'ndcg@10': metrics['ndcg_at_10']
                }, step=epoch)
                
                # Save best model
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    mlflow.pytorch.log_model(model, "two_tower_model")
            
            return model
    
    def hyperparameter_tuning(self, training_data, validation_data):
        """
        Automated hyperparameter optimization with Optuna
        """
        import optuna
        
        def objective(trial):
            # Sample hyperparameters
            config = {
                'embedding_dim': trial.suggest_int('embedding_dim', 64, 256),
                'learning_rate': trial.suggest_loguniform('learning_rate', 1e-5, 1e-2),
                'dropout_rate': trial.suggest_uniform('dropout_rate', 0.1, 0.5),
                'num_layers': trial.suggest_int('num_layers', 2, 5)
            }
            
            # Train model
            model = self.train_two_tower_model(training_data, validation_data)
            
            # Evaluate
            val_loss, metrics = self._validate(model, validation_data, MultiTaskLoss())
            
            return metrics['ndcg_at_10']  # Optimize for ranking quality
        
        # Run optimization
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=50)
        
        # Log best parameters
        mlflow.log_params(study.best_params)
        
        return study.best_params
    
    def evaluate_model(self, model, test_data):
        """
        Comprehensive model evaluation
        """
        metrics = {
            'precision_at_k': [],
            'recall_at_k': [],
            'ndcg_at_k': [],
            'map': 0.0  # Mean Average Precision
        }
        
        # Compute metrics (implementation details omitted for brevity)
        
        return metrics
```

---

## 7. Real-Time Inference API

### FastAPI Production Service

```python
"""
Production-ready ML inference API
Handles high-throughput requests with caching and monitoring
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import redis
import json
from prometheus_client import Counter, Histogram
import time

app = FastAPI()

# Monitoring
prediction_counter = Counter('predictions_total', 'Total predictions made')
prediction_latency = Histogram('prediction_latency_seconds', 'Prediction latency')

# Redis cache
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Load models
ensemble = EnsemblePredictor(model_paths={
    'two_tower': 'models/two_tower.pt',
    'xgboost': 'models/xgboost.pkl',
    'ncf': 'models/ncf.pt'
})

class PredictionRequest(BaseModel):
    creator_id: int
    campaign_id: int
    include_explanation: bool = False

class PredictionResponse(BaseModel):
    match_score: float
    success_probability: float
    estimated_roi: float
    confidence: float
    explanation: dict = None

@app.post("/predict", response_model=PredictionResponse)
async def predict_match(request: PredictionRequest):
    """
    Predict creator-campaign match score
    """
    start_time = time.time()
    
    # Check cache
    cache_key = f"prediction:{request.creator_id}:{request.campaign_id}"
    cached_result = redis_client.get(cache_key)
    if cached_result:
        prediction_counter.inc()
        return json.loads(cached_result)
    
    try:
        # Fetch data from database
        creator = fetch_creator(request.creator_id)
        campaign = fetch_campaign(request.campaign_id)
        historical_data = fetch_historical_data(request.creator_id)
        
        # Run prediction
        prediction = ensemble.predict(creator, campaign, historical_data)
        
        # Add explanation if requested
        if request.include_explanation:
            prediction['explanation'] = generate_explanation(prediction)
        
        # Cache result (TTL: 1 hour)
        redis_client.setex(cache_key, 3600, json.dumps(prediction))
        
        # Metrics
        prediction_counter.inc()
        prediction_latency.observe(time.time() - start_time)
        
        return prediction
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch_predict")
async def batch_predict_matches(campaign_id: int, creator_ids: List[int], top_k: int = 20):
    """
    Rank multiple creators for a campaign
    """
    campaign = fetch_campaign(campaign_id)
    creators = [fetch_creator(cid) for cid in creator_ids]
    
    rankings = ensemble.batch_predict(campaign, creators, top_k=top_k)
    
    return {
        'campaign_id': campaign_id,
        'top_matches': [
            {
                'creator_id': cid,
                'match_score': score,
                'details': details
            }
            for cid, score, details in rankings
        ]
    }
```

---

## Summary

This specification provides **production-grade ML/AI architecture** with:

1. **Two-Tower Deep Neural Network**: State-of-the-art recommendation system
2. **Transformer-Based Semantic Matching**: BERT embeddings for content understanding
3. **Neural Collaborative Filtering**: Leverage user-item interaction patterns
4. **Comprehensive Feature Engineering**: 50+ behavioral, temporal, and contextual features
5. **Model Ensemble**: Combine multiple models for robust predictions
6. **MLOps Pipeline**: Experiment tracking, hyperparameter tuning, model registry
7. **Production API**: FastAPI with caching, monitoring, and high throughput

**Next Steps**: Implement data generation scripts and begin model training! 🚀
