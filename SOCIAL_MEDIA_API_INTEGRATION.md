# 🔗 Social Media API Integration - Complete Architecture

## 📋 Overview

This document outlines the complete architecture and implementation plan for integrating **Instagram Graph API**, **YouTube Data API**, and **TikTok API** into the Influencia platform. This enables creators to connect their social accounts and automatically sync metrics for AI-powered campaign matching.

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    SocialConnect.tsx                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │    │
│  │  │  Instagram   │  │   YouTube    │  │   TikTok     │  │   Twitter    │  │    │
│  │  │   Connect    │  │   Connect    │  │   Connect    │  │   Connect    │  │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │    │
│  └─────────│──────────────────│──────────────────│──────────────────│──────┘    │
│            │ OAuth Popup      │                  │                  │            │
└────────────│──────────────────│──────────────────│──────────────────│────────────┘
             │                  │                  │                  │
             ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (NestJS)                                        │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                      OAuth Controller                                       │ │
│  │  /oauth/instagram/auth    /oauth/youtube/auth    /oauth/tiktok/auth        │ │
│  │  /oauth/instagram/callback /oauth/youtube/callback /oauth/tiktok/callback  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                           │
│                                      ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                     OAuth Services Layer                                    │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │ │
│  │  │ InstagramOAuth  │ │  YouTubeOAuth   │ │  TikTokOAuth    │               │ │
│  │  │   Service       │ │   Service       │ │   Service       │               │ │
│  │  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘               │ │
│  └───────────│───────────────────│───────────────────│────────────────────────┘ │
│              │                   │                   │                           │
│              ▼                   ▼                   ▼                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                  Platform API Services                                      │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │ │
│  │  │ InstagramAPI    │ │  YouTubeAPI     │ │  TikTokAPI      │               │ │
│  │  │   Service       │ │   Service       │ │   Service       │               │ │
│  │  │  - getProfile   │ │  - getChannel   │ │  - getProfile   │               │ │
│  │  │  - getInsights  │ │  - getStats     │ │  - getVideos    │               │ │
│  │  │  - getMedia     │ │  - getVideos    │ │  - getAnalytics │               │ │
│  │  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘               │ │
│  └───────────│───────────────────│───────────────────│────────────────────────┘ │
│              │                   │                   │                           │
│              └───────────────────┼───────────────────┘                           │
│                                  ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │               Unified Social Metrics Service                               │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  - syncAllPlatforms()    - normalizeMetrics()                        │ │ │
│  │  │  - refreshTokens()       - calculateEngagement()                     │ │ │
│  │  │  - aggregateStats()      - scheduleSync()                            │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                  │                                               │
│                                  ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                    Token Encryption Service                                 │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  - encryptToken()         - decryptToken()                           │ │ │
│  │  │  - rotateEncryptionKey()  - secureStore()                            │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                  │                                               │
└──────────────────────────────────│───────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE (PostgreSQL)                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                      social_accounts Table                                  │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  id | creator_id | platform | username | encrypted_access_token |    │ │ │
│  │  │  encrypted_refresh_token | token_expires_at | followers_count |      │ │ │
│  │  │  engagement_rate | metrics (JSONB) | last_synced_at | ...            │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                    social_metrics_history Table                            │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  id | social_account_id | followers | engagement | impressions |     │ │ │
│  │  │  reach | recorded_at                                                  │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    BACKGROUND JOBS (Bull Queue + Redis)                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────────────────┐ ┌─────────────────────┐ ┌────────────────────┐   │ │
│  │  │  Metrics Sync Job   │ │ Token Refresh Job   │ │ Analytics Job      │   │ │
│  │  │  (Every 6 hours)    │ │ (Before expiry)     │ │ (Daily)            │   │ │
│  │  └─────────────────────┘ └─────────────────────┘ └────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 OAuth Flow Diagram

