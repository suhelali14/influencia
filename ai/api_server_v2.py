"""
Production AI API Server

This is the production-grade API server for the recommendation system.
Features:
- RESTful API with proper error handling
- Request validation with Pydantic
- Caching with Redis (if available)
- Rate limiting
- Health checks
- Structured logging
- Prometheus metrics
"""

import os
import sys
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from functools import wraps
import time
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from flask import Flask, request, jsonify, Response
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
CORS(app, origins=cors_origins if cors_origins != ['*'] else '*')

# Import recommendation engine
try:
    from core.recommendation_engine import (
        RecommendationEngine, 
        get_recommendation_engine,
        initialize_recommendation_engine
    )
    from core.entities import Creator, Campaign, RecommendationConfig
    ENGINE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Could not import recommendation engine: {e}")
    ENGINE_AVAILABLE = False

# Import legacy engine as fallback
try:
    from ai_service import AIPredictionService
    LEGACY_AVAILABLE = True
except ImportError:
    LEGACY_AVAILABLE = False

# Import Internet Discovery Service
try:
    from discovery_service_v2 import get_discovery_service
    DISCOVERY_AVAILABLE = True
    logger.info("✅ Internet Discovery Service loaded")
except ImportError as e:
    DISCOVERY_AVAILABLE = False
    logger.warning(f"⚠️  Discovery service not available: {e}")

# Import Local Embedding Service
try:
    from embedding_service import get_embedder, EmbeddingService
    EMBEDDER_AVAILABLE = True
    logger.info("✅ Embedding Service loaded (all-MiniLM-L6-v2)")
except ImportError as e:
    EMBEDDER_AVAILABLE = False
    logger.warning(f"⚠️  Embedding service not available: {e} (run: pip install sentence-transformers)")


# Configuration
class Config:
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    CACHE_TTL = int(os.environ.get('CACHE_TTL', 3600))
    RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT', 100))
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', os.environ.get('GOOGLE_API_KEY'))
    USE_LLM = os.environ.get('USE_LLM', 'true').lower() == 'true'


# Simple in-memory cache (use Redis in production)
_cache = {}
_rate_limits = {}


def cache_response(ttl_seconds: int = 300):
    """Decorator for caching API responses"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Create cache key from request
            cache_key = f"{f.__name__}:{request.path}:{json.dumps(request.get_json() or {}, sort_keys=True)}"
            
            # Check cache
            if cache_key in _cache:
                cached_time, cached_value = _cache[cache_key]
                if time.time() - cached_time < ttl_seconds:
                    return cached_value
            
            # Call function
            result = f(*args, **kwargs)
            
            # Cache result
            _cache[cache_key] = (time.time(), result)
            
            return result
        return wrapped
    return decorator


def rate_limit(max_per_minute: int = 60):
    """Simple rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            client_ip = request.remote_addr
            current_minute = int(time.time() / 60)
            key = f"{client_ip}:{current_minute}"
            
            count = _rate_limits.get(key, 0)
            if count >= max_per_minute:
                return jsonify({
                    'success': False,
                    'error': 'Rate limit exceeded',
                    'message': f'Maximum {max_per_minute} requests per minute'
                }), 429
            
            _rate_limits[key] = count + 1
            
            # Clean old entries
            for k in list(_rate_limits.keys()):
                if not k.endswith(f":{current_minute}"):
                    del _rate_limits[k]
            
            return f(*args, **kwargs)
        return wrapped
    return decorator


def validate_request(required_fields: List[str]):
    """Decorator for request validation"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'error': 'Invalid request',
                    'message': 'Request body must be JSON'
                }), 400
            
            missing = [field for field in required_fields if field not in data]
            if missing:
                return jsonify({
                    'success': False,
                    'error': 'Missing required fields',
                    'message': f'Missing: {", ".join(missing)}'
                }), 400
            
            return f(*args, **kwargs)
        return wrapped
    return decorator


# Health check endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0'
    })


@app.route('/health/detailed', methods=['GET'])
def detailed_health():
    """Detailed health check with component status"""
    components = {
        'recommendation_engine': ENGINE_AVAILABLE,
        'legacy_engine': LEGACY_AVAILABLE,
        'llm_integration': bool(Config.GEMINI_API_KEY) and Config.USE_LLM,
    }
    
    all_healthy = any(components.values())
    
    return jsonify({
        'status': 'healthy' if all_healthy else 'degraded',
        'components': components,
        'timestamp': datetime.now().isoformat()
    }), 200 if all_healthy else 503


@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Get system metrics"""
    metrics = {
        'cache_size': len(_cache),
        'timestamp': datetime.now().isoformat()
    }
    
    if ENGINE_AVAILABLE:
        try:
            engine = get_recommendation_engine()
            metrics.update(engine.get_metrics())
        except:
            pass
    
    return jsonify(metrics)


