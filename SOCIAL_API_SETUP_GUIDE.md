# 🚀 Social Media API Integration - Setup Guide

## Quick Start

### 1. Update Environment Variables

Copy the new OAuth variables to your `.env` file:

```bash
# ============================================================================
# SOCIAL MEDIA OAUTH CONFIGURATION
# ============================================================================

# Instagram (Meta)
INSTAGRAM_CLIENT_ID=your_instagram_app_id
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/v1/oauth/instagram/callback

# YouTube (Google)
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/v1/oauth/youtube/callback

# TikTok
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/v1/oauth/tiktok/callback

# Token Encryption (generate with: openssl rand -base64 32)
TOKEN_ENCRYPTION_KEY=your-32-character-encryption-key
```

### 2. Run Database Migration

```bash
cd backend
# Run the new migration
node run-migration.js 005_social_media_api_integration.sql
```

### 3. Install Dependencies

The implementation uses `axios` which should already be installed. If not:

```bash
cd backend
npm install axios
```

### 4. Start the Backend

```bash
cd backend
npm run start:dev
```

---

## 📋 Files Created

### Backend

| File | Description |
|------|-------------|
| `src/social/oauth/oauth.controller.ts` | OAuth endpoints for all platforms |
| `src/social/oauth/oauth.module.ts` | OAuth module configuration |
| `src/social/oauth/oauth-state.service.ts` | CSRF state management |
| `src/social/oauth/instagram-oauth.service.ts` | Instagram OAuth flow |
| `src/social/oauth/youtube-oauth.service.ts` | YouTube OAuth flow |
| `src/social/oauth/tiktok-oauth.service.ts` | TikTok OAuth flow |
| `src/social/platforms/platform-api.interface.ts` | Common interface for platform APIs |
| `src/social/platforms/instagram-api.service.ts` | Instagram Graph API client |
| `src/social/platforms/youtube-api.service.ts` | YouTube Data API client |
| `src/social/platforms/tiktok-api.service.ts` | TikTok API client |
| `src/social/sync/metrics-sync.service.ts` | Unified metrics sync service |
| `src/social/sync/metrics-normalizer.service.ts` | Metrics normalization logic |
| `src/social/sync/metrics-sync.processor.ts` | Bull queue job processor |
| `src/social/security/token-encryption.service.ts` | Token encryption (AES-256-GCM) |
| `src/social/entities/metrics-history.entity.ts` | Metrics history entity |
| `migrations/005_social_media_api_integration.sql` | Database migration |

### Frontend

| File | Description |
|------|-------------|
| `src/api/social.ts` | Updated API client with OAuth endpoints |
| `src/pages/Creator/SocialConnect.tsx` | Updated with OAuth flow UI |
| `src/store/slices/socialSlice.ts` | Updated with sync actions |

### Documentation

| File | Description |
|------|-------------|
| `SOCIAL_MEDIA_API_INTEGRATION.md` | Complete architecture document |
| `SOCIAL_API_SETUP_GUIDE.md` | This setup guide |

---

## 🔌 API Endpoints

### OAuth Endpoints

```
GET  /v1/oauth/instagram/auth     - Get Instagram OAuth URL
GET  /v1/oauth/instagram/callback - Handle Instagram callback
GET  /v1/oauth/youtube/auth       - Get YouTube OAuth URL
GET  /v1/oauth/youtube/callback   - Handle YouTube callback
GET  /v1/oauth/tiktok/auth        - Get TikTok OAuth URL
GET  /v1/oauth/tiktok/callback    - Handle TikTok callback
POST /v1/oauth/:platform/refresh  - Refresh access token
POST /v1/oauth/:platform/revoke   - Revoke and disconnect
```

### Sync Endpoints

```
POST /v1/social/sync/:platform    - Sync metrics for one platform
POST /v1/social/sync/all          - Sync all platforms
GET  /v1/social/aggregated-stats  - Get aggregated stats
GET  /v1/social/metrics/history   - Get historical metrics
```

---

## 🔐 Platform Setup Guides

### Instagram (Meta)

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new App → Select "Consumer" type
3. Add product: "Instagram Graph API"
4. Go to Settings → Basic, get App ID and App Secret
5. Add OAuth Redirect URI: `http://localhost:3000/v1/oauth/instagram/callback`
6. Request permissions: `instagram_basic`, `instagram_manage_insights`

### YouTube (Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable APIs: "YouTube Data API v3", "YouTube Analytics API"
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Add Redirect URI: `http://localhost:3000/v1/oauth/youtube/callback`
6. Configure OAuth consent screen

### TikTok

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new App
3. Request scopes: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`
4. Add Callback URL: `http://localhost:3000/v1/oauth/tiktok/callback`
5. Submit for review

---

## 🧪 Testing the Integration

### 1. Test OAuth Flow

```bash
# Get OAuth URL (requires auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/v1/oauth/instagram/auth

# Response: { "authUrl": "https://api.instagram.com/oauth/authorize?...", "state": "..." }
```

### 2. Test Metrics Sync

```bash
# Sync single platform
curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/v1/social/sync/instagram

# Sync all platforms
curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/v1/social/sync/all
```

### 3. Get Aggregated Stats

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/v1/social/aggregated-stats
```

---

## 📊 Normalized Metrics Schema

All platforms' metrics are normalized to this format:

```typescript
{
  platform: 'instagram' | 'youtube' | 'tiktok' | 'twitter',
  followers_count: number,
  engagement_rate: number,        // Percentage
  avg_likes_per_post: number,
  avg_comments_per_post: number,
  avg_views_per_post: number,
  total_impressions: number,
  total_reach: number,
  quality_score: number,          // 0-100 calculated score
  last_synced_at: Date,
  data_freshness: 'fresh' | 'stale' | 'expired'
}
```

---

## ⚙️ Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_SYNC_INTERVAL_HOURS` | 6 | Hours between automatic syncs |
| `METRICS_HISTORY_RETENTION_DAYS` | 90 | Days to keep historical data |
| `TOKEN_ENCRYPTION_KEY` | - | AES-256 encryption key (required) |

---

## 🔄 Background Sync (Optional)

To enable automatic periodic sync, add to your app:

```typescript
// In a scheduler service or cron job
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { METRICS_SYNC_QUEUE } from './sync/metrics-sync.processor';

@Injectable()
export class SyncScheduler {
  constructor(@InjectQueue(METRICS_SYNC_QUEUE) private syncQueue: Queue) {}

  // Run every 6 hours
  @Cron('0 */6 * * *')
  async scheduleSyncStale() {
    await this.syncQueue.add('sync-stale', { hoursThreshold: 6 });
  }
}
```

---

## 🐛 Troubleshooting

### "Instagram OAuth not configured"
- Check that `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET` are set in `.env`

### "Invalid state" error
- State expired (10 min timeout) - try connecting again
- Clear browser cookies and retry

### Token refresh failing
- Token may have been revoked by user
- Need to reconnect the account

### Rate limiting
- Instagram: 200 requests/hour per user
- YouTube: 10,000 units/day
- TikTok: 1,000 requests/day

---

## 📈 Next Steps

1. **Add Twitter/X support** - Similar OAuth flow
2. **Implement webhooks** - Real-time updates when possible
3. **Add rate limiting** - Prevent API abuse
4. **Dashboard analytics** - Historical charts and trends
5. **Scheduled reports** - Weekly/monthly email reports

---

*Generated: January 18, 2026*
