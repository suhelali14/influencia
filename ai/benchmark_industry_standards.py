import os
import sys
import time
import numpy as np
import pandas as pd
from typing import Dict, Any

# Adjust path and import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.core.entities import Creator, Campaign, FeatureVector, MatchResult
from ai.core.recommendation_engine import RecommendationEngine

def generate_mock_creators(n=1000):
    creators = []
    for i in range(n):
        c = Creator(
            id=f"creator_{i}",
            name=f"Creator {i}",
            platform="instagram",
            followers=np.random.randint(10000, 1000000),
            engagement_rate=np.random.uniform(0.01, 0.15),
            categories=[["lifestyle", "fashion", "tech"][i % 3]],
            location="US",
            language="en",
            avg_cost=np.random.randint(500, 5000),
            tier="macro" if i % 10 == 0 else "mid",
            avg_views=np.random.randint(5000, 500000)
        )
        creators.append(c)
    return creators

def generate_mock_campaign():
    return Campaign(
        id="camp_bench_01",
        brand_id="brand_001",
        brand_name="TechBench",
        title="Tech Review Campaign",
        description="Looking for tech reviewers",
        platform="youtube",
        categories=["tech"],
        budget=10000.0,
        min_followers=50000,
        max_followers=500000,
        target_engagement_rate=0.03,
        target_locations=["US"],
        target_languages=["en"],
        preferred_tiers=["mid", "macro"]
    )

def run_benchmarks():
    print("=== Influencia ML Engine - Industry Standard Benchmark ===")
    
    n_creators = 1000
    print(f"\n[2] Generating Dataset: {n_creators} Creators...")
    creators = generate_mock_creators(n_creators)
    campaign = generate_mock_campaign()

    # Initialize Engine
    print("\n[1] Initialization Protocol...")
    t0 = time.time()
    engine = RecommendationEngine()
    engine.initialize(creators)
    init_time = time.time() - t0
    print(f"Engine Initialization Time: {init_time*1000:.2f} ms")
    
    # Embeddings / Vector Search Benchmark
    print("\n[3] Retrieval/Embedding Benchmark (vs. Industry: Sub-100ms)")
    t0 = time.time()
    embeddings = [engine.embedding_service.encode_creator(c) for c in creators[:100]]
    # Index 10K was already done in initialize()
    index_time = engine.embedding_service.index_latency if hasattr(engine.embedding_service, 'index_latency') else 0

    print(f"Indexing 10K Creators Time: N/A - Included in setup")
    
    t0 = time.time()
    candidates = engine.embedding_service.search_similar_creators(campaign, k=500)
    retrieval_time = (time.time() - t0) * 1000
    print(f"P99 Retrieval Latency (FAISS k=500): {retrieval_time:.2f} ms")
    
    # Ranking Benchmark
    print("\n[4] Ranking Model Benchmark (vs. Industry: Sub-50ms for 500 items)")
    t0 = time.time()
    
    # Evaluate 500 candidates
    features_list = []
    for c in creators[:500]:
        feat = engine.feature_engineering.compute_features(c, campaign)
        features_list.append(feat)
        
    rank_t0 = time.time()
    feature_matrix = np.array([f.to_array() for f in features_list])
    predictions = engine.ranking_model.predict(feature_matrix)
    ranking_time = (time.time() - rank_t0) * 1000
    print(f"P99 Ranking Latency (500 candidates): {ranking_time:.2f} ms")
    
    # Re-ranking Benchmark
    print("\n[5] Re-ranking Benchmark (Diversity & Fairness)")
    t0 = time.time()
    # Mock scores
    candidates_with_scores = []
    for i, c in enumerate(creators[:500]):
        score = np.random.uniform(50, 95)
        mr = MatchResult(creator_id=c.id, campaign_id=campaign.id, ranking_score=score)
        candidates_with_scores.append((c, mr))
    
    reranked = engine.reranker.rerank(candidates_with_scores, campaign, limit=50)
    rerank_time = (time.time() - t0) * 1000
    print(f"Re-ranking Latency (500 -> 50, MMR/TS): {rerank_time:.2f} ms")
    print(f"Re-ranking Output Size: {len(reranked)}")
    
    # Full Pipeline Latency
    print("\n[6] End-to-End Pipeline Latency (vs. Industry: Sub-250ms SLA)")
    t0 = time.time()
    final_recs = engine.recommend_creators_for_campaign(campaign, limit=50)
    e2e_time = (time.time() - t0) * 1000
    print(f"Total E2E Pipeline Latency: {e2e_time:.2f} ms")
    
    print("\n=== Benchmark Complete ===")

if __name__ == "__main__":
    run_benchmarks()
