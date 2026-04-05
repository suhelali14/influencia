import api from './client'

export interface Creator {
  id: string
  user_id: string
  bio?: string
  phone?: string
  location?: string
  avatar_url?: string
  social_links?: {
    instagram?: string
    youtube?: string
    tiktok?: string
    twitter?: string
  }
  overall_rating: number
  total_campaigns: number
  total_earnings: number
  categories: string[]
  languages: string[]
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
    first_name: string
    last_name: string
    role: string
  }
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export const creatorsApi = {
  create: async (data: Partial<Creator>) => {
    const response = await api.post<Creator>('/creators', data)
    return response.data
  },

  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Creator>> => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    if (params?.sortBy) query.set('sortBy', params.sortBy)
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder)
    const qs = query.toString()
    const { data } = await api.get<PaginatedResponse<Creator>>(`/creators${qs ? `?${qs}` : ''}`)
    // Backward compat: if backend returns an array (old API), wrap it
    if (Array.isArray(data)) {
      return { data: data as unknown as Creator[], meta: { page: 1, pageSize: data.length, totalCount: data.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }
    }
    return data
  },

  search: async (query: string, params?: PaginationParams): Promise<PaginatedResponse<Creator>> => {
    const qs = new URLSearchParams({ q: query })
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    const { data } = await api.get<PaginatedResponse<Creator>>(`/creators/search?${qs.toString()}`)
    if (Array.isArray(data)) {
      return { data: data as unknown as Creator[], meta: { page: 1, pageSize: data.length, totalCount: data.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }
    }
    return data
  },

  getMe: async () => {
    const { data } = await api.get<Creator>('/creators/me')
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get<Creator>(`/creators/${id}`)
    return data
  },

  update: async (id: string, data: Partial<Creator>) => {
    const response = await api.patch<Creator>(`/creators/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    await api.delete(`/creators/${id}`)
  },

  getCreatorStats: async () => {
    const { data } = await api.get('/creators/me/stats')
    return data
  },

  getRecentCollaborations: async (limit: number = 5) => {
    const { data } = await api.get(`/creators/me/collaborations?limit=${limit}&recent=true`)
    return data
  },

  getRecommendedCampaigns: async () => {
    const { data } = await api.get('/creators/me/recommended-campaigns')
    return data
  },

  getCollaborationDetail: async (id: string) => {
    const { data } = await api.get(`/creators/collaborations/${id}`)
    return data
  },

  acceptCollaboration: async (id: string, counterOffer?: number) => {
    const { data } = await api.post(`/creators/collaborations/${id}/accept`, {
      counter_offer: counterOffer,
    })
    return data
  },

  rejectCollaboration: async (id: string, reason: string) => {
    const { data } = await api.post(`/creators/collaborations/${id}/reject`, {
      reason,
    })
    return data
  },

  generateAIReport: async (id: string) => {
    const { data } = await api.post(`/creators/collaborations/${id}/generate-ai-report`)
    return data
  },
}
