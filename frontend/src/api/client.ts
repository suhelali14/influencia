import axios from 'axios'
import { sessionManager } from '../lib/sessionManager'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token and session ID to requests
api.interceptors.request.use((config) => {
  console.log('🔵 Axios Interceptor: Request')
  console.log('📍 URL:', config.url)
  console.log('🔧 Method:', config.method)
  
  // Add session ID (preferred for session-based auth)
  const sessionId = sessionManager.getSessionId()
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId
    console.log('🔑 Session ID added to request')
  }

  // Also add JWT token for backward compatibility
  const token = sessionManager.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('🔑 Token added to request')
  }
  
  if (!sessionId && !token) {
    console.log('⚠️ No authentication credentials found')
  }

  return config
})

// Handle 401 errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ Axios Interceptor: Response Success')
    console.log('📍 URL:', response.config.url)
    console.log('📊 Status:', response.status)
    return response
  },
  (error) => {
    console.error('❌ Axios Interceptor: Response Error')
    console.error('📍 URL:', error.config?.url)
    console.error('📊 Status:', error.response?.status)
    console.error('📦 Error data:', error.response?.data)
    
    if (error.response?.status === 401) {
      console.log('🔴 401 Unauthorized - Clearing auth and redirecting to login')
      sessionManager.clearAuth()
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