```
┌──────────┐                  ┌──────────────┐              ┌───────────────┐
│  Creator │                  │   Influencia │              │ Social Platform│
│ (Browser)│                  │   Backend    │              │ (IG/YT/TikTok)│
└────┬─────┘                  └──────┬───────┘              └───────┬───────┘
     │                               │                              │
     │ 1. Click "Connect Instagram"  │                              │
     │──────────────────────────────>│                              │
     │                               │                              │
     │ 2. Redirect to OAuth URL      │                              │
     │<──────────────────────────────│                              │
     │                               │                              │
     │ 3. Redirect to Instagram      │                              │
     │─────────────────────────────────────────────────────────────>│
     │                               │                              │
     │ 4. User Authorizes App        │                              │
     │<─────────────────────────────────────────────────────────────│
     │                               │                              │
     │ 5. Redirect with Auth Code    │                              │
     │──────────────────────────────>│                              │
     │                               │                              │
     │                               │ 6. Exchange Code for Token   │
     │                               │─────────────────────────────>│
     │                               │                              │
     │                               │ 7. Return Access Token       │
     │                               │<─────────────────────────────│
     │                               │                              │
     │                               │ 8. Fetch User Profile        │
     │                               │─────────────────────────────>│
     │                               │                              │
     │                               │ 9. Return Profile Data       │
     │                               │<─────────────────────────────│
     │                               │                              │
     │                               │ 10. Encrypt & Store Token    │
     │                               │          ↓                   │
     │                               │    [PostgreSQL DB]           │
     │                               │                              │
     │ 11. Success Response          │                              │
     │<──────────────────────────────│                              │
     │                               │                              │
     │ 12. Update UI with Account    │                              │
     │                               │                              │
```

---

## 📊 Data Flow - Metrics Sync

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           METRICS SYNC FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │   Instagram  │     │   YouTube    │     │   TikTok     │     │   Twitter    │
  │   Graph API  │     │   Data API   │     │   API        │     │   API        │
  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │                    │                    │                    │
         │ followers: 125K    │ subscribers: 50K   │ followers: 200K    │ followers: 30K
         │ reach: 500K        │ views: 2M          │ likes: 5M          │ impressions: 100K
         │ engagement: 4.5%   │ engagement: 3.2%   │ engagement: 8.1%   │ engagement: 2.1%
         │                    │                    │                    │
         └────────────────────┴────────────────────┴────────────────────┘
                                        │
                                        ▼
                       ┌────────────────────────────────┐
                       │   Unified Metrics Service      │
                       │   ┌────────────────────────┐   │
                       │   │ NORMALIZE & AGGREGATE  │   │
                       │   │ - Convert to common    │   │
                       │   │   schema               │   │
                       │   │ - Calculate weighted   │   │
                       │   │   engagement           │   │
                       │   │ - Detect anomalies     │   │
                       │   └────────────────────────┘   │
                       └────────────────────────────────┘
                                        │
                                        ▼
                       ┌────────────────────────────────┐
                       │      Normalized Output         │
                       │   {                            │
                       │     total_followers: 405,000   │
                       │     avg_engagement: 4.48%      │
                       │     total_reach: 2,600,000     │
                       │     platforms: 4               │
                       │     primary_platform: 'tiktok' │
                       │     growth_rate: '+5.2%'       │
                       │   }                            │
                       └────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
           ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
           │   Creator      │  │   AI Matching  │  │   Analytics    │
           │   Profile      │  │   Engine       │  │   Dashboard    │
           │   Display      │  │   (ML Model)   │  │   Display      │
           └────────────────┘  └────────────────┘  └────────────────┘
```

---

## 📁 File Structure (New Files)

```
backend/
├── src/
│   └── social/
│       ├── social.module.ts              # Updated - import new services
│       ├── social.controller.ts          # Updated - new endpoints
│       ├── social.service.ts             # Updated - metrics sync
│       │
│       ├── oauth/                         # NEW FOLDER
│       │   ├── oauth.module.ts
│       │   ├── oauth.controller.ts        # OAuth endpoints
│       │   ├── oauth-state.service.ts     # CSRF state management
│       │   ├── instagram-oauth.service.ts # Instagram OAuth
│       │   ├── youtube-oauth.service.ts   # YouTube OAuth
│       │   └── tiktok-oauth.service.ts    # TikTok OAuth
│       │
│       ├── platforms/                     # NEW FOLDER
│       │   ├── instagram-api.service.ts   # Instagram Graph API
│       │   ├── youtube-api.service.ts     # YouTube Data API
│       │   ├── tiktok-api.service.ts      # TikTok API
│       │   └── platform-api.interface.ts  # Common interface
│       │
│       ├── sync/                          # NEW FOLDER
│       │   ├── metrics-sync.service.ts    # Unified metrics sync
│       │   ├── metrics-sync.processor.ts  # Bull queue processor
│       │   └── metrics-normalizer.ts      # Data normalization
│       │
│       ├── security/                      # NEW FOLDER
│       │   └── token-encryption.service.ts # Token encryption
│       │
│       ├── dto/
│       │   ├── connect-social.dto.ts      # Updated
│       │   └── oauth-callback.dto.ts      # NEW
│       │
│       └── entities/
│           ├── social-account.entity.ts   # Updated
│           └── metrics-history.entity.ts  # NEW

frontend/
├── src/
│   ├── api/
│   │   └── social.ts                      # Updated - OAuth endpoints
│   │
│   ├── pages/
│   │   └── Creator/
│   │       └── SocialConnect.tsx          # Updated - OAuth flow
│   │
│   └── components/
│       └── Social/                        # NEW FOLDER
│           ├── OAuthPopup.tsx             # OAuth popup component
│           ├── PlatformCard.tsx           # Platform connection card
│           └── MetricsSyncStatus.tsx      # Sync status display
```

---

## 🔑 API Endpoints

### OAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oauth/:platform/auth` | Get OAuth authorization URL |
| GET | `/oauth/:platform/callback` | Handle OAuth callback |
| POST | `/oauth/:platform/refresh` | Refresh access token |
| DELETE | `/oauth/:platform/revoke` | Revoke platform access |

### Social Metrics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/social/sync/:platform` | Sync metrics for platform |
| POST | `/social/sync/all` | Sync all connected platforms |
| GET | `/social/metrics/:platform` | Get detailed platform metrics |
| GET | `/social/metrics/history` | Get historical metrics |
| GET | `/social/aggregated-stats` | Get aggregated stats across all |

---

## 🔧 Platform-Specific Configuration

### Instagram Graph API (Meta)

```typescript
// Scopes Required
const INSTAGRAM_SCOPES = [
  'instagram_basic',           // Basic profile info
  'instagram_content_publish', // Post content (optional)
  'instagram_manage_insights', // Analytics data
  'pages_show_list',           // Required for business accounts
  'pages_read_engagement',     // Engagement metrics
];

// Available Metrics
const INSTAGRAM_METRICS = {
  account: ['followers_count', 'media_count', 'follows_count'],
  insights: ['impressions', 'reach', 'profile_views', 'website_clicks'],
  media: ['like_count', 'comments_count', 'saved', 'shares', 'plays'],
  audience: ['audience_city', 'audience_country', 'audience_gender_age'],
};
```

### YouTube Data API (Google)

```typescript
// Scopes Required
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',       // Read channel data
  'https://www.googleapis.com/auth/yt-analytics.readonly',  // Analytics access
];

// Available Metrics
const YOUTUBE_METRICS = {
  channel: ['subscriberCount', 'viewCount', 'videoCount', 'hiddenSubscriberCount'],
  analytics: ['views', 'estimatedMinutesWatched', 'averageViewDuration', 'likes', 'shares'],
  demographics: ['ageGroup', 'gender', 'country'],
};
```

### TikTok API

```typescript
// Scopes Required
const TIKTOK_SCOPES = [
  'user.info.basic',      // Basic profile
  'user.info.profile',    // Extended profile
  'user.info.stats',      // Account statistics
  'video.list',           // Video list access
];

// Available Metrics
const TIKTOK_METRICS = {
  profile: ['follower_count', 'following_count', 'likes_count', 'video_count'],
  video: ['view_count', 'like_count', 'comment_count', 'share_count'],
};
```

---

## 📊 Normalized Metrics Schema

```typescript
interface NormalizedSocialMetrics {
  // Account Info
  platform: 'instagram' | 'youtube' | 'tiktok' | 'twitter';
  platform_user_id: string;
  username: string;
  display_name: string;
  profile_picture_url: string;
  account_type: 'creator' | 'business' | 'personal';
  
  // Core Metrics
  followers_count: number;
  following_count: number;
  posts_count: number;
  
  // Engagement Metrics
  engagement_rate: number;          // Calculated: (likes + comments) / followers * 100
  avg_likes_per_post: number;
  avg_comments_per_post: number;
  avg_views_per_post: number;       // For video platforms
  avg_shares_per_post: number;
  
  // Reach Metrics
  total_impressions: number;        // Last 30 days
  total_reach: number;              // Last 30 days
  profile_views: number;            // Last 30 days
  
  // Audience Demographics (if available)
  audience_demographics?: {
    age_ranges: { range: string; percentage: number }[];
    gender: { gender: string; percentage: number }[];
    top_countries: { country: string; percentage: number }[];
    top_cities: { city: string; percentage: number }[];
  };
  
  // Growth Metrics
  follower_growth_rate: number;     // Percentage change last 30 days
  engagement_trend: 'up' | 'stable' | 'down';
  
  // Timestamps
  last_synced_at: Date;
  data_freshness: 'fresh' | 'stale' | 'expired';
}
```

---

## ⚙️ Environment Variables

```env
# Instagram (Meta) OAuth
INSTAGRAM_CLIENT_ID=your_instagram_app_id
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/v1/oauth/instagram/callback

# YouTube (Google) OAuth
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/v1/oauth/youtube/callback

# TikTok OAuth
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/v1/oauth/tiktok/callback

# Twitter (X) OAuth 2.0
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_REDIRECT_URI=http://localhost:3000/v1/oauth/twitter/callback

# Token Encryption
TOKEN_ENCRYPTION_KEY=your-32-character-encryption-key-here

# Metrics Sync Settings
METRICS_SYNC_INTERVAL_HOURS=6
METRICS_HISTORY_RETENTION_DAYS=90

# Rate Limiting per Platform
INSTAGRAM_RATE_LIMIT_PER_HOUR=200
YOUTUBE_RATE_LIMIT_PER_DAY=10000
TIKTOK_RATE_LIMIT_PER_DAY=1000
```

---

## 🚀 Implementation Priority

### Phase 1: Core OAuth & Instagram (Week 1)
1. ✅ Token encryption service
2. ✅ OAuth state management
3. ✅ Instagram OAuth flow
4. ✅ Instagram API service
5. ✅ Basic metrics sync

### Phase 2: YouTube & TikTok (Week 2)
1. ✅ YouTube OAuth flow
2. ✅ YouTube API service
3. ✅ TikTok OAuth flow
4. ✅ TikTok API service

### Phase 3: Unified Metrics & Frontend (Week 3)
1. ✅ Unified metrics normalizer
2. ✅ Metrics history tracking
3. ✅ Frontend OAuth popup
4. ✅ Updated SocialConnect page

### Phase 4: Background Jobs & Polish (Week 4)
1. ✅ Scheduled metrics sync
2. ✅ Token refresh automation
3. ✅ Error handling & retries
4. ✅ Testing & documentation

---

## 🛡️ Security Considerations

1. **Token Encryption**: All OAuth tokens encrypted at rest using AES-256-GCM
2. **State Parameter**: CSRF protection for OAuth flows
3. **Token Refresh**: Automatic refresh before expiry
4. **Secure Storage**: Tokens never logged or exposed in responses
5. **Rate Limiting**: Respect platform rate limits to avoid bans
6. **Scope Minimization**: Only request necessary permissions

---

## 📝 Developer Setup Guide

### 1. Instagram (Meta) Setup
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an App → Select "Consumer" type
3. Add "Instagram Graph API" product
4. Configure OAuth redirect URIs
5. Submit for App Review (for production)

### 2. YouTube (Google) Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "YouTube Data API v3" and "YouTube Analytics API"
4. Create OAuth 2.0 credentials
5. Configure consent screen and scopes

### 3. TikTok Setup
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create an App
3. Request scopes: user.info.basic, user.info.stats
4. Configure OAuth redirect URI
5. Submit for review

---

*Last Updated: January 18, 2026*
*Author: Influencia Development Team*
