# OAuth Integration Guide
## Social Platform Authentication for SafarCollab

This guide provides detailed instructions for implementing OAuth flows for Instagram, YouTube, and TikTok integrations.

---

## Table of Contents
1. [Instagram (Facebook Graph API)](#instagram-integration)
2. [YouTube (Google OAuth)](#youtube-integration)
3. [TikTok (TikTok for Developers)](#tiktok-integration)
4. [Security Best Practices](#security-best-practices)
5. [Error Handling](#error-handling)
6. [Testing](#testing)

---

## Instagram Integration

### Prerequisites
- Facebook Developer Account
- App registered on Facebook Developer Platform
- Instagram Business or Creator Account (required for insights access)

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** as app type
4. Fill in app details:
   - **App Name**: SafarCollab
   - **App Contact Email**: tech@safarcollab.com
5. Add **Instagram Basic Display** and **Instagram Graph API** products

### Step 2: Configure OAuth Settings

**App Dashboard** → **Instagram Basic Display** → **Basic Display Settings**

- **Valid OAuth Redirect URIs**:
  ```
  https://app.safarcollab.com/auth/instagram/callback
  https://app-staging.safarcollab.com/auth/instagram/callback
  http://localhost:3000/auth/instagram/callback
  ```

- **Deauthorize Callback URL**:
  ```
  https://api.safarcollab.com/v1/webhooks/instagram/deauthorize
  ```

- **Data Deletion Request URL**:
  ```
  https://api.safarcollab.com/v1/webhooks/instagram/data-deletion
  ```

### Step 3: Required Permissions (Scopes)

#### For Instagram Basic Display:
- `instagram_graph_user_profile` - Basic profile info
- `instagram_graph_user_media` - Access media

#### For Instagram Business Accounts (Graph API):
- `instagram_basic` - Basic account info
- `instagram_content_publish` - (Optional) Publish content
- `pages_read_engagement` - Read engagement metrics
- `instagram_manage_insights` - **Required for analytics**

### Step 4: Implementation Flow

#### Frontend: Initiate OAuth

```typescript
// React component
import { useState } from 'react';
import axios from 'axios';

export const ConnectInstagram = () => {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Get OAuth URL from backend
      const response = await axios.get('/api/v1/social/instagram/oauth-url', {
        params: {
          redirect_uri: `${window.location.origin}/auth/instagram/callback`
        }
      });
      
      const { oauth_url, state } = response.data;
      
      // Store state in sessionStorage for CSRF verification
      sessionStorage.setItem('instagram_oauth_state', state);
      
      // Redirect to Instagram OAuth
      window.location.href = oauth_url;
    } catch (error) {
      console.error('Failed to initiate Instagram OAuth:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleConnect} disabled={loading}>
      {loading ? 'Connecting...' : 'Connect Instagram'}
    </button>
  );
};
```

#### Backend: Generate OAuth URL

```typescript
// NestJS Controller
import { Controller, Get, Query } from '@nestjs/common';
import { InstagramService } from './instagram.service';

@Controller('social/instagram')
export class InstagramController {
  constructor(private instagramService: InstagramService) {}

  @Get('oauth-url')
  async getOAuthUrl(@Query('redirect_uri') redirectUri: string) {
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state temporarily (Redis with 15 min expiry)
    await this.redis.set(`instagram_oauth_state:${state}`, redirectUri, 'EX', 900);
    
    const oauthUrl = new URL('https://api.instagram.com/oauth/authorize');
    oauthUrl.searchParams.append('client_id', process.env.INSTAGRAM_CLIENT_ID);
    oauthUrl.searchParams.append('redirect_uri', redirectUri);
    oauthUrl.searchParams.append('scope', 'instagram_basic,instagram_manage_insights');
    oauthUrl.searchParams.append('response_type', 'code');
    oauthUrl.searchParams.append('state', state);
    
    return {
      oauth_url: oauthUrl.toString(),
      state
    };
  }
}
```

#### Backend: Exchange Code for Token

```typescript
@Post('exchange-token')
async exchangeToken(
  @Body() body: { code: string; state: string },
  @CurrentUser() user: User
) {
  // Verify state to prevent CSRF
  const storedRedirectUri = await this.redis.get(`instagram_oauth_state:${body.state}`);
  if (!storedRedirectUri) {
    throw new UnauthorizedException('Invalid or expired state');
  }

  // Exchange code for short-lived token
  const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: storedRedirectUri,
    code: body.code
  });

  const { access_token, user_id } = tokenResponse.data;

  // Exchange short-lived token for long-lived token (60 days)
  const longLivedTokenResponse = await axios.get(
    'https://graph.instagram.com/access_token',
    {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        access_token
      }
    }
  );

  const longLivedToken = longLivedTokenResponse.data.access_token;
  const expiresIn = longLivedTokenResponse.data.expires_in; // 5184000 seconds (60 days)

  // Fetch user profile info
  const profileResponse = await axios.get(
    `https://graph.instagram.com/${user_id}`,
    {
      params: {
        fields: 'id,username,account_type,media_count',
        access_token: longLivedToken
      }
    }
  );

  const profile = profileResponse.data;

  // Encrypt and store token
  const encryptedToken = await this.encryptToken(longLivedToken);

  // Save to database
  const socialAccount = await this.socialAccountRepository.save({
    creator_id: user.creator.id,
    platform: 'instagram',
    platform_user_id: user_id,
    username: profile.username,
    business_account: profile.account_type === 'BUSINESS',
    access_token_encrypted: encryptedToken,
    token_expires_at: new Date(Date.now() + expiresIn * 1000),
    connection_status: 'active',
    permissions_granted: ['instagram_basic', 'instagram_manage_insights']
  });

  // Trigger initial sync job
  await this.queueService.add('instagram-sync', {
    social_account_id: socialAccount.id
  });

  return socialAccount;
}
```

### Step 5: Fetch Instagram Data

#### Get User Media

```typescript
async fetchInstagramPosts(socialAccountId: string) {
  const account = await this.socialAccountRepository.findOne(socialAccountId);
  const token = await this.decryptToken(account.access_token_encrypted);

  // Fetch media
  const mediaResponse = await axios.get(
    `https://graph.instagram.com/${account.platform_user_id}/media`,
    {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username',
        access_token: token,
        limit: 50
      }
    }
  );

  const media = mediaResponse.data.data;

  // Fetch insights for each media (requires business account)
  for (const post of media) {
    if (account.business_account) {
      try {
        const insightsResponse = await axios.get(
          `https://graph.instagram.com/${post.id}/insights`,
          {
            params: {
              metric: 'impressions,reach,engagement,likes,comments,saves,shares',
              access_token: token
            }
          }
        );

        post.insights = insightsResponse.data.data;
      } catch (error) {
        console.warn(`Failed to fetch insights for post ${post.id}`, error);
      }
    }
  }

  return media;
}
```

#### Refresh Long-Lived Token

```typescript
async refreshInstagramToken(socialAccountId: string) {
  const account = await this.socialAccountRepository.findOne(socialAccountId);
  const token = await this.decryptToken(account.access_token_encrypted);

  // Refresh token (can be done once every 60 days, extends by another 60 days)
  const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
    params: {
      grant_type: 'ig_refresh_token',
      access_token: token
    }
  });

  const newToken = response.data.access_token;
  const expiresIn = response.data.expires_in;

  // Update in database
  await this.socialAccountRepository.update(socialAccountId, {
    access_token_encrypted: await this.encryptToken(newToken),
    token_expires_at: new Date(Date.now() + expiresIn * 1000)
  });
}
```

### Environment Variables

```env
# Instagram
INSTAGRAM_CLIENT_ID=your_app_id
INSTAGRAM_CLIENT_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=https://app.safarcollab.com/auth/instagram/callback
```

---

## YouTube Integration

### Prerequisites
- Google Cloud Project
- YouTube Data API v3 enabled
- YouTube Analytics API enabled
- OAuth 2.0 credentials created

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: **SafarCollab**
3. Enable APIs:
   - **YouTube Data API v3**
   - **YouTube Analytics API**

### Step 2: Create OAuth 2.0 Credentials

1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: **SafarCollab Web Client**
5. **Authorized redirect URIs**:
   ```
   https://app.safarcollab.com/auth/youtube/callback
   https://app-staging.safarcollab.com/auth/youtube/callback
   http://localhost:3000/auth/youtube/callback
   ```

### Step 3: Required Scopes

```
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/yt-analytics.readonly
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

### Step 4: Implementation

#### Backend: Generate OAuth URL

```typescript
@Get('youtube/oauth-url')
async getYouTubeOAuthUrl(@Query('redirect_uri') redirectUri: string) {
  const state = crypto.randomBytes(32).toString('hex');
  await this.redis.set(`youtube_oauth_state:${state}`, redirectUri, 'EX', 900);

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri
  );

  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: scopes,
    state,
    prompt: 'consent' // Force consent screen to get refresh token
  });

  return { oauth_url: authUrl, state };
}
```

#### Backend: Exchange Code for Token

```typescript
@Post('youtube/exchange-token')
async exchangeYouTubeToken(
  @Body() body: { code: string; state: string },
  @CurrentUser() user: User
) {
  const storedRedirectUri = await this.redis.get(`youtube_oauth_state:${body.state}`);
  if (!storedRedirectUri) {
    throw new UnauthorizedException('Invalid state');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    storedRedirectUri
  );

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(body.code);
  oauth2Client.setCredentials(tokens);

  // Get user's YouTube channel
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const channelsResponse = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true
  });

  if (!channelsResponse.data.items || channelsResponse.data.items.length === 0) {
    throw new BadRequestException('No YouTube channel found for this account');
  }

  const channel = channelsResponse.data.items[0];

  // Encrypt and store tokens
  const encryptedAccessToken = await this.encryptToken(tokens.access_token);
  const encryptedRefreshToken = await this.encryptToken(tokens.refresh_token);

  // Save to database
  const socialAccount = await this.socialAccountRepository.save({
    creator_id: user.creator.id,
    platform: 'youtube',
    platform_user_id: channel.id,
    username: channel.snippet.title,
    display_name: channel.snippet.title,
    profile_url: `https://youtube.com/channel/${channel.id}`,
    profile_image_url: channel.snippet.thumbnails?.default?.url,
    follower_count: parseInt(channel.statistics.subscriberCount),
    total_posts: parseInt(channel.statistics.videoCount),
    access_token_encrypted: encryptedAccessToken,
    refresh_token_encrypted: encryptedRefreshToken,
    token_expires_at: new Date(tokens.expiry_date),
    connection_status: 'active',
    permissions_granted: ['youtube.readonly', 'yt-analytics.readonly']
  });

  // Queue sync job
  await this.queueService.add('youtube-sync', {
    social_account_id: socialAccount.id
  });

  return socialAccount;
}
```

#### Fetch YouTube Videos

```typescript
async fetchYouTubeVideos(socialAccountId: string) {
  const account = await this.socialAccountRepository.findOne(socialAccountId);
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: await this.decryptToken(account.access_token_encrypted),
    refresh_token: await this.decryptToken(account.refresh_token_encrypted)
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  // Get videos from channel
  const videosResponse = await youtube.search.list({
    part: ['snippet'],
    channelId: account.platform_user_id,
    maxResults: 50,
    order: 'date',
    type: ['video']
  });

  const videoIds = videosResponse.data.items.map(item => item.id.videoId);

  // Get video statistics
  const statsResponse = await youtube.videos.list({
    part: ['statistics', 'snippet', 'contentDetails'],
    id: videoIds
  });

  return statsResponse.data.items;
}
```

#### Fetch YouTube Analytics

```typescript
async fetchYouTubeAnalytics(socialAccountId: string, videoId: string) {
  const account = await this.socialAccountRepository.findOne(socialAccountId);
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: await this.decryptToken(account.access_token_encrypted),
    refresh_token: await this.decryptToken(account.refresh_token_encrypted)
  });

  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });

  const response = await youtubeAnalytics.reports.query({
    ids: 'channel==MINE',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    metrics: 'views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration',
    dimensions: 'video',
    filters: `video==${videoId}`
  });

  return response.data;
}
```

### Environment Variables

```env
# YouTube
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=https://app.safarcollab.com/auth/youtube/callback
```

---

## TikTok Integration

### Prerequisites
- TikTok for Developers account
- App registered on TikTok Developer Portal
- Business account approval (for analytics access)

### Step 1: Register App

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create app in **TikTok for Business** section
3. Complete app review process

### Step 2: Configure OAuth

**Redirect URIs**:
```
https://app.safarcollab.com/auth/tiktok/callback
https://app-staging.safarcollab.com/auth/tiktok/callback
http://localhost:3000/auth/tiktok/callback
```

### Step 3: Required Scopes

```
user.info.basic
video.list
video.insights
```

### Step 4: Implementation

#### Backend: Generate OAuth URL

```typescript
@Get('tiktok/oauth-url')
async getTikTokOAuthUrl(@Query('redirect_uri') redirectUri: string) {
  const state = crypto.randomBytes(32).toString('hex');
  await this.redis.set(`tiktok_oauth_state:${state}`, redirectUri, 'EX', 900);

  const csrfState = crypto.randomBytes(16).toString('hex');

  const oauthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  oauthUrl.searchParams.append('client_key', process.env.TIKTOK_CLIENT_KEY);
  oauthUrl.searchParams.append('scope', 'user.info.basic,video.list');
  oauthUrl.searchParams.append('response_type', 'code');
  oauthUrl.searchParams.append('redirect_uri', redirectUri);
  oauthUrl.searchParams.append('state', state);

  return { oauth_url: oauthUrl.toString(), state };
}
```

#### Backend: Exchange Token

```typescript
@Post('tiktok/exchange-token')
async exchangeTikTokToken(
  @Body() body: { code: string; state: string },
  @CurrentUser() user: User
) {
  const storedRedirectUri = await this.redis.get(`tiktok_oauth_state:${body.state}`);
  if (!storedRedirectUri) {
    throw new UnauthorizedException('Invalid state');
  }

  // Exchange code for access token
  const tokenResponse = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    code: body.code,
    grant_type: 'authorization_code',
    redirect_uri: storedRedirectUri
  });

  const { access_token, refresh_token, expires_in, open_id } = tokenResponse.data.data;

  // Fetch user info
  const userInfoResponse = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
    params: { fields: 'open_id,union_id,avatar_url,display_name' },
    headers: { Authorization: `Bearer ${access_token}` }
  });

  const userInfo = userInfoResponse.data.data.user;

  // Save to database
  const socialAccount = await this.socialAccountRepository.save({
    creator_id: user.creator.id,
    platform: 'tiktok',
    platform_user_id: open_id,
    username: userInfo.display_name,
    profile_image_url: userInfo.avatar_url,
    access_token_encrypted: await this.encryptToken(access_token),
    refresh_token_encrypted: await this.encryptToken(refresh_token),
    token_expires_at: new Date(Date.now() + expires_in * 1000),
    connection_status: 'active'
  });

  return socialAccount;
}
```

### Environment Variables

```env
# TikTok
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=https://app.safarcollab.com/auth/tiktok/callback
```

---

## Security Best Practices

### 1. Token Encryption

Use AWS KMS or similar encryption service:

```typescript
import { KMS } from 'aws-sdk';

