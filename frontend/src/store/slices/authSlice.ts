import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../api/auth'
import { sessionManager } from '../../lib/sessionManager'

interface User {
  id: string
  email: string
  role: string
  first_name?: string
  last_name?: string
  avatar_url?: string
}

interface AuthState {
  user: User | null
  token: string | null
  sessionId: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

// Initialize state from session manager
const initialUser = sessionManager.getUser()
const initialToken = sessionManager.getToken()
const initialSessionId = sessionManager.getSessionId()

const initialState: AuthState = {
  user: initialUser as User | null,
  token: initialToken,
  sessionId: initialSessionId,
  isAuthenticated: sessionManager.isAuthenticated(),
  loading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('🔵 authSlice: Login thunk called')
      console.log('📧 Credentials:', { email: credentials.email, password: '***' })
      
      console.log('🌐 Calling API...')
      const response = await authApi.login(credentials)
      
      console.log('✅ API Response received with session_id')
      return response
    } catch (error: any) {
      console.error('❌ API Error:', error)
      console.error('❌ Error response:', error.response?.data)
      return rejectWithValue(error.response?.data?.message || 'Login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (
    data: { email: string; password: string; role: string; first_name?: string; last_name?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authApi.register(data)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed')
    }
  }
)

export const logoutAsync = createAsyncThunk('auth/logoutAsync', async () => {
  await authApi.logout()
  return true
})

export const fetchProfile = createAsyncThunk('auth/profile', async (_, { rejectWithValue }) => {
  try {
    const response = await authApi.getProfile()
    return response
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.sessionId = null
      state.isAuthenticated = false
      // Use session manager to clear auth
      sessionManager.clearAuth()
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.access_token
        state.sessionId = action.payload.session_id
        // Note: sessionManager.setAuth is already called in authApi.login
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.access_token
        state.sessionId = action.payload.session_id
        // Note: sessionManager.setAuth is already called in authApi.register
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Logout async
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.sessionId = null
        state.isAuthenticated = false
      })
      // Profile
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload
        sessionManager.updateUser(action.payload)
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer
