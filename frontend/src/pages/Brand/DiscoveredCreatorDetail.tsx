import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { discoveryApi, type DiscoveredCreator } from '../../api/discovery'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ExternalLink, Users, TrendingUp, Globe, Star, Shield, AlertTriangle,
  CheckCircle, MapPin, Loader2, Sparkles
} from 'lucide-react'

export default function DiscoveredCreatorDetail() {
  const { campaignId, discoveredId } = useParams<{ campaignId: string; discoveredId: string }>()
  const [creator, setCreator] = useState<DiscoveredCreator | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (campaignId && discoveredId) {
      setLoading(true)
      discoveryApi.getCreatorDetail(campaignId, discoveredId)
        .then(setCreator)
        .catch(() => toast.error('Creator not found'))
        .finally(() => setLoading(false))
    }
  }, [campaignId, discoveredId])

  const formatFollowers = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const scoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600'
    if (s >= 60) return 'text-blue-600'
    if (s >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const scoreBg = (s: number) => {
    if (s >= 80) return 'from-green-400 to-emerald-500'
    if (s >= 60) return 'from-blue-400 to-indigo-500'
    if (s >= 40) return 'from-yellow-400 to-orange-500'
    return 'from-red-400 to-pink-500'
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-purple-600" />
          <p className="text-gray-600 mt-3">Loading creator details...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!creator) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold text-gray-900">Creator not found</h3>
          <Link to={`/brand/campaigns/${campaignId}/discovery`} className="text-purple-600 mt-2 inline-block">Go back</Link>
        </div>
      </DashboardLayout>
    )
  }

  const score = Number(creator.match_score)

  return (
    <DashboardLayout>
      {/* Header */}
      <Link to={`/brand/campaigns/${campaignId}/discovery`} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Discovery
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="card">
            <div className="flex items-start gap-6">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${scoreBg(score)} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                {creator.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{creator.name}</h1>
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Discovered
                  </span>
                </div>
                <p className="text-gray-500 mb-2">@{creator.handle} • {creator.platform}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" />{formatFollowers(creator.followers_count)} followers</span>
                  <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" />{Number(creator.engagement_rate).toFixed(1)}% engagement</span>
                  {creator.region && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{creator.region}</span>}
                </div>
              </div>
              {creator.profile_url && (
                <a href={creator.profile_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                  <ExternalLink className="w-4 h-4" /> View Profile
                </a>
              )}
            </div>
          </div>

          {/* AI Summary */}
          {creator.ai_summary && (
            <div className="card bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" /> AI Analysis
              </h2>
              <p className="text-gray-700 leading-relaxed">{creator.ai_summary}</p>
            </div>
          )}

          {/* Content Style */}
          {creator.content_style && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Content Style</h2>
              <p className="text-gray-700">{creator.content_style}</p>
            </div>
          )}

          {/* Audience */}
          {creator.audience_summary && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Audience</h2>
              <p className="text-gray-700">{creator.audience_summary}</p>
            </div>
          )}

          {/* Recent Content */}
          {creator.recent_content && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Content</h2>
              {typeof creator.recent_content === 'string' ? (
                <p className="text-gray-700">{creator.recent_content}</p>
              ) : Array.isArray(creator.recent_content) ? (
                <ul className="space-y-2">
                  {creator.recent_content.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-400 font-mono text-xs mt-0.5">{i + 1}</span>
                      <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg overflow-auto">{JSON.stringify(creator.recent_content, null, 2)}</pre>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Match Score */}
          <div className="card text-center">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Match Score</h3>
            <div className={`text-5xl font-bold ${scoreColor(score)}`}>
              {score.toFixed(0)}%
            </div>
            <p className="text-sm text-gray-500 mt-1">AI-powered relevance</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div className={`h-2 rounded-full bg-gradient-to-r ${scoreBg(score)}`} style={{ width: `${score}%` }} />
            </div>
          </div>

          {/* Strengths */}
          {creator.strengths && creator.strengths.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" /> Strengths
              </h3>
              <ul className="space-y-2">
                {creator.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {creator.concerns && creator.concerns.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" /> Concerns
              </h3>
              <ul className="space-y-2">
                {creator.concerns.map((c, i) => (
                  <li key={i} className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Categories */}
          {creator.categories && creator.categories.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {creator.categories.map((cat, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">{cat}</span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="card bg-gray-50 border-dashed border-2 border-gray-300 text-center">
            <Globe className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-3">This creator is not on Influencia.</p>
            {creator.profile_url ? (
              <a href={creator.profile_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm">
                <ExternalLink className="w-4 h-4" /> Contact Externally
              </a>
            ) : (
              <p className="text-xs text-gray-400">No profile URL available</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
