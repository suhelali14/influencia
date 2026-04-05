import api from './client'
import type { PaginationParams, PaginatedResponse } from './creators'

export interface Campaign {
  id: string
  brand_id: string
  title: string
  description: string
  platform: 'instagram' | 'youtube' | 'tiktok' | 'twitter'
  category: string
  budget: number
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  requirements?: any
  target_audience?: any
  total_creators: number
  total_reach: number
  total_spent: number
  created_at: string
  updated_at: string
}

/** Helper to wrap raw array responses into paginated shape */
function wrapArray<T>(data: T[] | PaginatedResponse<T>): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    return { data, meta: { page: 1, pageSize: data.length, totalCount: data.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }
  }
  return data
}

export const campaignsApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Campaign>> => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    const q = qs.toString()
    const { data } = await api.get<PaginatedResponse<Campaign>>(`/campaigns${q ? `?${q}` : ''}`)
    return wrapArray(data)
  },

  getActive: async (params?: PaginationParams): Promise<PaginatedResponse<Campaign>> => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    const q = qs.toString()
    const { data } = await api.get<PaginatedResponse<Campaign>>(`/campaigns/active${q ? `?${q}` : ''}`)
    return wrapArray(data)
  },

  search: async (query: string, params?: PaginationParams): Promise<PaginatedResponse<Campaign>> => {
    const qs = new URLSearchParams({ q: query })
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    const { data } = await api.get<PaginatedResponse<Campaign>>(`/campaigns/search?${qs.toString()}`)
    return wrapArray(data)
  },

  getByBrand: async (brandId: string) => {
    const { data } = await api.get<Campaign[]>(`/campaigns/brand/${brandId}`)
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get<Campaign>(`/campaigns/${id}`)
    return data
  },

  create: async (campaign: Partial<Campaign>) => {
    const { data } = await api.post<Campaign>('/campaigns', campaign)
    return data
  },

  update: async (id: string, campaign: Partial<Campaign>) => {
    const { data } = await api.patch<Campaign>(`/campaigns/${id}`, campaign)
    return data
  },

  delete: async (id: string) => {
    await api.delete(`/campaigns/${id}`)
  },
}
