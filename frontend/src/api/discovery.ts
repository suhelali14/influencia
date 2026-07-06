import api from './client'
import type { PaginationParams, PaginatedResponse } from './creators'

export interface DiscoveredCreator {
  id: string
  campaign_id: string
  name: string
  handle: string
  platform: 'instagram' | 'youtube' | 'tiktok' | 'twitter'
  profile_url?: string
  avatar_url?: string
  followers_count: number
  engagement_rate: number
  match_score: number
  semantic_score?: number
  heuristic_score?: number
  content_style?: string
  audience_summary?: string
  strengths?: string[]
  concerns?: string[]
  ai_summary?: string
  recent_content?: any
  region?: string
  categories?: string[]
  source?: string   // 'youtube_api' | 'google_serp' | 'twitter' | 'reddit' | 'seed_data'
  rank: number
  created_at: string
}

export interface JobStatus {
  id?: string
  status: 'none' | 'pending' | 'running' | 'done' | 'failed' | 'cancelled'
  progress: number
  total_found: number
  sources_used?: string[]
  triggered_by?: string
  error_msg?: string
  started_at?: string
  completed_at?: string
  created_at?: string
  message?: string
}

export interface DiscoveryCompare {
  campaign: { id: string; title: string; category: string; platform: string }
  discovered: Array<{
    id: string; name: string; handle: string; platform: string
    followers_count: number; engagement_rate: number; match_score: number
    source: 'internet_research'; profile_url?: string; region?: string
  }>
  platform: Array<{
    id: string; name: string; handle: string; platform: string
    followers_count: number; engagement_rate: number; match_score: number
    source: 'platform'; profile_url?: string; region?: string
  }>
  summary: {
    total_discovered: number; total_platform: number
    avg_discovered_score: number; avg_platform_score: number
  }
}

export const discoveryApi = {
  /** Trigger a background discovery job. Returns jobId — non-blocking. */
  searchCreators: async (campaignId: string, options?: { region?: string; forceRefresh?: boolean }) => {
    const { data } = await api.post<{ jobId: string; message: string; status: string }>(
      `/discovery/campaign/${campaignId}/search`,
      options || {}
    )
    return data
  },

  /** Get discovered creators from the similarity matrix (paginated). */
  getDiscoveredCreators: async (campaignId: string, params?: PaginationParams): Promise<PaginatedResponse<DiscoveredCreator>> => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    const qs = query.toString()
    const { data } = await api.get<PaginatedResponse<DiscoveredCreator>>(
      `/discovery/campaign/${campaignId}/creators${qs ? `?${qs}` : ''}`
    )
    return data
  },

  /** Get single discovered creator detail. */
  getCreatorDetail: async (campaignId: string, scoreId: string) => {
    const { data } = await api.get<DiscoveredCreator>(
      `/discovery/campaign/${campaignId}/creator/${scoreId}`
    )
    return data
  },

  /** Compare internet-discovered vs platform creators. */
  compareCreators: async (campaignId: string) => {
    const { data } = await api.get<DiscoveryCompare>(
      `/discovery/campaign/${campaignId}/compare`
    )
    return data
  },

  /** Get latest job status for a campaign — used by sync button. */
  getJobStatus: async (campaignId: string): Promise<JobStatus> => {
    const { data } = await api.get<JobStatus>(
      `/discovery/campaign/${campaignId}/job-status`
    )
    return data
  },

  /** Get global creator index statistics. */
  getIndexStats: async () => {
    const { data } = await api.get('/discovery/index/stats')
    return data
  },
}