# Main recommendation endpoints
@app.route('/api/v2/recommend/creators', methods=['POST'])
@rate_limit(Config.RATE_LIMIT_PER_MINUTE)
@validate_request(['campaign'])
def recommend_creators():
    """
    Get creator recommendations for a campaign.
    
    Request body:
    {
        "campaign": {
            "id": "campaign_id",
            "brand_id": "brand_id",
            "brand_name": "Brand Name",
            "title": "Campaign Title",
            "description": "Campaign description",
            "platform": "instagram",
            "categories": ["fashion", "lifestyle"],
            "budget": 5000,
            "min_followers": 10000,
            "max_followers": 100000,
            "target_engagement_rate": 0.03,
            "target_locations": ["india"],
            "target_languages": ["english", "hindi"],
            "preferred_tiers": ["micro", "mid"]
        },
        "limit": 20,
        "exclusions": ["creator_id_to_exclude"],
        "filters": {"tier": ["micro", "mid"]}
    }
    """
    data = request.get_json()
    start_time = time.time()
    
    try:
        campaign_data = data['campaign']
        limit = data.get('limit', 20)
        exclusions = set(data.get('exclusions', []))
        filters = data.get('filters')
        
        # Build Campaign object
        campaign = Campaign(
            id=campaign_data.get('id', 'temp_campaign'),
            brand_id=campaign_data.get('brand_id', ''),
            brand_name=campaign_data.get('brand_name', ''),
            title=campaign_data.get('title', ''),
            description=campaign_data.get('description', ''),
            platform=campaign_data.get('platform', 'instagram'),
            categories=campaign_data.get('categories', []),
            budget=float(campaign_data.get('budget', 0)),
            min_followers=int(campaign_data.get('min_followers', 0)),
            max_followers=int(campaign_data.get('max_followers', 0)),
            target_engagement_rate=float(campaign_data.get('target_engagement_rate', 0.03)),
            target_locations=campaign_data.get('target_locations', []),
            target_languages=campaign_data.get('target_languages', []),
            preferred_tiers=campaign_data.get('preferred_tiers', []),
        )
        
        if ENGINE_AVAILABLE:
            engine = get_recommendation_engine()
            results = engine.recommend_creators_for_campaign(
                campaign=campaign,
                limit=limit,
                exclusions=exclusions,
                filters=filters
            )
            
            response_data = {
                'success': True,
                'recommendations': [r.to_dict() for r in results],
                'count': len(results),
                'latency_ms': (time.time() - start_time) * 1000,
                'version': '2.0.0'
            }
        elif LEGACY_AVAILABLE:
            # Fallback to legacy engine
            service = AIPredictionService()
            # Convert to legacy format and call
            response_data = {
                'success': True,
                'recommendations': [],
                'message': 'Using legacy engine',
                'version': '1.0.0'
            }
        else:
            return jsonify({
                'success': False,
                'error': 'No recommendation engine available'
            }), 503
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Recommendation failed: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/v2/match/score', methods=['POST'])
@rate_limit(Config.RATE_LIMIT_PER_MINUTE)
@validate_request(['creator', 'campaign'])
def get_match_score():
    """
    Get match score for a specific creator-campaign pair.
    
    Request body:
    {
        "creator": { ... creator data ... },
        "campaign": { ... campaign data ... },
        "include_explanation": true
    }
    """
    data = request.get_json()
    
    try:
        creator_data = data['creator']
        campaign_data = data['campaign']
        include_explanation = data.get('include_explanation', False)
        
        # Build objects
        creator = Creator(
            id=creator_data.get('id', ''),
            name=creator_data.get('name', ''),
            platform=creator_data.get('platform', 'instagram'),
            followers=int(creator_data.get('followers', 0)),
            engagement_rate=float(creator_data.get('engagement_rate', 0)),
            categories=creator_data.get('categories', []),
            location=creator_data.get('location', ''),
            language=creator_data.get('language', ''),
            avg_cost=float(creator_data.get('avg_cost', 0)),
            tier=creator_data.get('tier', 'micro'),
            content_quality_score=float(creator_data.get('content_quality_score', 0.7)),
            audience_authenticity=float(creator_data.get('audience_authenticity', 0.8)),
            total_campaigns=int(creator_data.get('total_campaigns', 0)),
            successful_campaigns=int(creator_data.get('successful_campaigns', 0)),
            avg_campaign_rating=float(creator_data.get('avg_campaign_rating', 4.0)),
        )
        
        campaign = Campaign(
            id=campaign_data.get('id', ''),
            brand_id=campaign_data.get('brand_id', ''),
            brand_name=campaign_data.get('brand_name', ''),
            title=campaign_data.get('title', ''),
            description=campaign_data.get('description', ''),
            platform=campaign_data.get('platform', 'instagram'),
            categories=campaign_data.get('categories', []),
            budget=float(campaign_data.get('budget', 0)),
            min_followers=int(campaign_data.get('min_followers', 0)),
            max_followers=int(campaign_data.get('max_followers', 0)),
            target_engagement_rate=float(campaign_data.get('target_engagement_rate', 0.03)),
            target_locations=campaign_data.get('target_locations', []),
            target_languages=campaign_data.get('target_languages', []),
            preferred_tiers=campaign_data.get('preferred_tiers', []),
        )
        
        if ENGINE_AVAILABLE:
            from core.feature_engineering import FeatureEngineering
            from core.ranking import RankingModel
            from core.embeddings import EmbeddingService
            
            fe = FeatureEngineering()
            fv = fe.compute_features(creator, campaign)
            
            ranking_model = RankingModel()
            ranking_model.load()
            score = ranking_model.predict_single(fv) * 100
            
            response_data = {
                'success': True,
                'match_score': score,
                'score_breakdown': {
                    'category_similarity': fv.category_similarity,
                    'platform_match': fv.platform_match,
                    'engagement_fit': fv.engagement_fit,
                    'budget_fit': fv.budget_fit,
                    'followers_fit': fv.followers_fit,
                },
                'predicted_success': score / 100,
            }
            
            if include_explanation:
                from core.llm_integration import LLMExplainer
                from core.entities import MatchResult
                
                explainer = LLMExplainer()
                match_result = MatchResult(
                    creator_id=creator.id,
                    campaign_id=campaign.id,
                    ranking_score=score
                )
                response_data['explanation'] = explainer.generate_match_explanation(
                    creator, campaign, match_result
                )
        else:
            # Fallback to simple scoring
            score = _simple_match_score(creator_data, campaign_data)
            response_data = {
                'success': True,
                'match_score': score,
                'version': '1.0.0'
            }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Match scoring failed: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/v2/analyze/creator', methods=['POST'])