const kms = new KMS({ region: 'ap-south-1' });

async function encryptToken(plaintext: string): Promise<string> {
  const result = await kms.encrypt({
    KeyId: process.env.KMS_KEY_ID,
    Plaintext: plaintext
  }).promise();
  
  return result.CiphertextBlob.toString('base64');
}

async function decryptToken(ciphertext: string): Promise<string> {
  const result = await kms.decrypt({
    CiphertextBlob: Buffer.from(ciphertext, 'base64')
  }).promise();
  
  return result.Plaintext.toString('utf-8');
}
```

### 2. CSRF Protection

Always validate `state` parameter:

```typescript
// Store state with expiration
await redis.set(`oauth_state:${state}`, redirectUri, 'EX', 900);

// Validate on callback
const storedUri = await redis.get(`oauth_state:${state}`);
if (!storedUri) {
  throw new UnauthorizedException('Invalid or expired state');
}

// Delete state after use
await redis.del(`oauth_state:${state}`);
```

### 3. Secure Storage

- **NEVER** store tokens in plaintext
- Use encrypted database columns
- Limit access to decryption keys (IAM roles)
- Rotate encryption keys periodically

### 4. Token Refresh Strategy

```typescript
async function ensureFreshToken(socialAccountId: string): Promise<string> {
  const account = await this.socialAccountRepository.findOne(socialAccountId);
  
  // Check if token expires within next hour
  const expiryThreshold = new Date(Date.now() + 3600 * 1000);
  
  if (account.token_expires_at < expiryThreshold) {
    // Refresh token
    const newToken = await this.refreshToken(account);
    return newToken;
  }
  
  return await this.decryptToken(account.access_token_encrypted);
}
```

---

## Error Handling

### Common OAuth Errors

```typescript
try {
  const token = await exchangeToken(code);
} catch (error) {
  if (error.response) {
    switch (error.response.status) {
      case 400:
        // Invalid code or redirect URI
        throw new BadRequestException('Invalid authorization code');
      case 401:
        // Invalid client credentials
        throw new UnauthorizedException('OAuth client authentication failed');
      default:
        throw new InternalServerErrorException('OAuth exchange failed');
    }
  }
}
```

### Rate Limit Handling

```typescript
async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, options);
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        await sleep(retryAfter * 1000);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Testing

### Mock OAuth Flow for Testing

```typescript
// test/mocks/oauth.mock.ts
export class MockOAuthService {
  async exchangeToken(code: string) {
    if (code === 'valid_test_code') {
      return {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600
      };
    }
    throw new Error('Invalid code');
  }
}
```

### Integration Test Example

```typescript
describe('Instagram OAuth', () => {
  it('should connect Instagram account', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/social/instagram/oauth-url')
      .query({ redirect_uri: 'http://localhost:3000/callback' })
      .expect(200);

    expect(response.body.oauth_url).toContain('instagram.com/oauth/authorize');
    expect(response.body.state).toBeDefined();
  });

  it('should exchange code for token', async () => {
    // Use Instagram test account
    const code = 'test_code_from_instagram';
    const state = 'valid_state';

    const response = await request(app.getHttpServer())
      .post('/api/v1/social/instagram/exchange-token')
      .send({ code, state })
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.platform).toBe('instagram');
    expect(response.body.connection_status).toBe('active');
  });
});
```

---

## Monitoring & Logging

### Track OAuth Events

```typescript
// Log all OAuth attempts
logger.info('OAuth initiated', {
  platform: 'instagram',
  user_id: user.id,
  timestamp: new Date()
});

// Log successes
logger.info('OAuth successful', {
  platform: 'instagram',
  user_id: user.id,
  account_id: socialAccount.id
});

// Log failures
logger.error('OAuth failed', {
  platform: 'instagram',
  user_id: user.id,
  error: error.message
});
```

