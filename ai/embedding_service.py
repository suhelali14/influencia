"""
Local Embedding Service
========================
Generates 384-dimensional semantic vectors using sentence-transformers/all-MiniLM-L6-v2.
Runs completely LOCAL — no API calls, no cost, no latency from network.

Model is downloaded once (~90MB) to ~/.cache/huggingface on first run.
All subsequent calls are instant CPU inference.

Usage:
    from embedding_service import get_embedder

    embedder = get_embedder()
    vec = embedder.embed_text("fitness influencer yoga India")          # → list[float] len=384
    vecs = embedder.embed_batch(["text1", "text2", "text3"])           # → list[list[float]]
    sim = embedder.cosine_similarity(vec1, vec2)                        # → float 0.0-1.0
    top = embedder.top_k_similar(query_vec, candidate_vecs, k=10)      # → list[(idx, score)]
"""

import os
import logging
import time
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Lazy load — only import sentence_transformers
# when first embedding is requested
# ─────────────────────────────────────────────
_model = None
_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_EMBEDDING_DIM = 384


def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"[Embedder] Loading model: {_MODEL_NAME}")
        t0 = time.time()
        _model = SentenceTransformer(_MODEL_NAME)
        logger.info(f"[Embedder] Model loaded in {time.time() - t0:.2f}s")
        return _model
    except ImportError:
        logger.error("[Embedder] sentence-transformers not installed. Run: pip install sentence-transformers")
        return None


class EmbeddingService:
    """
    Wraps sentence-transformers for creator and campaign embeddings.
    Thread-safe: sentence-transformers model inference is thread-safe for reads.
    """

    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            self._model = _load_model()
        return self._model

    @property
    def available(self) -> bool:
        return self.model is not None

    def embed_text(self, text: str) -> Optional[List[float]]:
        """
        Generate 384-dim embedding for a single text string.
        Returns None if model not available.
        """
        if not self.model or not text:
            return None
        try:
            vec = self.model.encode(text.strip()[:512], normalize_embeddings=True)
            return vec.tolist()
        except Exception as e:
            logger.error(f"[Embedder] embed_text failed: {e}")
            return None

    def embed_batch(self, texts: List[str], batch_size: int = 64) -> List[Optional[List[float]]]:
        """
        Batch embed multiple texts efficiently.
        Much faster than calling embed_text in a loop.
        """
        if not self.model or not texts:
            return [None] * len(texts)
        try:
            clean = [t.strip()[:512] if t else "" for t in texts]
            vecs = self.model.encode(clean, batch_size=batch_size, normalize_embeddings=True, show_progress_bar=False)
            return [v.tolist() for v in vecs]
        except Exception as e:
            logger.error(f"[Embedder] embed_batch failed: {e}")
            return [None] * len(texts)

    def cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """
        Cosine similarity between two pre-normalized vectors.
        Since we use normalize_embeddings=True, this is just a dot product.
        """
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0
        return float(sum(a * b for a, b in zip(vec_a, vec_b)))

    def top_k_similar(
        self,
        query_vec: List[float],
        candidate_vecs: List[List[float]],
        k: int = 20
    ) -> List[tuple]:
        """
        Find top-k most similar vectors to query.
        Returns list of (index, score) tuples, sorted by score descending.
        Used for local incremental matrix updates when pgvector is unavailable.
        """
        if not query_vec or not candidate_vecs:
            return []
        scored = [
            (i, self.cosine_similarity(query_vec, cv))
            for i, cv in enumerate(candidate_vecs)
            if cv
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:k]

    # ─────────────────────────────────────────────
    # Creator text builder
    # ─────────────────────────────────────────────
    @staticmethod
    def build_creator_text(creator: Dict[str, Any]) -> str:
        """
        Build the canonical text representation of a creator for embedding.
        More descriptive = better semantic search quality.
        """
        parts = []
        if creator.get("name"):
            parts.append(creator["name"])
        if creator.get("platform"):
            parts.append(f"{creator['platform']} creator")
        if creator.get("categories"):
            cats = creator["categories"] if isinstance(creator["categories"], list) else []
            parts.append("niche: " + ", ".join(cats[:5]))
        if creator.get("region"):
            parts.append(f"location: {creator['region']}")
        if creator.get("content_style"):
            parts.append(creator["content_style"][:200])
        if creator.get("bio_text"):
            parts.append(creator["bio_text"][:300])
        if creator.get("audience_summary"):
            parts.append(creator["audience_summary"][:150])
        followers = int(creator.get("followers_count") or 0)
        if followers > 0:
            if followers >= 1_000_000:
                parts.append(f"mega influencer {followers//1_000_000}M followers")
            elif followers >= 100_000:
                parts.append(f"macro influencer {followers//1_000}K followers")
            elif followers >= 10_000:
                parts.append(f"micro influencer {followers//1_000}K followers")
            else:
                parts.append(f"nano influencer {followers} followers")
        return " | ".join(parts)

    # ─────────────────────────────────────────────
    # Campaign text builder
    # ─────────────────────────────────────────────
    @staticmethod
    def build_campaign_text(campaign: Dict[str, Any]) -> str:
        """
        Build the canonical text representation of a campaign for embedding.
        """
        parts = []
        if campaign.get("title"):
            parts.append(campaign["title"])
        if campaign.get("category"):
            parts.append(f"category: {campaign['category']}")
        if campaign.get("platform"):
            parts.append(f"platform: {campaign['platform']}")
        if campaign.get("description"):
            parts.append(campaign["description"][:300])
        ta = campaign.get("target_audience") or {}
        if ta.get("interests"):
            interests = ta["interests"] if isinstance(ta["interests"], list) else []
            parts.append("interests: " + ", ".join(interests[:5]))
        if ta.get("location") or ta.get("locations"):
            loc = ta.get("location") or (ta.get("locations") or [""])[0]
            parts.append(f"target location: {loc}")
        budget = float(campaign.get("budget") or 0)
        if budget > 500_000:
            parts.append("mega campaign large budget")
        elif budget > 100_000:
            parts.append("macro campaign substantial budget")
        elif budget > 20_000:
            parts.append("mid campaign medium budget")
        else:
            parts.append("micro campaign small budget")
        return " | ".join(parts)


