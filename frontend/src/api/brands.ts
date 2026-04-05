import api from './client'

export interface Brand {
  id: string
  user_id: string
  company_name: string
  website?: string
  industry?: string
  description?: string
  logo_url?: string
  phone?: string
  address?: string
  total_campaigns: number
  total_spent: number
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export const brandsApi = {
  create: async (data: {
    company_name: string
    website?: string
    industry?: string
    description?: string
    logo_url?: string
    phone?: string
    address?: string
  }) => {
    const response = await api.post<Brand>('/brands', data)
    return response.data
  },

  getAll: async () => {
    const response = await api.get<Brand[]>('/brands')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get<Brand>(`/brands/${id}`)
    return response.data
  },

  getMe: async () => {
    const response = await api.get<Brand>('/brands/me')
    return response.data
  },

  update: async (id: string, data: Partial<Brand>) => {
    const response = await api.patch<Brand>(`/brands/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    await api.delete(`/brands/${id}`)
  },
}
