import { useState } from 'react'
import {
  Youtube,
  Instagram,
  Users,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  Calendar,
  Globe,
  Video,
  BarChart3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
} from 'lucide-react'
import type { SocialAccount } from '../../api/social'

interface SocialAccountDetailsProps {
  account: SocialAccount
  onSync?: () => void
  syncing?: boolean
}

export default function SocialAccountDetails({ account, onSync, syncing }: SocialAccountDetailsProps) {
  const [showVideos, setShowVideos] = useState(false)
  const metrics = account.metrics || {}

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatDuration = (duration: string) => {
    // Parse ISO 8601 duration (e.g., PT4M13S)
    const match = duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return duration
    const hours = parseInt(match[1]) || 0
    const minutes = parseInt(match[2]) || 0
    const seconds = parseInt(match[3]) || 0
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const platformConfig = {
    youtube: {
      icon: Youtube,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-200',
    },
    instagram: {
      icon: Instagram,
      color: 'pink',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      borderColor: 'border-pink-200',
    },
    tiktok: {
      icon: null,
      emoji: '🎵',
      color: 'gray',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-200',
    },
    twitter: {
      icon: null,
      emoji: '🐦',
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
  }

  const config = platformConfig[account.platform] || platformConfig.youtube
  const Icon = config.icon

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-6`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {metrics.thumbnail_url ? (
            <img
              src={metrics.thumbnail_url}
              alt={account.username}
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
            />
          ) : (
            <div className={`w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center`}>
              {Icon ? <Icon className={`w-8 h-8 ${config.textColor}`} /> : <span className="text-3xl">{(config as any).emoji}</span>}
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {metrics.channel_title || account.username}
            </h3>
            <p className="text-gray-600">@{account.username}</p>
            {metrics.country && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <Globe className="w-3 h-3" />
                {metrics.country}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            Connected
          </span>
          {onSync && (
            <button
              onClick={onSync}
              disabled={syncing}
              className={`p-2 rounded-lg ${config.bgColor} hover:bg-opacity-75 transition-colors`}
            >
              <TrendingUp className={`w-4 h-4 ${syncing ? 'animate-spin' : ''} ${config.textColor}`} />
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" />
            Subscribers
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(account.followers_count)}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Eye className="w-4 h-4" />
            Total Views
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.total_views)}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Video className="w-4 h-4" />
            Videos
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.posts)}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Engagement
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.engagement_rate?.toFixed(2) || '0'}%
          </div>
        </div>
      </div>

      {/* Average Performance */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Average Performance (Last 10 Videos)
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{formatNumber(metrics.avg_views)}</div>
            <div className="text-xs text-gray-500">Avg Views</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{formatNumber(metrics.avg_likes)}</div>
            <div className="text-xs text-gray-500">Avg Likes</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{formatNumber(metrics.avg_comments)}</div>
            <div className="text-xs text-gray-500">Avg Comments</div>
          </div>
        </div>
      </div>

      {/* Channel Info */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Channel Information
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Channel Age:</span>
            <span className="ml-2 font-medium">
              {metrics.channel_age_days ? `${Math.floor(metrics.channel_age_days / 365)} years, ${Math.floor((metrics.channel_age_days % 365) / 30)} months` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Avg Views/Video:</span>
            <span className="ml-2 font-medium">{formatNumber(metrics.avg_views_per_video)}</span>
          </div>
          {metrics.channel_created_at && (
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-2 font-medium">
                {new Date(metrics.channel_created_at).toLocaleDateString()}
              </span>
            </div>
          )}
          {metrics.last_synced_at && (
            <div>
              <span className="text-gray-500">Last Synced:</span>
              <span className="ml-2 font-medium">
                {new Date(metrics.last_synced_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        
        {/* Keywords */}
        {metrics.keywords && metrics.keywords.length > 0 && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Topics:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {metrics.keywords.slice(0, 10).map((keyword: string, i: number) => (
                <span
                  key={i}
                  className={`px-2 py-1 ${config.bgColor} ${config.textColor} text-xs rounded-full`}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Videos */}
      {metrics.recent_videos && metrics.recent_videos.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <button
            onClick={() => setShowVideos(!showVideos)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 mb-3"
          >
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Recent Videos ({metrics.recent_videos.length})
            </div>
            {showVideos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showVideos && (
            <div className="space-y-3">
              {metrics.recent_videos.map((video: any) => (
                <div
                  key={video.id}
                  className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-24 h-14 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-gray-900 truncate">
                      {video.title}
                    </h5>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNumber(video.view_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {formatNumber(video.like_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {formatNumber(video.comment_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(video.duration)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(video.published_at).toLocaleDateString()}
                    </div>
                  </div>
                  <a
                    href={`https://youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Channel Description */}
      {metrics.channel_description && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">About</h4>
          <p className="text-sm text-gray-600 line-clamp-3">{metrics.channel_description}</p>
        </div>
      )}
    </div>
  )
}
