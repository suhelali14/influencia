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
    console.log('🔵 authApi: login() called')
    console.log('🌐 API URL: /v1/auth/login')
    console.log('📤 Request payload:', { email: credentials.email, password: '***' })
    
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials)
      console.log('✅ API Response status:', response.status)
      
      // Store auth data using session manager
      sessionManager.setAuth({
        access_token: response.data.access_token,
        session_id: response.data.session_id,
        user: response.data.user,
      })
      
      console.log('✅ Auth data stored in session manager')
      return response.data
    } catch (error) {
      console.error('❌ API Request failed:', error)
      throw error
    }
  },

  register: async (userData: {
    email: string
    password: string
    role: string
    first_name?: string
    last_name?: string
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData)
    
    // Store auth data using session manager
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
    } catch (error) {
      console.warn('Logout API call failed, clearing local session anyway:', error)
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

  // Helper to check if user is authenticated
  isAuthenticated: (): boolean => {
    return sessionManager.isAuthenticated()
  },

  // Get current user from storage
  getCurrentUser: () => {
    return sessionManager.getUser()
  },
}