### Metrics to Track

- OAuth initiation rate
- OAuth success rate
- OAuth failure reasons
- Token refresh success rate
- API call failures per platform

---

## Troubleshooting

### Instagram

**Issue**: "Insufficient permissions"
- **Solution**: Ensure user has converted to Business/Creator account in Instagram settings

**Issue**: "Insights not available"
- **Solution**: Account must have >100 followers and be a Business account

### YouTube

**Issue**: "No channels found"
- **Solution**: User must have a YouTube channel created

**Issue**: "Quota exceeded"
- **Solution**: YouTube API has daily quota limits. Implement caching and optimize queries.

### TikTok

**Issue**: "App not approved"
- **Solution**: TikTok requires business verification. Submit app for review.

**Issue**: "Limited data access"
- **Solution**: Some endpoints require additional permissions and approvals.

---

## Summary Checklist

- [ ] Register apps on all platforms (Facebook, Google, TikTok)
- [ ] Configure redirect URIs for all environments
- [ ] Set up token encryption (KMS)
- [ ] Implement CSRF protection with state parameter
- [ ] Handle token refresh before expiration
- [ ] Implement rate limit handling and backoff
- [ ] Add comprehensive error handling
- [ ] Write integration tests with test accounts
- [ ] Set up monitoring and alerting
- [ ] Document API quotas and limits

---

**For questions or issues, contact the platform team at tech@safarcollab.com**
