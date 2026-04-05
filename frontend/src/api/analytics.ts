import api from './client'

// =====================================================
// INTERFACES
// =====================================================

export interface PlatformAnalytics {
  platform: string
  followers: number
  engagement_rate: number
  total_posts: number
  avg_likes: number
  avg_comments: number
  avg_views: number
  growth_rate: number
  quality_score: number
  top_content: TopContent[]
  trend: 'up' | 'down' | 'stable'
}

export interface TopContent {
  id: string
  title: string
  thumbnail?: string
  views: number
  likes: number
  comments: number
  engagement_rate: number
  published_at: string
  url?: string
}

export interface CampaignAnalytics {
  total_campaigns: number
  active_campaigns: number
  completed_campaigns: number
  upcoming_campaigns: number
  total_earnings: number
  avg_campaign_value: number
  success_rate: number
  campaigns: CampaignDetail[]
}

export interface CampaignDetail {
  id: string
  title: string
  brand_name: string
  brand_logo?: string
  platform: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'pending'
  budget: number
  earnings: number
  start_date: string
  end_date: string
  deliverables_completed: number
  deliverables_total: number
  performance_score?: number
}

export interface EarningsAnalytics {
  total_earnings: number
  pending_earnings: number
  this_month: number
  last_month: number
  growth_rate: number
  earnings_by_platform: Record<string, number>
  earnings_by_month: EarningsMonth[]
  top_campaigns: {
    id: string
    title: string
    brand_name: string
    earnings: number
  }[]
}

export interface EarningsMonth {
  month: string
  year: number
  earnings: number
  campaigns_count: number
}

export interface EngagementTrend {
  date: string
  engagement_rate: number
  followers: number
  likes: number
  comments: number
  views: number
}

// Backend response matches this flat structure
export interface OverallAnalytics {
  // Summary stats (flat, not nested)
  total_followers: number
  total_reach: number
  avg_engagement_rate: number
  platforms_connected: number
  total_campaigns: number
  active_campaigns: number
  completed_campaigns: number
  total_earnings: number
  pending_earnings: number
  
  // Platform breakdown
  platforms: PlatformAnalytics[]
  
  // Campaigns
  past_campaigns: CampaignDetail[]
  active_campaigns_list: CampaignDetail[]
  upcoming_campaigns: CampaignDetail[]
  
  // Performance metrics
  monthly_earnings: { month: string; amount: number }[]
  engagement_trend: { date: string; rate: number }[]
  followers_trend: { date: string; count: number }[]
  
  // Top performing content
  top_content: {
    platform: string
    title: string
    views: number
    likes: number
    comments: number
    thumbnail_url?: string
    url?: string
  }[]
  
  // AI insights
  insights: {
    type: 'success' | 'warning' | 'info'
    message: string
  }[]
}

export interface FollowerGrowth {
  date: string
  instagram?: number
  youtube?: number
  tiktok?: number
  twitter?: number
  total: number
}

// =====================================================
// ANALYTICS API
// =====================================================

export const analyticsApi = {
  /**
   * Get comprehensive analytics overview
   * Returns all analytics data in one call
   */
  getOverview: async (): Promise<OverallAnalytics> => {
    const { data } = await api.get<OverallAnalytics>('/analytics/overview')
    return data
  },

  /**
   * Get platform-specific analytics
   */
  getPlatformAnalytics: async (platform: string): Promise<PlatformAnalytics> => {
    const { data } = await api.get<PlatformAnalytics>(`/analytics/platform/${platform}`)
    return data
  },

  /**
   * Get campaign analytics with filters
   */
  getCampaignAnalytics: async (filters?: {
    status?: string
    platform?: string
    dateRange?: { start: string; end: string }
  }): Promise<CampaignAnalytics> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.platform) params.append('platform', filters.platform)
    if (filters?.dateRange) {
      params.append('start_date', filters.dateRange.start)
      params.append('end_date', filters.dateRange.end)
    }
    
    const { data } = await api.get<CampaignAnalytics>(`/analytics/campaigns?${params.toString()}`)
    return data
  },

  /**
   * Get earnings analytics
   */
  getEarningsAnalytics: async (period?: 'week' | 'month' | 'quarter' | 'year' | 'all'): Promise<EarningsAnalytics> => {
    const params = period ? `?period=${period}` : ''
    const { data } = await api.get<EarningsAnalytics>(`/analytics/earnings${params}`)
    return data
  },

  /**
   * Get engagement trends over time
   */
  getEngagementTrends: async (days: number = 30): Promise<EngagementTrend[]> => {
    const { data } = await api.get<EngagementTrend[]>(`/analytics/trends?days=${days}`)
    return data
  },

  /**
   * Get follower growth over time
   */
  getFollowerGrowth: async (days: number = 30): Promise<FollowerGrowth[]> => {
    const { data } = await api.get<FollowerGrowth[]>(`/analytics/followers/growth?days=${days}`)
    return data
  },

  /**
   * Get AI-powered insights and recommendations
   */
  getAiInsights: async (): Promise<{ insights: string[]; recommendations: string[] }> => {
    const { data } = await api.get<{ insights: string[]; recommendations: string[] }>('/analytics/ai-insights')
    return data
  },

  /**
   * Export analytics report
   */
  exportReport: async (format: 'pdf' | 'csv' | 'excel' = 'pdf'): Promise<Blob> => {
    const { data } = await api.get(`/analytics/export?format=${format}`, {
      responseType: 'blob'
    })
    return data
  },

  /**
   * Get comparison with previous period
   */
  getComparison: async (period: 'week' | 'month' | 'quarter'): Promise<{
    current: OverallAnalytics
    previous: OverallAnalytics
    changes: {
      followers_change: number
      engagement_change: number
      earnings_change: number
      reach_change: number
    }
  }> => {
    const { data } = await api.get(`/analytics/compare?period=${period}`)
    return data
  }
}
