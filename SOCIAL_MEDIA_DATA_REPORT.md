# Social Media Data Report - What You Get After Connecting

This document explains all the data that Influencia fetches when you connect your social media accounts.

---

## 📺 YouTube Data Report

When you connect your YouTube account, we fetch the following comprehensive data:

### Basic Channel Information
| Field | Description | Example |
|-------|-------------|---------|
| `channel_title` | Your channel name | "Suhelali Pakjade" |
| `username` | Your custom URL or handle | "@suhelalipakjade4282" |
| `thumbnail_url` | Channel profile picture | URL to image |
| `banner_url` | Channel banner image | URL to image |
| `channel_description` | About section text | "Welcome to my channel..." |
| `country` | Channel country setting | "IN" (India) |
| `custom_url` | Custom channel URL | "@YourChannel" |
| `channel_created_at` | When channel was created | "2020-05-15T10:30:00Z" |

### Key Statistics
| Metric | Description | Example |
|--------|-------------|---------|
| `subscriber_count` | Total subscribers | 2 |
| `total_views` | Lifetime views across all videos | 150 |
| `posts` (video_count) | Total number of videos | 5 |
| `hidden_subscriber_count` | If subscriber count is hidden | false |

### Calculated Analytics
| Metric | Description | Calculation |
|--------|-------------|-------------|
| `channel_age_days` | Days since channel creation | 1532 |
| `avg_views_per_video` | Average views per video | total_views / video_count |
| `engagement_rate` | Estimated engagement % | (avg_likes + avg_comments) / subscribers * 100 |
| `avg_views` | Average views on last 10 videos | 30 |
| `avg_likes` | Average likes on last 10 videos | 5 |
| `avg_comments` | Average comments on last 10 videos | 2 |

### Recent Videos (Last 10)
For each video, we fetch:
| Field | Description |
|-------|-------------|
| `id` | YouTube video ID |
| `title` | Video title |
| `published_at` | When video was published |
| `thumbnail_url` | Video thumbnail |
| `view_count` | Number of views |
| `like_count` | Number of likes |
| `comment_count` | Number of comments |
| `duration` | Video length (PT4M13S format) |

### Channel Keywords/Topics
Array of keywords from channel branding settings that describe content categories.

### Sample JSON Response
```json
{
  "id": "4db6a0af-73be-417e-878d-976603a37bc0",
  "platform": "youtube",
  "username": "@suhelalipakjade4282",
  "followers_count": 2,
  "engagement_rate": 3.5,
  "metrics": {
    "channel_title": "Suhelali Pakjade",
    "channel_description": "Welcome to my channel...",
    "thumbnail_url": "https://yt3.ggpht.com/...",
    "banner_url": "https://yt3.ggpht.com/...",
    "custom_url": "@suhelalipakjade4282",
    "country": "IN",
    
    "posts": 0,
    "total_views": 0,
    "subscriber_count": 2,
    "hidden_subscriber_count": false,
    
    "channel_age_days": 1532,
    "avg_views_per_video": 0,
    "engagement_rate": 0,
    "avg_likes": 0,
    "avg_comments": 0,
    "avg_views": 0,
    
    "keywords": ["tech", "tutorials", "coding"],
    
    "recent_videos": [
      {
        "id": "abc123xyz",
        "title": "My First Video",
        "published_at": "2024-01-15T10:30:00Z",
        "thumbnail_url": "https://i.ytimg.com/...",
        "view_count": 150,
        "like_count": 10,
        "comment_count": 5,
        "duration": "PT4M13S"
      }
    ],
    
    "channel_created_at": "2020-05-15T10:30:00Z",
    "last_synced_at": "2026-01-18T22:30:00Z"
  },
  "is_connected": true,
  "last_synced_at": "2026-01-18T22:30:00Z"
}
```

---

## 📸 Instagram Data Report (Coming Soon)

When you connect your Instagram Business/Creator account:

### Profile Information
| Field | Description |
|-------|-------------|
| `username` | Instagram handle |
| `name` | Display name |
| `biography` | Profile bio |
| `profile_picture_url` | Profile image |
| `website` | Website link |
| `followers_count` | Total followers |
| `follows_count` | Following count |
| `media_count` | Total posts |

