"""
Internet Creator Discovery Engine v2
=====================================
Finds REAL creators from the internet for a given campaign using:

  1. YouTube Data API v3 (FREE - 10,000 units/day)
     - search.list (100 units/call) → channel IDs
     - channels.list (1 unit/call)  → real subscriber counts, bios
     - Max ~50 YouTube channels per campaign search

  2. Serper.dev Google SERP API (~$0.001/search)
     - site:instagram.com "niche" "region" queries
     - Extracts real handles + metadata from Google snippets
     - 3 targeted searches per campaign → ~30 Instagram creators
     - Free tier: 2,500 searches (enough for months)

  3. Local heuristic scoring (FREE - no API calls)
     - Niche/category match score
     - Follower tier fit vs campaign budget
     - Engagement rate quality score
     - Platform match bonus
     - Region relevance bonus

  4. Gemini AI summaries — ONLY for top 10 (< $0.001 total)
     - Batched into a single prompt → minimal tokens

Total cost per campaign: < $0.01
Creators returned: 50–100 real creators
"""

import os
import re
import json
import time
import logging
import urllib.parse
from typing import List, Dict, Optional, Any

import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
YOUTUBE_API_KEY   = os.environ.get("YOUTUBE_API_KEY", "")
SERPER_API_KEY    = os.environ.get("SERPER_API_KEY", "")
GEMINI_API_KEY    = os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY", ""))

YOUTUBE_SEARCH_URL  = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_CHANNEL_URL = "https://www.googleapis.com/youtube/v3/channels"
SERPER_SEARCH_URL   = "https://google.serper.dev/search"
GEMINI_URL          = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

# Max creators to return
MAX_CREATORS = 100
# Top N to enrich with Gemini summaries
GEMINI_TOP_N = 10


# ─────────────────────────────────────────────
# Niche → keyword mapping
# ─────────────────────────────────────────────
NICHE_KEYWORDS: Dict[str, List[str]] = {
    "fashion":      ["fashion blogger", "style influencer", "ootd creator", "fashion haul"],
    "beauty":       ["beauty influencer", "makeup artist", "skincare routine", "beauty blogger"],
    "fitness":      ["fitness influencer", "gym motivation", "workout routine", "health coach"],
    "food":         ["food blogger", "recipe creator", "home cooking", "food vlogger"],
    "travel":       ["travel vlogger", "travel blogger", "travel influencer", "wanderlust"],
    "tech":         ["tech reviewer", "gadget unboxing", "tech influencer", "tech youtuber"],
    "gaming":       ["gaming youtuber", "game streamer", "gaming influencer", "lets play"],
    "lifestyle":    ["lifestyle blogger", "daily vlog", "lifestyle influencer"],
    "education":    ["edtech creator", "study motivation", "educational content", "knowledge sharing"],
    "business":     ["entrepreneur influencer", "startup founder", "business motivation", "marketing tips"],
    "parenting":    ["mom blogger", "parenting tips", "family vlogger", "dad blogger"],
    "finance":      ["personal finance", "investment tips", "money saving", "financial freedom"],
    "health":       ["health influencer", "wellness coach", "mental health creator", "yoga instructor"],
    "entertainment":["comedy creator", "entertainment youtuber", "funny videos", "meme creator"],
    "music":        ["music creator", "singer songwriter", "music influencer", "cover songs"],
    "sports":       ["sports influencer", "athlete creator", "sports motivation", "cricket influencer"],
    "automotive":   ["car reviewer", "auto influencer", "car vlogger", "automobile enthusiast"],
    "home":         ["home decor blogger", "interior design", "home improvement", "diy creator"],
}

PLATFORM_SITE_MAP: Dict[str, str] = {
    "instagram": "instagram.com",
    "youtube":   "youtube.com",
    "tiktok":    "tiktok.com",
    "twitter":   "twitter.com",
    "linkedin":  "linkedin.com",
}

INDIA_REGIONS = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "India"]

TIER_FOLLOWER_RANGES = {
    "nano":   (1_000,    10_000),
    "micro":  (10_000,   100_000),
    "mid":    (100_000,  500_000),
    "macro":  (500_000,  1_000_000),
    "mega":   (1_000_000, float("inf")),
}


# ─────────────────────────────────────────────
# Main Discovery Service
# ─────────────────────────────────────────────
class InternetDiscoveryService:
    """
    Discovers real creators from the internet for a given campaign.
    Uses YouTube API + Serper.dev + local scoring + optional Gemini.
    """

    def discover(self, campaign: Dict, region: Optional[str] = None, count: int = MAX_CREATORS) -> List[Dict]:
        """
        Main entry point. Returns list of scored creator dicts.

        campaign = {
          id, title, category, platform, budget,
          target_audience: { min_followers, max_followers, location, ... }
        }
        """
        logger.info(f"[Discovery] Starting internet search for campaign: {campaign.get('title', 'Unknown')}")

        category  = (campaign.get("category") or "lifestyle").lower()
        platform  = (campaign.get("platform") or "instagram").lower()
        budget    = float(campaign.get("budget") or 0)
        target    = campaign.get("target_audience") or {}
        region    = region or target.get("location") or "India"

        keywords  = self._get_keywords(category)
        all_creators: List[Dict] = []

        # ── Source 1: YouTube (FREE) ──────────────────────────────────
        if YOUTUBE_API_KEY:
            try:
                yt_creators = self._search_youtube(keywords, platform, region, max_results=50)
                all_creators.extend(yt_creators)
                logger.info(f"[Discovery] YouTube: {len(yt_creators)} channels found")
            except Exception as e:
                logger.warning(f"[Discovery] YouTube search failed: {e}")
        else:
            logger.warning("[Discovery] YOUTUBE_API_KEY not set — skipping YouTube search")

        # ── Source 2: Serper / Google SERP (~$0.003/campaign) ──────────
        if SERPER_API_KEY:
            try:
                serper_creators = self._search_serper(keywords, platform, region, max_results=60)
                all_creators.extend(serper_creators)
                logger.info(f"[Discovery] Serper: {len(serper_creators)} creators found")
            except Exception as e:
                logger.warning(f"[Discovery] Serper search failed: {e}")
        else:
            logger.warning("[Discovery] SERPER_API_KEY not set — skipping Google SERP search")

        # ── Fallback: Disabled (no longer returning dummy/seed data) ──────────
        if not all_creators:
            logger.warning("[Discovery] No external sources returned any data. Returning empty list.")

        # ── Deduplicate by handle ─────────────────────────────────────
        seen_handles = set()
        unique_creators = []
        for c in all_creators:
            handle = (c.get("handle") or "").lower().strip("@ ")
            if handle and handle not in seen_handles:
                seen_handles.add(handle)
                unique_creators.append(c)

        # ── Score & rank ──────────────────────────────────────────────
        scored = self._score_and_rank(unique_creators, campaign, region)

        # ── Limit to requested count ──────────────────────────────────
        top_creators = scored[:count]

        # ── Optional: Gemini AI summaries for top 10 only ─────────────
        if GEMINI_API_KEY and top_creators:
            try:
                top_creators = self._add_gemini_summaries(top_creators[:GEMINI_TOP_N], campaign) + top_creators[GEMINI_TOP_N:]
            except Exception as e:
                logger.warning(f"[Discovery] Gemini summary failed (non-critical): {e}")

        # ── Assign final ranks ────────────────────────────────────────
        for i, c in enumerate(top_creators):
            c["rank"] = i + 1

        logger.info(f"[Discovery] Final: {len(top_creators)} creators ready for campaign {campaign.get('id')}")
        return top_creators

    # ─────────────────────────────────────────────
    # YouTube Data API v3 Search
    # ─────────────────────────────────────────────
    def _search_youtube(self, keywords: List[str], platform: str, region: str, max_results: int = 50) -> List[Dict]:
        """
        Search YouTube channels by niche keywords.
        Uses search.list (100 units/call) + channels.list (1 unit/call).
        Stays within free quota.
        """
        results: List[Dict] = []
        channel_ids: List[str] = []

        # Determine YouTube region code
        region_code = "IN"
        if region and region.lower() != "india":
            if "united states" in region.lower() or "us" == region.lower():
                region_code = "US"
            elif "united kingdom" in region.lower() or "uk" == region.lower():
                region_code = "GB"
            elif "canada" in region.lower() or "ca" == region.lower():
                region_code = "CA"
            elif "australia" in region.lower() or "au" == region.lower():
                region_code = "AU"
            elif len(region) == 2:
                region_code = region.upper()

        # 2 search queries × up to 25 results each = ~50 channels
        search_queries = keywords[:2]

        for query in search_queries:
            query_str = query
            if region and region.lower() not in ["india", "global"]:
                query_str = f"{query} {region}"

            try:
                params = {
                    "key":        YOUTUBE_API_KEY,
                    "part":       "snippet",
                    "type":       "channel",
                    "q":          query_str,
                    "maxResults": min(25, max_results // len(search_queries)),
                    "regionCode": region_code,
                    "relevanceLanguage": "en",
                }
                resp = requests.get(YOUTUBE_SEARCH_URL, params=params, timeout=15)
                resp.raise_for_status()
                data = resp.json()

                for item in data.get("items", []):
                    cid = item.get("id", {}).get("channelId")
                    if cid:
                        channel_ids.append(cid)

                time.sleep(0.3)  # Gentle rate limiting

            except Exception as e:
                logger.error(f"[YouTube] search.list error for '{query}': {e}")

        if not channel_ids:
            return []

        # Batch-fetch channel statistics (1 unit per call, 50 per batch)
        for i in range(0, len(channel_ids), 50):
            batch = channel_ids[i:i+50]
            try:
                params = {
                    "key":        YOUTUBE_API_KEY,
                    "part":       "snippet,statistics,brandingSettings",
                    "id":         ",".join(batch),
                }
                resp = requests.get(YOUTUBE_CHANNEL_URL, params=params, timeout=15)
                resp.raise_for_status()
                data = resp.json()

                for item in data.get("items", []):
                    creator = self._parse_youtube_channel(item)
                    if creator:
                        results.append(creator)

            except Exception as e:
                logger.error(f"[YouTube] channels.list error: {e}")

        return results[:max_results]

    def _parse_youtube_channel(self, item: Dict) -> Optional[Dict]:
        """Convert YouTube API channel item to our creator format."""
        try:
            snippet     = item.get("snippet", {})
            stats       = item.get("statistics", {})
            branding    = item.get("brandingSettings", {}).get("channel", {})

            channel_id  = item.get("id", "")
            title       = snippet.get("title", "")
            description = snippet.get("description", "")
            handle      = branding.get("customUrl", f"@{channel_id[:12]}").lstrip("@")
            subscribers = int(stats.get("subscriberCount", 0))
            view_count  = int(stats.get("viewCount", 0))
            video_count = int(stats.get("videoCount", 1))

            if subscribers < 1000:  # Filter tiny channels
                return None

            # Estimate engagement: avg views per video / subscribers
            avg_views      = view_count / max(video_count, 1)
            engagement_rate = min(round((avg_views / max(subscribers, 1)) * 100, 2), 50.0)

            country = snippet.get("country", "IN")
            region  = "India" if country == "IN" else country

            # Infer categories from description
            categories = self._extract_categories(description + " " + title)

            return {
                "name":            title,
                "handle":          handle or channel_id,
                "platform":        "youtube",
                "profile_url":     f"https://youtube.com/channel/{channel_id}",
                "avatar_url":      snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                "followers_count": subscribers,
                "engagement_rate": engagement_rate,
                "region":          region,
                "categories":      categories,
                "content_style":   description[:200] if description else "",
                "audience_summary": f"{subscribers:,} subscribers | {video_count} videos",
                "source":          "youtube_api",
                "raw_subscribers": subscribers,
            }
        except Exception as e:
            logger.debug(f"[YouTube] parse error: {e}")
            return None

    # ─────────────────────────────────────────────
    # Serper.dev Google SERP Search
    # ─────────────────────────────────────────────
    def _search_serper(self, keywords: List[str], platform: str, region: str, max_results: int = 60) -> List[Dict]:
        """
        Search Google SERP via Serper.dev for social media creators.
        3 targeted queries cover different niches and regions.
        Cost: ~$0.003 per campaign (3 searches × $0.001).
        """
        results: List[Dict] = []
        site = PLATFORM_SITE_MAP.get(platform, "instagram.com")
        region_keyword = region if region != "India" else "India"

        # Build 3 targeted search queries
        queries = self._build_serper_queries(keywords, site, region_keyword)

        for query in queries[:3]:  # Max 3 queries = 3 credits
            try:
                headers = {
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json",
                }
                payload = {
                    "q": query,
                    "num": 20,  # 20 results per query
                    "gl": "in",  # India geolocation
                    "hl": "en",
                }
                resp = requests.post(SERPER_SEARCH_URL, headers=headers, json=payload, timeout=15)
                resp.raise_for_status()
                data = resp.json()

                for organic in data.get("organic", []):
                    creator = self._parse_serper_result(organic, platform, region_keyword)
                    if creator:
                        results.append(creator)

                time.sleep(0.2)

            except Exception as e:
                logger.error(f"[Serper] search error for '{query}': {e}")

        return results[:max_results]

    def _build_serper_queries(self, keywords: List[str], site: str, region: str) -> List[str]:
        """Build targeted Google search queries for influencer discovery without operators (to support free Serper accounts)."""
        kw1 = keywords[0] if keywords else "influencer"
        kw2 = keywords[1] if len(keywords) > 1 else kw1

        queries = [
            f'{site} {kw1} {region} influencer',
            f'{site} {kw2} content creator followers',
            f'{kw1} influencer {region} instagram youtube',
        ]
        return queries

    def _parse_serper_result(self, item: Dict, platform: str, region: str) -> Optional[Dict]:
        """Parse a Google SERP result into our creator format."""
        try:
            url     = item.get("link", "")
            title   = item.get("title", "")
            snippet = item.get("snippet", "")

            # Extract handle from URL
            handle = self._extract_handle_from_url(url, platform)
            if not handle:
                # Try to extract from title
                handle = self._extract_handle_from_text(title)
            if not handle:
                return None

            # Extract name from title
            name = self._clean_name_from_title(title, platform)
            if not name:
                return None

            # Estimate followers from snippet text
            followers = self._extract_followers_from_text(snippet + " " + title)

            # Infer categories from content
            categories = self._extract_categories(snippet + " " + title)

            # Determine platform from URL
            detected_platform = self._detect_platform_from_url(url) or platform

            profile_url = url if any(s in url for s in ["instagram.com/", "youtube.com/", "tiktok.com/"]) else ""

            return {
                "name":            name,
                "handle":          handle,
                "platform":        detected_platform,
                "profile_url":     profile_url,
                "avatar_url":      "",
                "followers_count": followers,
                "engagement_rate": self._estimate_engagement_rate(followers),
                "region":          region,
                "categories":      categories,
                "content_style":   snippet[:200] if snippet else "",
                "audience_summary": snippet[:150] if snippet else "",
                "source":          "google_serp",
                "raw_snippet":     snippet,
            }
        except Exception as e:
            logger.debug(f"[Serper] parse error: {e}")
            return None

    # ─────────────────────────────────────────────
    # Local Heuristic Scoring
    # ─────────────────────────────────────────────
    def _score_and_rank(self, creators: List[Dict], campaign: Dict, region: str) -> List[Dict]:
        """
        Score each creator against the campaign using local heuristics.
        No API calls — completely free.

        Scoring breakdown (0–100):
          - Category/niche match:   35 pts
          - Follower tier fit:      25 pts
          - Engagement rate:        20 pts
          - Platform match:         15 pts
          - Region bonus:            5 pts
        """
        category = (campaign.get("category") or "").lower()
        platform = (campaign.get("platform") or "").lower()
        budget   = float(campaign.get("budget") or 0)

        # Determine target follower range from budget
        if budget > 500_000:
            target_tier = "mega"
        elif budget > 100_000:
            target_tier = "macro"
        elif budget > 20_000:
            target_tier = "mid"
        elif budget > 5_000:
            target_tier = "micro"
        else:
            target_tier = "nano"

        target_min, target_max = TIER_FOLLOWER_RANGES.get(target_tier, (10_000, 500_000))

        niche_keywords = set(kw.lower() for kw in self._get_keywords(category))

        for creator in creators:
            score = 0.0

            # ── 1. Category / niche match (35 pts) ──────────
            creator_cats = set(c.lower() for c in (creator.get("categories") or []))
            creator_text = (
                " ".join(creator_cats) + " " +
                creator.get("content_style", "") + " " +
                creator.get("name", "")
            ).lower()

            cat_match = 0
            if category in creator_text:
                cat_match += 25
            keyword_hits = sum(1 for kw in niche_keywords if kw in creator_text)
            cat_match += min(10, keyword_hits * 3)
            score += cat_match

            # ── 2. Follower tier fit (25 pts) ───────────────
            followers = int(creator.get("followers_count") or 0)
            if followers <= 0:
                followers_score = 5  # Unknown, give benefit of doubt
            elif target_min <= followers <= target_max:
                followers_score = 25  # Perfect fit
            elif followers < target_min:
                ratio = followers / max(target_min, 1)
                followers_score = max(5, int(25 * ratio))
            else:
                ratio = target_max / max(followers, 1)
                followers_score = max(8, int(25 * ratio))
            score += followers_score

            # ── 3. Engagement rate quality (20 pts) ─────────
            eng = float(creator.get("engagement_rate") or 0)
            if eng >= 6.0:
                engagement_score = 20
            elif eng >= 3.0:
                engagement_score = 15
            elif eng >= 1.0:
                engagement_score = 10
            else:
                engagement_score = 5
            score += engagement_score

            # ── 4. Platform match (15 pts) ───────────────────
            if (creator.get("platform") or "").lower() == platform:
                score += 15
            else:
                score += 5  # Cross-platform still has value

            # ── 5. Region bonus (5 pts) ──────────────────────
            creator_region = (creator.get("region") or "").lower()
            campaign_region = region.lower()
            if campaign_region in creator_region or creator_region in campaign_region:
                score += 5
            elif "india" in creator_region:
                score += 3

            # ── 6. Size/Budget Mismatch Penalty ──────────────
            if followers > target_max * 3:
                score -= 35.0

            creator["match_score"] = round(min(100.0, max(0.0, score)), 1)

        # Sort by match_score descending
        creators.sort(key=lambda c: float(c.get("match_score", 0)), reverse=True)
        return creators

    # ─────────────────────────────────────────────
    # Gemini AI Summaries (top 10 only, batched)
    # ─────────────────────────────────────────────
    def _add_gemini_summaries(self, creators: List[Dict], campaign: Dict) -> List[Dict]:
        """
        Generate AI summaries for the top N creators in a SINGLE Gemini call.
        Extremely token-efficient — entire batch in one request.
        """
        if not GEMINI_API_KEY or not creators:
            return creators

        # Build compact representation for each creator
        creator_list_text = "\n".join([
            f"{i+1}. {c.get('name')} (@{c.get('handle')}) | {c.get('platform')} | "
            f"{c.get('followers_count', 0):,} followers | {c.get('engagement_rate', 0)}% engagement | "
            f"Categories: {', '.join(c.get('categories', [])[:3])} | Region: {c.get('region', '')}"
            for i, c in enumerate(creators)
        ])

        campaign_context = (
            f"Campaign: {campaign.get('title')} | "
            f"Category: {campaign.get('category')} | "
            f"Platform: {campaign.get('platform')} | "
            f"Budget: ₹{campaign.get('budget', 0):,}"
        )

        prompt = f"""You are an influencer marketing analyst. Given this campaign and creator list, write a 1-2 sentence professional summary for each creator explaining why they are or aren't a good fit.

{campaign_context}

Creators:
{creator_list_text}

Return ONLY a JSON array with this exact format, no markdown:
[{{"index": 1, "summary": "...", "strengths": ["...", "..."], "concerns": ["..."]}}]

Keep each summary under 80 words. Be specific and data-driven."""

        try:
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1500},
            }
            url = f"{GEMINI_URL}?key={GEMINI_API_KEY}"
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()

            raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]

            # Clean potential markdown code fences
            raw_text = re.sub(r"```json|```", "", raw_text).strip()
            summaries = json.loads(raw_text)

            # Map summaries back to creators
            summary_map = {s["index"]: s for s in summaries if isinstance(s, dict)}
            for i, creator in enumerate(creators):
                s = summary_map.get(i + 1, {})
                if s:
                    creator["ai_summary"]  = s.get("summary", "")
                    creator["strengths"]   = s.get("strengths", [])
                    creator["concerns"]    = s.get("concerns", [])

        except Exception as e:
            logger.warning(f"[Gemini] Batch summary failed: {e}")

        return creators

    # ─────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────
    def _get_keywords(self, category: str) -> List[str]:
        """Get search keywords for a niche category."""
        # Try exact match first
        for key, kws in NICHE_KEYWORDS.items():
            if key in category or category in key:
                return kws
        # Fallback to general lifestyle
        return NICHE_KEYWORDS.get("lifestyle", [category + " creator", category + " influencer"])

    def _extract_handle_from_url(self, url: str, platform: str) -> str:
        """Extract @handle from a social media URL."""
        patterns = {
            "instagram": r"instagram\.com/([^/?#\s]+)",
            "youtube":   r"youtube\.com/(?:c/|channel/|user/|@)?([^/?#\s]+)",
            "tiktok":    r"tiktok\.com/@([^/?#\s]+)",
            "twitter":   r"twitter\.com/([^/?#\s]+)",
        }
        for plat, pattern in patterns.items():
            match = re.search(pattern, url)
            if match:
                handle = match.group(1).strip("/")
                # Filter out generic YouTube paths
                if handle.lower() not in ["channel", "user", "c", "watch", "shorts", "featured", "videos", "community"]:
                    return handle
        return ""

    def _extract_handle_from_text(self, text: str) -> str:
        """Extract @handle from title text."""
        match = re.search(r"@([\w.]+)", text)
        return match.group(1) if match else ""

    def _clean_name_from_title(self, title: str, platform: str) -> str:
        """Clean a creator name from page title."""
        # Remove common suffixes
        for suffix in [" - YouTube", " (@", "| Instagram", "• Instagram", " | TikTok", " on Instagram"]:
            idx = title.find(suffix)
            if idx > 0:
                title = title[:idx]

        name = title.strip()
        # Filter out generic page titles
        skip_words = ["youtube", "instagram", "tiktok", "twitter", "facebook", "login", "sign in", "home", "explore"]
        if any(w in name.lower() for w in skip_words):
            return ""
        if len(name) < 2 or len(name) > 60:
            return ""
        return name

    def _extract_followers_from_text(self, text: str) -> int:
        """Parse follower count from text snippets like '125K followers' or '1.2M subscribers'."""
        patterns = [
            r"([\d,.]+)\s*[KkMm]?\s*(?:followers|subscribers|subs|fans)",
            r"(\d+(?:\.\d+)?)\s*[Mm]\s+(?:followers|subscribers)",
            r"(\d+(?:\.\d+)?)\s*[Kk]\s+(?:followers|subscribers)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                num_str = match.group(1).replace(",", "").replace(".", "")
                num = float(match.group(1).replace(",", ""))
                if "m" in match.group(0).lower() and num < 1000:
                    return int(num * 1_000_000)
                elif "k" in match.group(0).lower() and num < 10_000:
                    return int(num * 1_000)
                return int(num)
        # Default: random micro-influencer range
        return 25_000

    def _estimate_engagement_rate(self, followers: int) -> float:
        """Estimate engagement rate based on follower count (industry benchmarks)."""
        if followers < 10_000:
            return 8.0   # Nano: 7-12%
        elif followers < 100_000:
            return 5.5   # Micro: 4-7%
        elif followers < 500_000:
            return 3.0   # Mid: 2-4%
        elif followers < 1_000_000:
            return 2.0   # Macro: 1.5-2.5%
        else:
            return 1.2   # Mega: 1-1.5%

    def _extract_categories(self, text: str) -> List[str]:
        """Infer content categories from bio/description text."""
        text_lower = text.lower()
        found = []
        category_keywords = {
            "fashion":      ["fashion", "style", "ootd", "outfit", "clothing", "wear"],
            "beauty":       ["beauty", "makeup", "skincare", "cosmetics", "glam"],
            "fitness":      ["fitness", "gym", "workout", "exercise", "health", "yoga"],
            "food":         ["food", "recipe", "cooking", "chef", "cuisine", "eat"],
            "travel":       ["travel", "trip", "wanderlust", "explore", "adventure"],
            "tech":         ["tech", "technology", "gadget", "review", "software", "app"],
            "gaming":       ["gaming", "game", "gamer", "esports", "twitch", "stream"],
            "lifestyle":    ["lifestyle", "life", "daily", "vlog", "routine"],
            "education":    ["education", "learn", "study", "tutor", "tips", "knowledge"],
            "business":     ["business", "entrepreneur", "startup", "marketing", "finance"],
            "entertainment":["entertainment", "comedy", "funny", "humor", "meme"],
            "music":        ["music", "song", "singer", "artist", "musician", "cover"],
            "sports":       ["sports", "cricket", "football", "athlete", "player"],
            "parenting":    ["parenting", "mom", "dad", "family", "children", "baby"],
        }
        for cat, words in category_keywords.items():
            if any(w in text_lower for w in words):
                found.append(cat)
        return found[:4] if found else ["lifestyle"]

    def _detect_platform_from_url(self, url: str) -> Optional[str]:
        """Detect social platform from URL."""
        url_lower = url.lower()
        for platform, domain in PLATFORM_SITE_MAP.items():
            if domain in url_lower:
                return platform
        return None

    # ─────────────────────────────────────────────
    # Seed Data Fallback (when no API keys set)
    # ─────────────────────────────────────────────
    def _seed_creators(self, category: str, platform: str, region: str) -> List[Dict]:
        """
        Provides category-based seed creators when no API keys are configured.
        These are representative archetypes, NOT real people.
        Used only as last resort.
        """
        logger.warning("[Discovery] Using seed fallback — configure YOUTUBE_API_KEY and SERPER_API_KEY for real data")

        seeds_per_tier = [
            ("nano",  2_000,   9_000),
            ("micro", 15_000,  95_000),
            ("mid",   120_000, 450_000),
            ("macro", 550_000, 900_000),
            ("mega",  1_200_000, 5_000_000),
        ]

        creators = []
        kws = self._get_keywords(category)
        for i, (tier_name, f_min, f_max) in enumerate(seeds_per_tier):
            for j in range(4):
                idx = (i * 4) + j
                followers = f_min + int((f_max - f_min) * (j / 4))
                handle = f"{category.replace(' ', '_')}creator{idx+1}"
                creators.append({
                    "name":            f"{category.title()} Creator {idx+1}",
                    "handle":          handle,
                    "platform":        platform,
                    "profile_url":     f"https://{PLATFORM_SITE_MAP.get(platform, 'instagram.com')}/{handle}",
                    "avatar_url":      "",
                    "followers_count": followers,
                    "engagement_rate": self._estimate_engagement_rate(followers),
                    "region":          region,
                    "categories":      [category, "lifestyle"],
                    "content_style":   f"Content creator focused on {category}",
                    "audience_summary": f"{followers:,} followers | {tier_name} tier creator",
                    "ai_summary":      f"A {tier_name}-tier {category} creator with an engaged audience in {region}.",
                    "strengths":       [f"Strong {category} content", "Engaged community"],
                    "concerns":        ["Profile not independently verified"],
                    "source":          "seed_data",
                })
        return creators


# ─────────────────────────────────────────────
# Module-level singleton
# ─────────────────────────────────────────────
_discovery_service: Optional[InternetDiscoveryService] = None


def get_discovery_service() -> InternetDiscoveryService:
    global _discovery_service
    if _discovery_service is None:
        _discovery_service = InternetDiscoveryService()
    return _discovery_service


# ─────────────────────────────────────────────
# CLI test
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    test_campaign = {
        "id":       "test-001",
        "title":    "Fitness Supplement Launch India",
        "category": "fitness",
        "platform": "instagram",
        "budget":   50000,
        "target_audience": {"location": "India", "min_followers": 10000},
    }

    print(f"\n🔍 Testing Internet Creator Discovery")
    print(f"Campaign: {test_campaign['title']}")
    print(f"YouTube API: {'✅ Set' if YOUTUBE_API_KEY else '❌ Not set'}")
    print(f"Serper API:  {'✅ Set' if SERPER_API_KEY else '❌ Not set'}")
    print(f"Gemini API:  {'✅ Set' if GEMINI_API_KEY else '❌ Not set'}")
    print()

    service = get_discovery_service()
    creators = service.discover(test_campaign, region="India", count=20)

    print(f"\n✅ Found {len(creators)} creators:\n")
    for c in creators[:10]:
        print(f"  #{c['rank']} {c['name']} (@{c['handle']}) | {c['platform']} | "
              f"{c['followers_count']:,} followers | {c['engagement_rate']}% eng | "
              f"Score: {c['match_score']}% | Source: {c.get('source', 'unknown')}")

    if "--json" in sys.argv:
        print("\n--- Full JSON ---")
        print(json.dumps(creators, indent=2))
