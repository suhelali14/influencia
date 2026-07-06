import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { discoveryApi, type DiscoveredCreator } from '../../api/discovery'
import { matchingApi, type CreatorMatch } from '../../api/matching'
import { campaignsApi } from '../../api/campaigns'
import toast from 'react-hot-toast'
import {
  Search, Globe, Users, TrendingUp, Star, ExternalLink, ChevronLeft, ChevronRight,
  Sparkles, Loader2, RefreshCw, ArrowLeft, BarChart3, Eye, Youtube, Instagram,
  Play, Twitter, CheckCircle, Zap, AlertCircle, Info
} from 'lucide-react'

import { useDiscoveryJob } from '../../hooks/useDiscoveryJob'

type Tab = 'platform' | 'discovery' | 'compare'

// Source badge config
const SOURCE_CONFIG = {
  youtube_api:  { label: 'YouTube', icon: Youtube, color: 'bg-red-50 text-red-700 border-red-200' },
  google_serp:  { label: 'Google', icon: Globe, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  seed_data:    { label: 'Template', icon: Info, color: 'bg-gray-50 text-gray-600 border-gray-200' },
  default:      { label: 'Web', icon: Globe, color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

const PLATFORM_ICON = {
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  youtube:   <Youtube className="w-4 h-4 text-red-500" />,
  tiktok:    <Play className="w-4 h-4 text-gray-800" />,
  twitter:   <Twitter className="w-4 h-4 text-sky-400" />,
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n || '?')
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-green-700 bg-green-50 border-green-200'
  if (s >= 60) return 'text-blue-700 bg-blue-50 border-blue-200'
  if (s >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Excellent'
  if (s >= 60) return 'Good'
  if (s >= 40) return 'Fair'
  return 'Low'
}

// Animated searching steps shown while AI is working
const SEARCH_STEPS = [
  { icon: '🔍', text: 'Scanning YouTube channels...' },
  { icon: '🌐', text: 'Searching Google SERP for Instagram creators...' },
  { icon: '🤖', text: 'Running heuristic match scoring...' },
  { icon: '✨', text: 'Generating AI summaries for top creators...' },
  { icon: '📊', text: 'Ranking and deduplicating results...' },
]

export default function CreatorDiscovery() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const [tab, setTab] = useState<Tab>('discovery')
  const [campaign, setCampaign] = useState<any>(null)

  // Discovery state
  const [discovered, setDiscovered] = useState<DiscoveredCreator[]>([])
  const [discoveryTotal, setDiscoveryTotal] = useState(0)
  const [discoveryPage, setDiscoveryPage] = useState(1)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [searchStep, setSearchStep] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  // Platform state
  const [platformMatches, setPlatformMatches] = useState<CreatorMatch[]>([])
  const [platformTotal, setPlatformTotal] = useState(0)
  const [platformPage, setPlatformPage] = useState(1)
  const [platformLoading, setPlatformLoading] = useState(false)

  // Compare state
  const [compareData, setCompareData] = useState<any>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  const pageSize = 12

  // Load discovered creators
  const loadDiscovered = useCallback(async (page: number) => {
    if (!campaignId) return
    setDiscoveryLoading(true)
    try {
      const res = await discoveryApi.getDiscoveredCreators(campaignId, { page, pageSize })
      setDiscovered(res.data)
      setDiscoveryTotal(res.meta.totalCount)
      setHasSearched(res.meta.totalCount > 0)
    } catch { /* ignore */ }
    setDiscoveryLoading(false)
  }, [campaignId])

  // Setup background job tracking hook
  const { job, startSync } = useDiscoveryJob(campaignId, () => {
    loadDiscovered(1)
    // Reload compare data if it was loaded
    if (compareData) {
      setCompareLoading(true)
      discoveryApi.compareCreators(campaignId!).then(setCompareData).catch(() => {}).finally(() => setCompareLoading(false))
    }
  })

  const searching = job.status === 'running' || job.status === 'pending'

  // Load campaign
  useEffect(() => {
    if (campaignId) {
      campaignsApi.getById(campaignId).then(setCampaign).catch(() => toast.error('Campaign not found'))
    }
  }, [campaignId])

  // Animate search steps while loading
  useEffect(() => {
    if (!searching) { setSearchStep(0); return }
    const interval = setInterval(() => {
      setSearchStep(prev => (prev + 1) % SEARCH_STEPS.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [searching])

  const loadPlatform = useCallback(async (page: number) => {
    if (!campaignId) return
    setPlatformLoading(true)
    try {
      const res = await matchingApi.findCreatorsForCampaign(campaignId, { page, pageSize })
      setPlatformMatches(res.data)
      setPlatformTotal(res.meta.totalCount)
    } catch { /* ignore */ }
    setPlatformLoading(false)
  }, [campaignId])

  useEffect(() => {
    if (tab === 'discovery') loadDiscovered(discoveryPage)
    if (tab === 'platform') loadPlatform(platformPage)
    if (tab === 'compare' && !compareData) {
      setCompareLoading(true)
      discoveryApi.compareCreators(campaignId!).then(setCompareData).catch(() => {}).finally(() => setCompareLoading(false))
    }
  }, [tab, discoveryPage, platformPage, campaignId, loadDiscovered, loadPlatform, compareData])

  const runDiscovery = async (forceRefresh = false) => {
    if (!campaignId) return
    try {
      await startSync(forceRefresh)
      toast.success('Discovery job queued successfully!')
    } catch (err: any) {
      toast.error('Failed to queue discovery job.')
    }
  }

  const totalDiscoveryPages = Math.ceil(discoveryTotal / pageSize)
  const totalPlatformPages = Math.ceil(platformTotal / pageSize)

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <Link to={`/brand/campaigns/${campaignId}`} className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-4 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Campaign
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Creator Discovery</h1>
            {campaign && (
              <p className="text-gray-500 mt-1">
                for <span className="font-semibold text-gray-700">{campaign.title}</span>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-sm bg-gray-100 px-2 py-0.5 rounded-full capitalize">{campaign.platform}</span>
                <span className="mx-1 text-gray-300">•</span>
                <span className="text-sm bg-gray-100 px-2 py-0.5 rounded-full capitalize">{campaign.category}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {([
          { key: 'discovery' as Tab, label: 'Internet Search', icon: Globe, count: discoveryTotal,
            desc: 'Find creators from YouTube & Instagram' },
          { key: 'platform' as Tab, label: 'Platform Creators', icon: Users, count: platformTotal,
            desc: 'Creators registered on Influencia' },
          { key: 'compare' as Tab, label: 'Compare', icon: BarChart3,
            desc: 'Side-by-side comparison' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            title={t.desc}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── INTERNET SEARCH TAB ────────────────────────────────────────── */}
      {tab === 'discovery' && (
        <div>
          {/* Search Launch Card */}
          <div className="card mb-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-purple-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">AI-Powered Internet Search</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Searches YouTube Data API + Google SERP to find real creators matching your campaign niche
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      <Youtube className="w-3 h-3 text-red-500" /> YouTube API (Free)
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      <Globe className="w-3 h-3 text-blue-500" /> Google SERP (~$0.003)
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      <Zap className="w-3 h-3 text-purple-500" /> AI Scoring (Free)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {hasSearched && (
                  <button
                    onClick={() => runDiscovery(true)}
                    disabled={searching}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 text-sm text-gray-700 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${searching ? 'animate-spin' : ''}`} />
                    Re-search
                  </button>
                )}
                <button
                  onClick={() => runDiscovery(false)}
                  disabled={searching}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {searching
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Search className="w-4 h-4" />}
                  {searching ? 'Searching...' : hasSearched ? 'Search Again' : 'Find Creators'}
                </button>
              </div>
            </div>

            {/* Animated progress while searching */}
            {searching && (
              <div className="mt-4 pt-4 border-t border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-xl">
                    {SEARCH_STEPS[searchStep].icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{SEARCH_STEPS[searchStep].text}</p>
                    <div className="h-1.5 bg-purple-100 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${((searchStep + 1) / SEARCH_STEPS.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  This may take 20–60 seconds depending on API response times
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          {discoveryLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
              <p className="text-gray-500 mt-3 text-sm">Loading discovered creators...</p>
            </div>
          ) : discovered.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{discovered.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{discoveryTotal}</span> creators found
                </p>
                <p className="text-xs text-gray-400">Sorted by AI match score</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {discovered.map((creator) => {
                  const sourceKey = (creator as any).source || 'default'
                  const srcConfig = SOURCE_CONFIG[sourceKey as keyof typeof SOURCE_CONFIG] || SOURCE_CONFIG.default
                  const SrcIcon = srcConfig.icon
                  const score = Number(creator.match_score)
                  const platform = creator.platform?.toLowerCase() || 'instagram'
                  const platformIcon = PLATFORM_ICON[platform as keyof typeof PLATFORM_ICON]

                  return (
                    <div
                      key={creator.id}
                      className="card hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-purple-200 flex flex-col"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="relative">
                            {creator.avatar_url ? (
                              <img
                                src={creator.avatar_url}
                                alt={creator.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                {creator.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                              {platformIcon || <Globe className="w-3 h-3 text-gray-400" />}
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{creator.name}</h3>
                            <p className="text-xs text-gray-500">@{creator.handle}</p>
                          </div>
                        </div>
                        {/* Match score badge */}
                        <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl border text-xs font-bold ${scoreColor(score)}`}>
                          <span className="text-base leading-tight">{score.toFixed(0)}%</span>
                          <span className="font-normal opacity-80">{scoreLabel(score)}</span>
                        </div>
                      </div>

                      {/* Source + Region tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className={`inline-flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full ${srcConfig.color}`}>
                          <SrcIcon className="w-3 h-3" />
                          {srcConfig.label}
                        </span>
                        {creator.region && (
                          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                            📍 {creator.region}
                          </span>
                        )}
                        {creator.rank <= 5 && (
                          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            🏆 Top {creator.rank}
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-2.5 mb-3 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-gray-900">{formatFollowers(creator.followers_count)}</span>
                          <span>followers</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-gray-900">{Number(creator.engagement_rate).toFixed(1)}%</span>
                          <span>eng.</span>
                        </div>
                      </div>

                      {/* Categories */}
                      {creator.categories && creator.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {creator.categories.slice(0, 3).map((cat, i) => (
                            <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* AI Summary */}
                      {creator.ai_summary && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed border-l-2 border-purple-200 pl-2">
                          {creator.ai_summary}
                        </p>
                      )}

                      {/* Strengths */}
                      {creator.strengths && creator.strengths.length > 0 && (
                        <div className="mb-3">
                          {creator.strengths.slice(0, 2).map((s, i) => (
                            <p key={i} className="text-xs text-green-700 flex items-start gap-1">
                              <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {s}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                        <Link
                          to={`/brand/campaigns/${campaignId}/discovery/${creator.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Detail
                        </Link>
                        {creator.profile_url && (
                          <a
                            href={creator.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Profile
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalDiscoveryPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => setDiscoveryPage(p => Math.max(1, p - 1))}
                    disabled={discoveryPage === 1}
                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {discoveryPage} of {totalDiscoveryPages}
                    <span className="text-gray-400 ml-1">({discoveryTotal} creators)</span>
                  </span>
                  <button
                    onClick={() => setDiscoveryPage(p => Math.min(totalDiscoveryPages, p + 1))}
                    disabled={discoveryPage === totalDiscoveryPages}
                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="card text-center py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Creators Found Yet</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                Click <strong>"Find Creators"</strong> to search YouTube and Instagram for creators matching your campaign niche
              </p>
              <button
                onClick={() => runDiscovery(false)}
                disabled={searching}
                className="inline-flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold disabled:opacity-50 transition-colors"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {searching ? 'Searching...' : 'Find Creators Now'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PLATFORM CREATORS TAB ──────────────────────────────────────── */}
      {tab === 'platform' && (
        <div>
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            <Users className="w-4 h-4 flex-shrink-0" />
            Creators registered on Influencia who match your campaign. These have verified profiles and past campaign data.
          </div>

          {platformLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            </div>
          ) : platformMatches.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platformMatches.map((match) => {
                  const name = `${match.creator.user?.first_name || ''} ${match.creator.user?.last_name || ''}`.trim() || 'Creator'
                  return (
                    <Link
                      key={match.creator.id}
                      to={`/brand/campaigns/${campaignId}/creator/${match.creator.id}/analysis`}
                      className="card hover:shadow-md transition-all border border-gray-200 hover:border-blue-200 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-teal-400 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1">
                              {name}
                              <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                            </h3>
                            <p className="text-xs text-blue-600 font-medium">Platform Creator</p>
                          </div>
                        </div>
                        <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl border text-xs font-bold ${scoreColor(match.matchScore)}`}>
                          <span className="text-base leading-tight">{match.matchScore}%</span>
                          <span className="font-normal opacity-80">{scoreLabel(match.matchScore)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 mb-3">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          {Number(match.creator.overall_rating).toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                          {match.creator.total_campaigns} campaigns
                        </span>
                      </div>
                      {match.analysis.strengths?.slice(0, 2).map((s, i) => (
                        <p key={i} className="text-xs text-green-700 flex items-start gap-1 mb-1">
                          <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {s}
                        </p>
                      ))}
                      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-end">
                        <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Full Analysis
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
              {totalPlatformPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button onClick={() => setPlatformPage(p => Math.max(1, p - 1))} disabled={platformPage === 1} className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                  <span className="text-sm text-gray-600">Page {platformPage} of {totalPlatformPages}</span>
                  <button onClick={() => setPlatformPage(p => Math.min(totalPlatformPages, p + 1))} disabled={platformPage === totalPlatformPages} className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-16">
              <Users className="w-14 h-14 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">No Platform Creators Found</h3>
              <p className="text-gray-400 text-sm mt-1">No verified creators match this campaign yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── COMPARE TAB ────────────────────────────────────────────────── */}
      {tab === 'compare' && (
        <div>
          {compareLoading ? (
            <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" /></div>
          ) : compareData ? (
            <>
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-semibold text-purple-700">Internet Discovery</h3>
                  </div>
                  <p className="text-4xl font-bold text-purple-900">{compareData.summary.total_discovered}</p>
                  <p className="text-sm text-purple-600 mt-1">Avg Score: <span className="font-bold">{compareData.summary.avg_discovered_score}%</span></p>
                </div>
                <div className="card bg-gradient-to-br from-blue-50 to-teal-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-700">Platform Creators</h3>
                  </div>
                  <p className="text-4xl font-bold text-blue-900">{compareData.summary.total_platform}</p>
                  <p className="text-sm text-blue-600 mt-1">Avg Score: <span className="font-bold">{compareData.summary.avg_platform_score}%</span></p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Internet results */}
                <div className="card">
                  <h3 className="text-base font-semibold text-purple-700 mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" /> Top Internet Creators
                  </h3>
                  <div className="space-y-2">
                    {compareData.discovered.map((c: any, i: number) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-400 w-6">#{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-500">{formatFollowers(c.followers_count)} • {c.region}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.profile_url && (
                            <a href={c.profile_url} target="_blank" rel="noopener noreferrer"
                              className="text-gray-400 hover:text-purple-600 transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <div className={`px-2 py-0.5 rounded text-xs font-bold border ${scoreColor(c.match_score)}`}>
                            {c.match_score}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platform results */}
                <div className="card">
                  <h3 className="text-base font-semibold text-blue-700 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" /> Top Platform Creators
                  </h3>
                  <div className="space-y-2">
                    {compareData.platform.map((c: any, i: number) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-400 w-6">#{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-500">{formatFollowers(c.followers_count)} • {c.region}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs font-bold border ${scoreColor(c.match_score)}`}>
                          {c.match_score}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-16">
              <BarChart3 className="w-14 h-14 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Comparison Data Yet</h3>
              <p className="text-gray-400 text-sm">Run Internet Search first, then come back to compare.</p>
              <button onClick={() => setTab('discovery')} className="mt-4 btn-primary inline-flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4" /> Go to Internet Search
              </button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