### Media Insights (Recent Posts)
| Metric | Description |
|--------|-------------|
| `impressions` | Times content was displayed |
| `reach` | Unique accounts that saw content |
| `engagement` | Likes + Comments + Saves + Shares |
| `saved` | Times content was saved |
| `shares` | Times content was shared |

### Audience Demographics
- Age ranges
- Gender distribution
- Top cities
- Top countries

---

## 🎵 TikTok Data Report (Coming Soon)

### Profile Information
| Field | Description |
|-------|-------------|
| `username` | TikTok handle |
| `display_name` | Display name |
| `avatar_url` | Profile picture |
| `bio_description` | Profile bio |
| `follower_count` | Total followers |
| `following_count` | Following count |
| `likes_count` | Total likes received |
| `video_count` | Total videos |

### Video Performance
| Metric | Description |
|--------|-------------|
| `view_count` | Number of views |
| `like_count` | Number of likes |
| `comment_count` | Number of comments |
| `share_count` | Number of shares |

---

## 🐦 Twitter/X Data Report (Coming Soon)

### Profile Information
| Field | Description |
|-------|-------------|
| `username` | Twitter handle |
| `name` | Display name |
| `description` | Bio |
| `profile_image_url` | Profile picture |
| `followers_count` | Total followers |
| `following_count` | Following count |
| `tweet_count` | Total tweets |
| `verified` | Verification status |

### Tweet Metrics
| Metric | Description |
|--------|-------------|
| `impressions` | Times tweet was seen |
| `engagements` | Total interactions |
| `retweets` | Number of retweets |
| `replies` | Number of replies |
| `likes` | Number of likes |
| `url_clicks` | Link clicks |

---

## 🔄 Data Sync Behavior

### Automatic Sync
- **Frequency**: Every 6 hours
- **Trigger**: Background job checks for stale accounts
- **Stale Definition**: Last sync > 6 hours ago

### Manual Sync
- Click "Sync" button on any connected account
- Click "Sync All" to refresh all platforms
- Immediate data refresh from platform APIs

### First-Time Connect
When you first connect an account:
1. OAuth authorization with the platform
2. Immediate full data fetch
3. All metrics saved to database
4. Displayed in the analytics dashboard

### Token Refresh
- YouTube tokens expire in 1 hour
- Automatic refresh using refresh_token
- Seamless background refresh before expiry

---

## 🔐 Data Security

### Token Storage
- Access tokens encrypted with AES-256-GCM
- Encryption key stored in environment variables
- Tokens never logged or exposed

### OAuth Scopes (Permissions Requested)

**YouTube:**
- `youtube.readonly` - Read channel and video data
- `yt-analytics.readonly` - Read analytics data
- `userinfo.profile` - Read basic profile info

**Instagram:**
- `instagram_basic` - Read profile info
- `instagram_content_publish` - Post content (optional)
- `pages_read_engagement` - Read page insights

**TikTok:**
- `user.info.basic` - Read profile info
- `video.list` - List user videos
- `video.insights` - Video performance data

---

## 📊 How This Data is Used

### Creator Matching
- Engagement rates compared to industry benchmarks
- Quality scores calculated from multiple metrics
- Audience overlap analysis with brand targets

### Brand Discovery
- Creators ranked by platform-specific performance
- Real-time metrics ensure accuracy
- Historical trends show growth patterns

### Campaign Analytics
- Track creator performance during campaigns
- Measure engagement improvements
- ROI calculations based on reach and engagement

---

## 🚀 API Endpoints

### Get All Connected Accounts
```
GET /v1/social/accounts
Authorization: Bearer <token>
```

### Get Aggregated Stats
```
GET /v1/social/aggregated-stats
Authorization: Bearer <token>
```

### Sync Single Platform
```
POST /v1/social/sync/youtube
Authorization: Bearer <token>
```

### Sync All Platforms
```
POST /v1/social/sync/all
Authorization: Bearer <token>
```

### Get Metrics History
```
GET /v1/social/metrics/history?platform=youtube&days=30
Authorization: Bearer <token>
```
