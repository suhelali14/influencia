import axios from 'axios'
import { sessionManager } from '../lib/sessionManager'
import { logger } from '../lib/logger'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token, session ID, and request ID to requests
api.interceptors.request.use((config) => {
  // Generate correlation Request ID for distributed logging
  const requestId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
    
  config.headers['X-Request-ID'] = requestId;

  logger.info(`📡 API REQUEST [Req-ID: ${requestId}]`, {
    url: config.url,
    method: config.method?.toUpperCase(),
    params: config.params,
    data: config.data ? { ...config.data, password: '***', confirmPassword: '***' } : undefined,
  });
  
  // Add session ID (preferred for session-based auth)
  const sessionId = sessionManager.getSessionId()
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId
  }

  // Also add JWT token for backward compatibility
  const token = sessionManager.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Handle responses and trace performance/errors
api.interceptors.response.use(
  (response) => {
    const requestId = response.config.headers['X-Request-ID'] || 'unknown';
    
    logger.success(`✅ API RESPONSE SUCCESS [Req-ID: ${requestId}]`, {
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      status: response.status,
      data: response.data,
    });
    
    return response
  },
  (error) => {
    const config = error.config || {};
    const requestId = config.headers ? config.headers['X-Request-ID'] : 'unknown';
    const status = error.response ? error.response.status : 'network_error';
    const responseData = error.response ? error.response.data : null;

    logger.error(`❌ API RESPONSE FAILURE [Req-ID: ${requestId}]`, {
      url: config.url,
      method: config.method?.toUpperCase(),
      status: status,
      error: error.message,
      data: responseData,
    });
    
    if (error.response?.status === 401) {
      logger.warn('🔴 401 Unauthorized - Clearing auth and redirecting to login');
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
