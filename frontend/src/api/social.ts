import api from './client'

export interface SocialAccount {
  id: string
  creator_id: string
  platform: 'instagram' | 'youtube' | 'tiktok' | 'twitter'
  platform_user_id: string
  username: string
  followers_count: number
  engagement_rate: number
  metrics?: {
    posts?: number
    avg_likes?: number
    avg_comments?: number
    avg_views?: number
    quality_score?: number
    [key: string]: any
  }
  is_connected: boolean
  last_synced_at?: string
  token_expires_at?: string
  created_at: string
  updated_at: string
}

export interface SyncResult {
  success: boolean
  platform: string
  metrics?: any
  error?: string
  synced_at: string
}

export interface SyncAllResult {
  success: boolean
  message: string
  results: SyncResult[]
  connected_count: number
  connected_platforms?: string[]
}

export interface ConnectedPlatformsResponse {
  connected: {
    platform: string
    username: string
    last_synced_at: string | null
    followers_count: number
  }[]
  disconnected: string[]
}

export interface AggregatedStats {
  total_followers: number
  total_reach: number
  avg_engagement_rate: number
  weighted_engagement_rate: number
  platforms_connected: number
  primary_platform: string | null
  overall_quality_score: number
  by_platform: Record<string, any>
}

export interface MetricsHistory {
  id: string
  social_account_id: string
  followers_count: number
  engagement_rate: number
  impressions?: number
  reach?: number
  avg_likes?: number
  avg_comments?: number
  avg_views?: number
  quality_score?: number
  recorded_at: string
}

export const socialApi = {
  // =====================================================
  // PLATFORM CONNECTION
  // =====================================================
  
  /**
   * Get list of connected and disconnected platforms
   */
  getConnectedPlatforms: async () => {
    const { data } = await api.get<ConnectedPlatformsResponse>('/social/connected-platforms')
    return data
  },

  /**
   * Check if a specific platform is connected
   */
  isPlatformConnected: async (platform: string): Promise<boolean> => {
    const { connected } = await socialApi.getConnectedPlatforms()
    return connected.some(p => p.platform === platform)
  },

  // =====================================================
  // MANUAL CONNECT (Legacy)
  // =====================================================
  connect: async (data: {
    platform: string
    access_token: string
    refresh_token?: string
    platform_user_id: string
    username: string
    followers_count?: number
    engagement_rate?: number
    metrics?: any
  }) => {
    const response = await api.post<SocialAccount>('/social/connect', data)
    return response.data
  },

  disconnect: async (platform: string) => {
    await api.delete(`/social/disconnect/${platform}`)
  },

  getAccounts: async () => {
    const { data } = await api.get<SocialAccount[]>('/social/accounts')
    return data
  },

  getStats: async () => {
    const { data } = await api.get('/social/stats')
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get<SocialAccount>(`/social/${id}`)
    return data
  },

  // =====================================================
  // OAUTH ENDPOINTS
  // =====================================================
  
  /**
   * Get OAuth authorization URL for a platform
   * Opens the platform's OAuth consent screen
   */
  getOAuthUrl: async (platform: string, useGraphApi?: boolean) => {
    const params = new URLSearchParams()
    if (useGraphApi) params.append('useGraphApi', 'true')
    
    const { data } = await api.get<{ authUrl: string; state: string }>(
      `/oauth/${platform}/auth?${params.toString()}`
    )
    return data
  },

  /**
   * Refresh access token for a platform
   */
  refreshToken: async (platform: string) => {
    const { data } = await api.post<SocialAccount>(`/oauth/${platform}/refresh`)
    return data
  },

  /**
   * Revoke access and disconnect a platform
   */
  revokeAccess: async (platform: string) => {
    await api.post(`/oauth/${platform}/revoke`)
  },

  // =====================================================
  // SYNC ENDPOINTS
  // =====================================================

  /**
   * Sync metrics for a specific platform (only if connected)
   */
  syncPlatform: async (platform: string): Promise<SyncResult> => {
    // First check if platform is connected
    const isConnected = await socialApi.isPlatformConnected(platform)
    if (!isConnected) {
      return {
        success: false,
        platform,
        error: `${platform} is not connected. Please connect it first.`,
        synced_at: new Date().toISOString(),
      }
    }
    
    const { data } = await api.post<SyncResult>(`/social/sync/${platform}`)
    return data
  },

  /**
   * Sync metrics for all connected platforms
   */
  syncAll: async (): Promise<SyncAllResult> => {
    const { data } = await api.post<SyncAllResult>('/social/sync/all')
    return data
  },

  /**
   * Smart sync - only syncs connected platforms and returns detailed status
   */
  smartSync: async (): Promise<{
    synced: SyncResult[]
    skipped: string[]
    message: string
  }> => {
    const { connected, disconnected } = await socialApi.getConnectedPlatforms()
    
    if (connected.length === 0) {
      return {
        synced: [],
        skipped: disconnected,
        message: 'No platforms connected. Please connect at least one social media account.',
      }
    }
    
    const syncResult = await socialApi.syncAll()
    
    return {
      synced: syncResult.results,
      skipped: disconnected,
      message: syncResult.message,
    }
  },

  /**
   * Get aggregated stats across all platforms
   */
  getAggregatedStats: async () => {
    const { data } = await api.get<AggregatedStats>('/social/aggregated-stats')
    return data
  },

  /**
   * Get historical metrics data
   */
  getMetricsHistory: async (platform?: string, days: number = 30) => {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    params.append('days', days.toString())
    
    const { data } = await api.get<MetricsHistory[]>(`/social/metrics/history?${params.toString()}`)
    return data
  },
}