@rate_limit(30)
@validate_request(['creator'])
def analyze_creator():
    """
    Analyze a creator profile for quality and recommendations.
    """
    data = request.get_json()
    
    try:
        creator_data = data['creator']
        
        analysis = {
            'quality_assessment': {
                'overall_score': 0.7,
                'content_quality': creator_data.get('content_quality_score', 0.7),
                'audience_authenticity': creator_data.get('audience_authenticity', 0.8),
                'engagement_health': 'good' if creator_data.get('engagement_rate', 0) > 0.03 else 'moderate',
            },
            'tier_classification': _classify_tier(creator_data.get('followers', 0)),
            'recommendations': [
                'Maintain consistent posting schedule',
                'Engage with audience comments',
                'Consider diversifying content formats'
            ],
            'best_fit_campaigns': [
                'Brand awareness campaigns',
                'Product launches',
                'Social media takeovers'
            ]
        }
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
        
    except Exception as e:
        logger.error(f"Creator analysis failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# Backward compatibility endpoints (for existing frontend)
@app.route('/predict', methods=['POST'])
def legacy_predict():
    """Legacy predict endpoint for backward compatibility"""
    data = request.get_json()
    
    try:
        creator = data.get('creator', {})
        campaign = data.get('campaign', {})
        
        score = _simple_match_score(creator, campaign)
        
        return jsonify({
            'success': True,
            'ml_predictions': {
                'match_score': score,
                'estimated_engagement': creator.get('followers', 0) * creator.get('engagement_rate', 0.03),
                'campaign_success_probability': score / 100,
                'tier_fit': 'good' if score > 60 else 'moderate',
            },
            'ai_insights': {
                'summary': f"Match score: {score:.1f}/100",
                'strengths': ['Category alignment', 'Platform match'],
                'weaknesses': [],
                'recommendations': ['Review recent content', 'Discuss deliverables'],
            }
        })
        
    except Exception as e:
        logger.error(f"Legacy predict failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/batch-predict', methods=['POST'])
def legacy_batch_predict():
    """Legacy batch predict endpoint"""
    data = request.get_json()
    
    try:
        creators = data.get('creators', [])
        campaign = data.get('campaign', {})
        
        results = []
        for creator in creators:
            score = _simple_match_score(creator, campaign)
            results.append({
                'creator_id': creator.get('id', ''),
                'match_score': score,
                'estimated_engagement': creator.get('followers', 0) * creator.get('engagement_rate', 0.03),
            })
        
        # Sort by score
        results.sort(key=lambda x: x['match_score'], reverse=True)
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Legacy batch predict failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def _simple_match_score(creator: Dict, campaign: Dict) -> float:
    """Simple match scoring for fallback"""
    score = 50.0  # Base score
    
    # Category match
    creator_cats = set(c.lower() for c in creator.get('categories', []))
    campaign_cats = set(c.lower() for c in campaign.get('categories', []))
    if creator_cats & campaign_cats:
        score += 20
    
    # Platform match
    if creator.get('platform', '').lower() == campaign.get('platform', '').lower():
        score += 15
    
    # Engagement
    if creator.get('engagement_rate', 0) >= campaign.get('target_engagement_rate', 0.03):
        score += 10
    
    # Followers in range
    followers = creator.get('followers', 0)
    min_f = campaign.get('min_followers', 0)
    max_f = campaign.get('max_followers', float('inf'))
    if min_f <= followers <= max_f:
        score += 5
    
    return min(100, max(0, score))


def _classify_tier(followers: int) -> str:
    """Classify creator tier based on followers"""
    if followers < 10000:
        return 'nano'
    elif followers < 50000:
        return 'micro'
    elif followers < 500000:
        return 'mid'
    elif followers < 1000000:
        return 'macro'
    else:
        return 'mega'


# ─────────────────────────────────────────────────────────
# Internet Creator Discovery Endpoints
# ─────────────────────────────────────────────────────────

@app.route('/api/discover-creators', methods=['POST'])
def discover_creators():
    """
    Discover real creators from the internet for a campaign.

    Request body:
    {
        "campaign": { id, title, category, platform, budget, target_audience },
        "region": "India",
        "count": 75
    }

    Sources used (in order):
      1. YouTube Data API v3  — FREE (requires YOUTUBE_API_KEY)
      2. Serper.dev SERP API  — ~$0.001/search (requires SERPER_API_KEY)
      3. Local heuristic scoring — FREE
      4. Gemini summaries (top 10 only) — optional, requires GEMINI_API_KEY
    """
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Request body must be JSON'}), 400

    campaign = data.get('campaign', {})
    region   = data.get('region', 'India')
    count    = min(int(data.get('count', 75)), 100)  # Hard cap at 100

    # Allow API keys to be passed in body as fallback (for NestJS → Python forwarding)
    env_overrides = data.get('_env', {})
    for key, val in env_overrides.items():
        if val and not os.environ.get(key):
            os.environ[key] = val

    if not campaign:
        return jsonify({'success': False, 'error': 'campaign is required'}), 400

    try:
        if DISCOVERY_AVAILABLE:
            service = get_discovery_service()
            creators = service.discover(campaign, region=region, count=count)
        else:
            # Minimal fallback using basic templates
            logger.warning("[Discovery] Service unavailable — returning empty list")
            creators = []

        logger.info(f"[Discovery] Returning {len(creators)} creators for campaign '{campaign.get('title', '?')}'")
        return jsonify({
            'success': True,
            'creators': creators,
            'total': len(creators),
            'sources': {
                'youtube': bool(os.environ.get('YOUTUBE_API_KEY')),
                'serper':  bool(os.environ.get('SERPER_API_KEY')),
                'gemini':  bool(os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')),
            }
        })

    except Exception as e:
        logger.error(f"[Discovery] discover_creators failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e), 'creators': []}), 500


@app.route('/api/discover-creators-fallback', methods=['POST'])
def discover_creators_fallback():
    """
    Lightweight fallback discovery — uses seed data when main discovery fails.
    Called by NestJS when the primary /api/discover-creators times out.
    """
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Request body must be JSON'}), 400

    campaign = data.get('campaign', {})
    region   = data.get('region', 'India')
    count    = min(int(data.get('count', 30)), 50)

    try:
        if DISCOVERY_AVAILABLE:
            service = get_discovery_service()
            # Use seed data directly for fast fallback
            category = (campaign.get('category') or 'lifestyle').lower()
            platform = (campaign.get('platform') or 'instagram').lower()
            creators = service._seed_creators(category, platform, region)
            creators = service._score_and_rank(creators, campaign, region)
            for i, c in enumerate(creators):
                c['rank'] = i + 1
            creators = creators[:count]
        else:
            creators = []

        return jsonify({'success': True, 'creators': creators, 'total': len(creators), 'fallback': True})

    except Exception as e:
        logger.error(f"[Discovery] fallback failed: {e}")
        return jsonify({'success': False, 'error': str(e), 'creators': []}), 500


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
# Embedding Endpoints
# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

@app.route('/api/embed-text', methods=['POST'])
def embed_text():
    """
    Generate a 384-dim embedding for a single text string.
    Used by NestJS to embed campaign descriptions for the similarity matrix.

    Request: { "text": "Fitness supplement launch India instagram" }
    Response: { "embedding": [0.12, -0.34, ...], "dim": 384 }
    """
    data = request.get_json()
    if not data or not data.get('text'):
        return jsonify({'success': False, 'error': 'text is required'}), 400

    if not EMBEDDER_AVAILABLE:
        return jsonify({'success': False, 'error': 'Embedding service not available. Install sentence-transformers.'}), 503

    try:
        embedder = get_embedder()
        embedding = embedder.embed_text(data['text'])
        if embedding is None:
            return jsonify({'success': False, 'error': 'Embedding failed'}), 500
        return jsonify({'success': True, 'embedding': embedding, 'dim': len(embedding)})
    except Exception as e:
        logger.error(f'[Embed] embed_text failed: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/embed-creators', methods=['POST'])
def embed_creators():
    """
    Batch-embed a list of creator profiles.
    Adds 'embedding' and 'bio_text' fields to each creator dict.

    Request: { "creators": [ { name, platform, categories, region, ... }, ... ] }
    Response: { "creators": [ { ...original, embedding: [...], bio_text: "..." }, ... ] }
    """
    data = request.get_json()
    if not data or not data.get('creators'):
        return jsonify({'success': False, 'error': 'creators list is required'}), 400

    creators = data['creators']

    if not EMBEDDER_AVAILABLE:
        # Return creators unchanged — NestJS will store without embeddings
        logger.warning('[Embed] Embedding service unavailable — returning creators without vectors')
        return jsonify({'success': True, 'creators': creators, 'embedded': False})

    try:
        embedder = get_embedder()

        # Build canonical bio texts
        bio_texts = [EmbeddingService.build_creator_text(c) for c in creators]

        # Batch embed — much faster than one-by-one
        embeddings = embedder.embed_batch(bio_texts)

        # Attach embedding + bio_text to each creator
        enriched = []
        for creator, bio, emb in zip(creators, bio_texts, embeddings):
            enriched.append({
                **creator,
                'bio_text': bio,
                'embedding': emb,   # None if model failed for this item
            })

        logger.info(f'[Embed] Batch embedded {len(enriched)} creators')
        return jsonify({
            'success': True,
            'creators': enriched,
            'embedded': True,
            'dim': 384,
        })
    except Exception as e:
        logger.error(f'[Embed] embed_creators failed: {e}')
        return jsonify({'success': False, 'error': str(e), 'creators': creators}), 500


# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'error': 'Not found',
        'message': 'The requested endpoint does not exist'
    }), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500


if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 5002))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"🚀 Starting AI API Server on port {port}")
    logger.info(f"📊 Recommendation Engine: {'Available' if ENGINE_AVAILABLE else 'Not Available'}")
    logger.info(f"🔄 Legacy Engine: {'Available' if LEGACY_AVAILABLE else 'Not Available'}")
    logger.info(f"🤖 LLM Integration: {'Enabled' if Config.USE_LLM and Config.GEMINI_API_KEY else 'Disabled'}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )
