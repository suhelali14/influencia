import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { 
  BarChart, TrendingUp, Users, Heart, DollarSign, 
  Calendar, Instagram, Youtube, ArrowUp, ArrowDown,
  Sparkles, Target, Eye, MessageCircle, ThumbsUp,
  Play, Clock, RefreshCw, Download, ChevronRight,
  Loader2, AlertCircle, Video, CheckCircle, Pause
} from 'lucide-react'
import { 
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart as RechartsBarChart, Bar
} from 'recharts'
import { analyticsApi, type OverallAnalytics, type CampaignDetail } from '../../api/analytics'
import { socialApi, type SocialAccount } from '../../api/social'

// Platform icons and colors
const platformConfigMap: Record<string, { icon: any; color: string; bgColor: string; gradient: string }> = {
  instagram: { 
    icon: Instagram, 
    color: '#E4405F', 
    bgColor: 'bg-pink-100',
    gradient: 'from-pink-500 to-purple-600'
  },
  youtube: { 
    icon: Youtube, 
    color: '#FF0000', 
    bgColor: 'bg-red-100',
    gradient: 'from-red-500 to-red-600'
  },
  tiktok: { 
    icon: Play, 
    color: '#000000', 
    bgColor: 'bg-gray-100',
    gradient: 'from-gray-800 to-black'
  },
  twitter: { 
    icon: MessageCircle, 
    color: '#1DA1F2', 
    bgColor: 'bg-blue-100',
    gradient: 'from-blue-400 to-blue-600'
  },
}

// Format large numbers
const formatNumber = (num: number | string): string => {
  const n = Number(num) || 0
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

// Format currency
const formatCurrency = (amount: number | string): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

// Get status color and icon for campaigns
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle }
    case 'completed':
      return { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: CheckCircle }
    case 'pending':
    case 'draft':
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Clock }
    case 'paused':
      return { color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Pause }
    case 'cancelled':
      return { color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle }
    default:
      return { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Clock }
  }
}

// Pie chart colors
const COLORS = ['#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6']

export default function CreatorAnalytics() {
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<OverallAnalytics | null>(null)
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [activeTab, setActiveTab] = useState<'overview' | 'platforms' | 'campaigns' | 'earnings'>('overview')
  const [syncing, setSyncing] = useState(false)

  // Load analytics data
  useEffect(() => {
    loadAnalytics()
  }, [selectedPeriod])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch real data from APIs
      const [analyticsData, accounts] = await Promise.all([
        analyticsApi.getOverview().catch(() => null),
        socialApi.getAccounts().catch(() => [])
      ])

      setSocialAccounts(accounts)
      
      if (analyticsData) {
        setAnalytics(analyticsData)
      } else {
        // Build minimal analytics from social accounts if backend analytics API is unavailable
        const totalFollowers = accounts.reduce((sum: number, acc: SocialAccount) => sum + Number(acc.followers_count || 0), 0)
        const avgEngagement = accounts.length > 0 
          ? accounts.reduce((sum: number, acc: SocialAccount) => sum + Number(acc.engagement_rate || 0), 0) / accounts.length 
          : 0

        setAnalytics({
          total_followers: totalFollowers,
          total_reach: Math.round(totalFollowers * 2.5),
          avg_engagement_rate: avgEngagement,
          platforms_connected: accounts.length,
          total_campaigns: 0,
          active_campaigns: 0,
          completed_campaigns: 0,
          total_earnings: 0,
          pending_earnings: 0,
          platforms: accounts.map((acc: SocialAccount) => ({
            platform: acc.platform,
            followers: acc.followers_count || 0,
            engagement_rate: acc.engagement_rate || 0,
            total_posts: acc.metrics?.posts || 0,
            avg_likes: acc.metrics?.avg_likes || 0,
            avg_comments: acc.metrics?.avg_comments || 0,
            avg_views: acc.metrics?.avg_views || 0,
            growth_rate: 0,
            quality_score: (acc.metrics as any)?.quality_score || 0,
            top_content: [],
            trend: 'stable' as const,
          })),
          past_campaigns: [],
          active_campaigns_list: [],
          upcoming_campaigns: [],
          monthly_earnings: [],
          engagement_trend: [],
          followers_trend: [],
          top_content: [],
          insights: accounts.length === 0
            ? [{ type: 'info' as const, message: '🔗 Connect your social media accounts to unlock analytics' }]
            : [{ type: 'info' as const, message: `📊 ${accounts.length} platform(s) connected with ${formatNumber(totalFollowers)} total followers` }],
        })
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Failed to load analytics. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Sync all platforms
  const handleSync = async () => {
    try {
      setSyncing(true)
      await socialApi.syncAll()
      await loadAnalytics()
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }

  // Platform distribution data for pie chart
  const platformDistribution = useMemo(() => {
    return socialAccounts.map(acc => ({
      name: acc.platform.charAt(0).toUpperCase() + acc.platform.slice(1),
      value: acc.followers_count || 0,
      platform: acc.platform,
    }))
  }, [socialAccounts])

  // Campaign status distribution
  const campaignStatusData = useMemo(() => {
    if (!analytics) return []
    return [
      { name: 'Active', value: analytics.active_campaigns || 0, color: '#10B981' },
      { name: 'Completed', value: analytics.completed_campaigns || 0, color: '#3B82F6' },
      { name: 'Upcoming', value: analytics.upcoming_campaigns?.length || 0, color: '#F59E0B' },
    ].filter(item => item.value > 0)
  }, [analytics])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your performance across all platforms</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 90 days</option>
            <option value="year">Last year</option>
          </select>
          
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>
          
          {/* Export Button */}
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-8 w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart },
          { id: 'platforms', label: 'Platforms', icon: Target },
          { id: 'campaigns', label: 'Campaigns', icon: Calendar },
          { id: 'earnings', label: 'Earnings', icon: DollarSign },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-primary-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* AI Insights Banner */}
      {analytics?.insights && analytics.insights.length > 0 && (
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {analytics.insights.map((insight, index) => (
                  <p key={index} className="text-white/90 text-sm">{insight.message}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Followers"
              value={formatNumber(analytics?.total_followers || 0)}
              icon={Users}
              color="blue"
              trend={5.2}
            />
            <StatCard
              label="Avg. Engagement"
              value={`${Number(analytics?.avg_engagement_rate || 0).toFixed(2)}%`}
              icon={Heart}
              color="pink"
              trend={-0.8}
            />
            <StatCard
              label="Total Reach"
              value={formatNumber(analytics?.total_reach || 0)}
              icon={Eye}
              color="green"
              trend={12.3}
            />
            <StatCard
              label="Platforms"
              value={analytics?.platforms_connected || 0}
              icon={Sparkles}
              color="purple"
              trend={3}
            />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Engagement Trend Chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Engagement Trend</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>Last 30 days</span>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.engagement_trend || []}>
                    <defs>
                      <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Engagement']}
                      labelFormatter={(value: string) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="engagement_rate" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      fill="url(#colorEngagement)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform Distribution */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Platform Distribution</h2>
                <span className="text-sm text-gray-500">{socialAccounts.length} connected</span>
              </div>
              {platformDistribution.length > 0 ? (
                <div className="h-72 flex items-center">
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {platformDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={platformConfigMap[entry.platform]?.color || COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatNumber(value)}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: 'none', 
                          borderRadius: '12px', 
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {platformDistribution.map((platform) => {
                      const config = platformConfigMap[platform.platform]
                      const Icon = config?.icon || Target
                      return (
                        <div key={platform.platform} className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config?.bgColor || 'bg-gray-100'}`}>
                            <Icon className="w-5 h-5" style={{ color: config?.color }} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{platform.name}</p>
                            <p className="text-sm text-gray-500">{formatNumber(platform.value)} followers</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center">
                  <div className="text-center">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No platforms connected yet</p>
                    <a href="/creator/social" className="text-primary-600 hover:underline text-sm mt-1 inline-block">
                      Connect your accounts →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Content Section */}
          {analytics?.top_content && analytics.top_content.length > 0 && (
            <div className="card mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Content</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {analytics.top_content.slice(0, 6).map((content, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">{content.platform}</span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">{content.title}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatNumber(content.views || 0)} views</span>
                      <span>{formatNumber(content.likes || 0)} likes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Platforms Tab */}
      {activeTab === 'platforms' && (
        <>
          <div className="grid gap-6">
            {socialAccounts.length > 0 ? (
              socialAccounts.map((account) => {
                const config = platformConfigMap[account.platform]
                const Icon = config?.icon || Target
                const platformData = analytics?.platforms.find(p => p.platform === account.platform)
                
                return (
                  <div key={account.id} className="card">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${config?.gradient || 'from-gray-400 to-gray-600'}`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                          </h3>
                          <p className="text-gray-500">@{account.username}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        (platformData?.trend === 'up') ? 'bg-green-100 text-green-700' : 
                        (platformData?.trend === 'down') ? 'bg-red-100 text-red-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {(platformData?.trend === 'up') ? <ArrowUp className="w-4 h-4" /> : 
                         (platformData?.trend === 'down') ? <ArrowDown className="w-4 h-4" /> : null}
                        {Number(platformData?.growth_rate || 0).toFixed(1)}% growth
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <MetricCard 
                        label="Followers" 
                        value={formatNumber(account.followers_count || 0)} 
                        icon={Users}
                      />
                      <MetricCard 
                        label="Engagement" 
                        value={`${Number(account.engagement_rate || 0).toFixed(2)}%`} 
                        icon={Heart}
                      />
                      <MetricCard 
                        label="Posts" 
                        value={account.metrics?.posts || 0} 
                        icon={Video}
                      />
                      <MetricCard 
                        label="Avg. Likes" 
                        value={formatNumber(account.metrics?.avg_likes || 0)} 
                        icon={ThumbsUp}
                      />
                      <MetricCard 
                        label="Avg. Comments" 
                        value={formatNumber(account.metrics?.avg_comments || 0)} 
                        icon={MessageCircle}
                      />
                      <MetricCard 
                        label="Quality Score" 
                        value={`${account.metrics?.quality_score || 0}/100`} 
                        icon={Sparkles}
                      />
                    </div>
                    
                    {account.last_synced_at && (
                      <p className="text-xs text-gray-400 mt-4">
                        Last synced: {new Date(account.last_synced_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="card text-center py-16">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Platforms Connected</h3>
                <p className="text-gray-600 mb-6">Connect your social media accounts to see detailed analytics</p>
                <a href="/creator/social" className="btn-primary inline-flex items-center gap-2">
                  Connect Platforms
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <>
          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Campaigns"
              value={analytics?.total_campaigns || 0}
              icon={Target}
              color="blue"
            />
            <StatCard
              label="Active"
              value={analytics?.active_campaigns || 0}
              icon={Play}
              color="green"
            />
            <StatCard
              label="Completed"
              value={analytics?.completed_campaigns || 0}
              icon={CheckCircle}
              color="purple"
            />
            <StatCard
              label="Past Campaigns"
              value={analytics?.past_campaigns?.length || 0}
              icon={TrendingUp}
              color="pink"
            />
          </div>

          {/* Campaign Status Chart */}
          {campaignStatusData.length > 0 && (
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="card lg:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Status</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={campaignStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                      >
                        {campaignStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {campaignStatusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campaigns List */}
              <div className="card lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h3>
                {(analytics?.past_campaigns?.length || analytics?.active_campaigns_list?.length) ? (
                  <div className="space-y-3">
                    {[...(analytics?.active_campaigns_list || []), ...(analytics?.past_campaigns || [])].slice(0, 5).map((campaign) => (
                      <CampaignCard key={campaign.id} campaign={campaign as any} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No campaigns yet</p>
                    <a href="/creator/campaigns" className="text-primary-600 hover:underline text-sm">
                      Browse available campaigns →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!analytics?.past_campaigns?.length && !analytics?.active_campaigns_list?.length) && campaignStatusData.length === 0 && (
            <div className="card text-center py-16">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Campaigns Yet</h3>
              <p className="text-gray-600 mb-6">Start collaborating with brands to see your campaign analytics here</p>
              <a href="/creator/campaigns" className="btn-primary inline-flex items-center gap-2">
                Browse Campaigns
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && (
        <>
          {/* Earnings Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Earnings"
              value={formatCurrency(analytics?.total_earnings || 0)}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              label="Pending"
              value={formatCurrency(analytics?.pending_earnings || 0)}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              label="Completed"
              value={analytics?.completed_campaigns || 0}
              icon={CheckCircle}
              color="blue"
            />
            <StatCard
              label="Platforms"
              value={analytics?.platforms_connected || 0}
              icon={TrendingUp}
              color="purple"
            />
          </div>

          {/* Earnings Chart */}
          <div className="card mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Over Time</h3>
            {analytics?.monthly_earnings && analytics.monthly_earnings.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={analytics.monthly_earnings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickFormatter={(value: number) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="url(#colorGradient)" 
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No earnings data yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {analytics?.total_earnings === 0 && (
            <div className="card text-center py-16">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Earnings Yet</h3>
              <p className="text-gray-600 mb-6">Complete campaigns to start earning and see your analytics here</p>
              <a href="/creator/campaigns" className="btn-primary inline-flex items-center gap-2">
                Find Campaigns
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  trend 
}: { 
  label: string
  value: string | number
  icon: any
  color: 'blue' | 'pink' | 'green' | 'purple' | 'yellow'
  trend?: number
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    pink: 'bg-pink-100 text-pink-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  }

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(Number(trend)).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}

// Metric Card Component (smaller version)
function MetricCard({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string
  value: string | number
  icon: any
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <Icon className="w-5 h-5 text-gray-400 mx-auto mb-2" />
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

// Campaign Card Component
function CampaignCard({ campaign }: { campaign: CampaignDetail }) {
  const statusConfig = getStatusConfig(campaign.status)
  const StatusIcon = statusConfig.icon
  const config = platformConfigMap[campaign.platform]
  const PlatformIcon = config?.icon || Target

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config?.bgColor || 'bg-gray-200'}`}>
          <PlatformIcon className="w-5 h-5" style={{ color: config?.color }} />
        </div>
        <div>
          <p className="font-medium text-gray-900">{campaign.title}</p>
          <p className="text-sm text-gray-500">{campaign.brand_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
          <StatusIcon className="w-3 h-3" />
          {campaign.status}
        </div>
        <p className="font-medium text-gray-900">{formatCurrency(campaign.earnings || campaign.budget)}</p>
      </div>
    </div>
  )
}

