import api from './client'
import type { Creator, PaginationParams, PaginatedResponse } from './creators'
import type { Campaign } from './campaigns'

export interface MatchAnalysis {
  score: number
  reasons: string[]
  strengths: string[]
  concerns: string[]
  audienceOverlap: number
  budgetFit: string
  experienceLevel: string
  estimatedROI: number
}

export interface CreatorMatch {
  creator: Creator
  matchScore: number
  analysis: MatchAnalysis
  rank: number
}

export interface AIAnalysis {
  id: number
  campaign_id: string
  creator_id: string
  match_score: number
  ml_match_score?: number
  dl_match_score?: number
  estimated_roi?: number
  success_probability?: number
  predicted_engagement?: number
  audience_overlap?: number
  strengths: string[]
  concerns: string[]
  reasons: string[]
  ai_summary?: string
  ai_recommendations?: string[]
  full_report?: string
  risk_assessment?: {
    risk_level: string
    risk_factors: string[]
    mitigation_strategies: string[]
  }
  model_version?: string
  confidence_level?: string
  created_at: string
  updated_at: string
}

export interface DetailedAnalysis {
  creator: Creator
  campaign: Campaign
  analysis: MatchAnalysis
  recommendations: string[]
  comparisons: {
    industryAverageBudget: number
    industryAverageReach: number
    creatorPositioning: string
  }
  aiAnalysis?: AIAnalysis
}

export interface Collaboration {
  id: string
  campaign_id: string
  creator_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
  proposed_budget?: number
  message?: string
  deliverables?: any
  deadline?: string
  rejection_reason?: string
  payment_completed: boolean
  created_at: string
  updated_at: string
  creator?: Creator
  campaign?: Campaign
}

export const matchingApi = {
  findCreatorsForCampaign: async (campaignId: string, params?: PaginationParams): Promise<PaginatedResponse<CreatorMatch>> => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    const qs = query.toString()
    const { data } = await api.get<PaginatedResponse<CreatorMatch>>(
      `/matching/campaign/${campaignId}/creators${qs ? `?${qs}` : ''}`
    )
    // Backward compat: if backend returns an array (old API), wrap it
    if (Array.isArray(data)) {
      const arr = data as unknown as CreatorMatch[]
      return { data: arr, meta: { page: 1, pageSize: arr.length, totalCount: arr.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }
    }
    return data
  },

  getDetailedAnalysis: async (campaignId: string, creatorId: string) => {
    const { data } = await api.get<DetailedAnalysis>(
      `/matching/campaign/${campaignId}/creator/${creatorId}/analysis`
    )
    return data
  },

  sendCollaborationRequest: async (
    campaignId: string,
    creatorId: string,
    requestData: {
      proposed_budget?: number
      message?: string
      deliverables?: any
      deadline?: string
    }
  ) => {
    const { data } = await api.post<Collaboration>(
      `/matching/campaign/${campaignId}/creator/${creatorId}/request`,
      requestData
    )
    return data
  },

  getCollaborations: async (campaignId: string) => {
    const { data } = await api.get<Collaboration[]>(`/matching/campaign/${campaignId}/collaborations`)
    return data
  },

  getRecommendedCampaigns: async (creatorId: string) => {
    const { data } = await api.get(`/matching/creator/${creatorId}/campaigns`)
    return data
  },

  downloadPDFReport: async (campaignId: string, creatorId: string) => {
    const response = await api.get(
      `/matching/campaign/${campaignId}/creator/${creatorId}/download-report`,
      {
        responseType: 'blob',
      }
    )
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    
    // Get filename from content-disposition header or use default
    const contentDisposition = response.headers['content-disposition']
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : `Influencia_AI_Report_${new Date().toISOString().split('T')[0]}.pdf`
    
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}

// Named exports for convenience
export const findCreatorsForCampaign = matchingApi.findCreatorsForCampaign
export const getDetailedAnalysis = matchingApi.getDetailedAnalysis
export const sendCollaborationRequest = matchingApi.sendCollaborationRequest
export const getCollaborations = matchingApi.getCollaborations
export const getRecommendedCampaigns = matchingApi.getRecommendedCampaigns
export const downloadPDFReport = matchingApi.downloadPDFReport
