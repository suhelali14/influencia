import api from './client'
import { sessionManager } from '../lib/sessionManager'

export interface AuthResponse {
  user: {
    id: string
    email: string
    role: string
    first_name?: string
    last_name?: string
    [key: string]: any
  }
  access_token: string
  session_id: string
}

export interface ActiveSession {
  sessionId: string
  userId: string
  email: string
  role: string
  createdAt: number
  lastAccessedAt: number
  userAgent?: string
  ipAddress?: string
  isCurrent?: boolean
}

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    sessionManager.setAuth({
      access_token: response.data.access_token,
      session_id: response.data.session_id,
      user: response.data.user,
    })
    return response.data
  },

  register: async (userData: {
    email: string
    password: string
    role: string
    first_name?: string
    last_name?: string
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData)
    sessionManager.setAuth({
      access_token: response.data.access_token,
      session_id: response.data.session_id,
      user: response.data.user,
    })
    return response.data
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore API errors — always clear local session
    } finally {
      sessionManager.clearAuth()
    }
  },

  logoutAllDevices: async (): Promise<{ success: boolean; count: number }> => {
    const response = await api.post<{ success: boolean; count: number }>('/auth/logout-all')
    sessionManager.clearAuth()
    return response.data
  },

  getProfile: async () => {
    const { data } = await api.get('/auth/profile')
    return data
  },

  getActiveSessions: async (): Promise<ActiveSession[]> => {
    const { data } = await api.get<ActiveSession[]>('/auth/sessions')
    return data
  },

  revokeSession: async (sessionId: string): Promise<{ success: boolean }> => {
    const { data } = await api.delete<{ success: boolean }>(`/auth/sessions/${sessionId}`)
    return data
  },

  requestInvite: async (inviteData: {
    email: string
    company_name: string
    first_name?: string
    last_name?: string
  }) => {
    const { data } = await api.post('/auth/request-invite', inviteData)
    return data
  },

  onboardBrand: async (onboardData: {
    email: string
    company_name: string
    first_name: string
    last_name: string
  }) => {
    const { data } = await api.post('/auth/onboard-brand', onboardData)
    return data
  },

  verifyCreator: async (userId: string, isVerified: boolean) => {
    const { data } = await api.post(`/auth/verify-creator/${userId}`, { isVerified })
    return data
  },

  getInvites: async () => {
    const { data } = await api.get('/auth/invites')
    return data
  },

  isAuthenticated: (): boolean => {
    return sessionManager.isAuthenticated()
  },

  getCurrentUser: () => {
    return sessionManager.getUser()
  },
}
