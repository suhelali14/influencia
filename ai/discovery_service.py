"""
AI Discovery Service — Internet-based Creator Research using Gemini

Uses Google Gemini with web search grounding to find and analyze
the top creators for any given campaign, regardless of whether
they are on the Influencia platform.
"""

import os
import json
import logging
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class DiscoveryService:
    """
    Discovers and analyzes creators from the internet using Gemini AI.
    """

    def __init__(self, gemini_api_key: Optional[str] = None):
        self.api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        self._model = None

    def _get_model(self):
        """Lazy-load Gemini model with search grounding."""
        if self._model is None:
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=self.api_key)
                self._client = client
                self._types = types
                # Use gemini-2.0-flash for speed + cost efficiency
                self._model_name = "gemini-2.0-flash"
                logger.info("✅ Gemini discovery model initialized")
            except ImportError:
                logger.error("❌ google-genai package not installed")
                raise ImportError("Install: pip install google-genai")
        return True

    def discover_creators(
        self,
        campaign: Dict[str, Any],
        region: Optional[str] = None,
        count: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Discover top creators for a campaign using AI web research.

        Args:
            campaign: Campaign details (title, category, platform, budget, etc.)
            region: Optional region focus (defaults to campaign target locations)
            count: Number of creators to discover (default 100)

        Returns:
            List of discovered creator dicts with scores and analysis.
        """
        self._get_model()

        platform = campaign.get("platform", "instagram")
        category = campaign.get("category", "lifestyle")
        budget = campaign.get("budget", 10000)
        title = campaign.get("title", "Campaign")
        target_audience = campaign.get("target_audience", {})
        region = region or ", ".join(target_audience.get("locations", [])) or "India"

        # Build comprehensive prompt
        prompt = self._build_discovery_prompt(
            platform=platform,
            category=category,
            budget=budget,
            title=title,
            region=region,
            target_audience=target_audience,
            count=count,
        )

        try:
            # Call Gemini with Google Search grounding
            response = self._client.models.generate_content(
                model=self._model_name,
                contents=prompt,
                config=self._types.GenerateContentConfig(
                    tools=[self._types.Tool(google_search=self._types.GoogleSearch())],
                    temperature=0.3,
                ),
            )

            raw_text = response.text
            logger.info(f"📡 Gemini returned {len(raw_text)} chars of discovery data")

            # Parse the structured response
            creators = self._parse_discovery_response(raw_text, campaign)
            logger.info(f"✅ Parsed {len(creators)} discovered creators")

            return creators[:count]

        except Exception as e:
            logger.error(f"❌ Discovery search failed: {e}")
            # Return fallback data so the feature doesn't break
            return self._get_fallback_creators(platform, category, region, count)

    def _build_discovery_prompt(
        self,
        platform: str,
        category: str,
        budget: float,
        title: str,
        region: str,
        target_audience: Dict,
        count: int,
    ) -> str:
        """Build a structured prompt for Gemini creator discovery."""

        age_range = target_audience.get("age_range", "18-35")
        gender = target_audience.get("gender", "All")

        return f"""You are an expert influencer marketing researcher. I need you to research and find the TOP {count} content creators/influencers for the following campaign. Search the internet for real, active creators.

**Campaign Details:**
- Title: {title}
- Platform: {platform}
- Category/Niche: {category}
- Budget: ${budget:,.0f}
- Target Region: {region}
- Target Audience Age: {age_range}
- Target Audience Gender: {gender}

**Requirements:**
Find exactly {count} creators. For EACH creator, provide ALL of these details:

1. **name**: Full/display name
2. **handle**: Their @handle on {platform}
3. **platform**: {platform}
4. **profile_url**: Direct link to their profile
5. **followers_count**: Number (approximate is fine)
6. **engagement_rate**: Percentage (estimated from visible metrics)
7. **match_score**: 0-100 score for how well they fit THIS campaign
8. **content_style**: Brief description of their content style
9. **audience_summary**: Who their audience is (age, gender, interests)
10. **strengths**: Array of 2-3 strengths for this campaign
11. **concerns**: Array of 0-2 potential concerns
12. **ai_summary**: 2-3 sentence analysis of why they're a good fit
13. **recent_content**: Description of their last 3-5 recent posts/videos
14. **region**: Their primary location/country
15. **categories**: Array of their content categories

**Ranking criteria (in priority order):**
1. Category/niche relevance to "{category}"
2. Engagement rate (higher = better)
3. Audience alignment with target demographics
4. Content quality and consistency
5. Region match with "{region}"
6. Follower count appropriate for budget ${budget:,.0f}

**Budget Tiers for reference:**
- $500-$5,000 → Nano/Micro creators (1K-50K followers)
- $5,000-$25,000 → Mid-tier creators (50K-500K followers)
- $25,000-$100,000 → Macro creators (500K-5M followers)
- $100,000+ → Mega/Celebrity creators (5M+ followers)

**IMPORTANT FORMAT:**
Return ONLY a valid JSON array. Each element must be a JSON object with the exact keys listed above.
Do NOT include markdown formatting, code fences, or explanation text.
Start directly with [ and end with ].
"""

    def _parse_discovery_response(
        self, raw_text: str, campaign: Dict
    ) -> List[Dict[str, Any]]:
        """Parse Gemini's response into structured creator data."""

        # Clean the response — strip markdown code fences if present
        text = raw_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        # Find JSON array boundaries
        start = text.find("[")
        end = text.rfind("]")
        if start == -1 or end == -1:
            logger.warning("No JSON array found in Gemini response, using fallback")
            return []

        json_str = text[start : end + 1]

        try:
            creators_raw = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            # Try to fix common issues (trailing commas, etc.)
            try:
                import re
                fixed = re.sub(r",\s*([}\]])", r"\1", json_str)
                creators_raw = json.loads(fixed)
            except Exception:
                logger.error("Could not parse Gemini response even after cleanup")
                return []

        # Normalize and validate each creator
        creators = []
        for i, raw in enumerate(creators_raw):
            if not isinstance(raw, dict):
                continue

            creator = {
                "name": str(raw.get("name", f"Creator {i+1}")),
                "handle": str(raw.get("handle", f"creator_{i+1}")),
                "platform": str(raw.get("platform", campaign.get("platform", "instagram"))).lower(),
                "profile_url": raw.get("profile_url", ""),
                "avatar_url": raw.get("avatar_url", ""),
                "followers_count": self._safe_int(raw.get("followers_count", raw.get("followers", 0))),
                "engagement_rate": round(self._safe_float(raw.get("engagement_rate", 3.0)), 2),
                "match_score": round(min(100, max(0, self._safe_float(raw.get("match_score", 50)))), 1),
                "content_style": str(raw.get("content_style", "")),
                "audience_summary": str(raw.get("audience_summary", "")),
                "strengths": self._ensure_list(raw.get("strengths", [])),
                "concerns": self._ensure_list(raw.get("concerns", [])),
                "ai_summary": str(raw.get("ai_summary", "")),
                "recent_content": raw.get("recent_content", []),
                "region": str(raw.get("region", "")),
                "categories": self._ensure_list(raw.get("categories", [])),
                "rank": i + 1,
            }
            creators.append(creator)

        # Sort by match score descending, re-assign ranks
        creators.sort(key=lambda c: c["match_score"], reverse=True)
        for i, c in enumerate(creators):
            c["rank"] = i + 1

        return creators

    def _get_fallback_creators(
        self, platform: str, category: str, region: str, count: int
    ) -> List[Dict[str, Any]]:
        """Return minimal fallback data when Gemini is unavailable."""
        logger.warning("Using fallback creator data (Gemini unavailable)")
        return [
            {
                "name": f"Suggested Creator #{i+1}",
                "handle": f"creator_{category}_{i+1}",
                "platform": platform,
                "profile_url": "",
                "avatar_url": "",
                "followers_count": max(5000, 100000 - i * 1000),
                "engagement_rate": round(max(1.0, 8.0 - i * 0.05), 2),
                "match_score": round(max(30, 95 - i * 0.7), 1),
                "content_style": f"{category} content creator",
                "audience_summary": f"Engaged {category} audience in {region}",
                "strengths": [f"Active in {category}", f"Based in {region}"],
                "concerns": ["Data from fallback — Gemini API was unavailable"],
                "ai_summary": "AI web research was unavailable. This is placeholder data. Please retry when Gemini API is accessible.",
                "recent_content": [],
                "region": region,
                "categories": [category],
                "rank": i + 1,
            }
            for i in range(min(count, 20))
        ]

    @staticmethod
    def _safe_int(val, default=0) -> int:
        try:
            if isinstance(val, str):
                val = val.replace(",", "").replace("+", "").replace("~", "").strip()
                if val.lower().endswith("m"):
                    return int(float(val[:-1]) * 1_000_000)
                if val.lower().endswith("k"):
                    return int(float(val[:-1]) * 1_000)
            return int(val)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _safe_float(val, default=0.0) -> float:
        try:
            if isinstance(val, str):
                val = val.replace("%", "").replace(",", "").strip()
            return float(val)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _ensure_list(val) -> list:
        if isinstance(val, list):
            return [str(v) for v in val]
        if isinstance(val, str):
            return [s.strip() for s in val.split(",") if s.strip()]
        return []