# ─────────────────────────────────────────────
# Module-level singleton
# ─────────────────────────────────────────────
_embedder: Optional[EmbeddingService] = None


def get_embedder() -> EmbeddingService:
    global _embedder
    if _embedder is None:
        _embedder = EmbeddingService()
    return _embedder


# ─────────────────────────────────────────────
# CLI Test
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import json
    logging.basicConfig(level=logging.INFO)

    embedder = get_embedder()
    print(f"Model available: {embedder.available}")

    if embedder.available:
        test_creators = [
            {"name": "Fitness Guru", "platform": "instagram", "categories": ["fitness", "health"],
             "region": "Mumbai", "followers_count": 85000, "content_style": "workout routines and diet tips"},
            {"name": "Tech Reviewer", "platform": "youtube", "categories": ["tech", "gadgets"],
             "region": "Bangalore", "followers_count": 250000, "content_style": "smartphone reviews and unboxings"},
            {"name": "Food Blogger", "platform": "instagram", "categories": ["food", "lifestyle"],
             "region": "Delhi", "followers_count": 45000, "content_style": "home cooking recipes"},
        ]
        test_campaign = {
            "title": "Protein Supplement Launch India",
            "category": "fitness",
            "platform": "instagram",
            "description": "Looking for fitness influencers to promote our whey protein supplement",
            "target_audience": {"location": "India", "interests": ["fitness", "health", "gym"]},
            "budget": 50000,
        }

        campaign_text = EmbeddingService.build_campaign_text(test_campaign)
        campaign_vec = embedder.embed_text(campaign_text)
        print(f"\nCampaign text: {campaign_text[:100]}...")
        print(f"Campaign embedding dim: {len(campaign_vec)}")

        creator_texts = [EmbeddingService.build_creator_text(c) for c in test_creators]
        creator_vecs = embedder.embed_batch(creator_texts)

        top = embedder.top_k_similar(campaign_vec, creator_vecs, k=3)
        print("\nTop creator matches for fitness campaign:")
        for idx, score in top:
            print(f"  {test_creators[idx]['name']:20s} → similarity: {score:.4f}")
