import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { socialApi } from '../../api/social'
import type { SocialAccount, AggregatedStats, SyncResult } from '../../api/social'

interface SocialState {
  accounts: SocialAccount[]
  aggregatedStats: AggregatedStats | null
  loading: boolean
  syncing: boolean
  error: string | null
}

const initialState: SocialState = {
  accounts: [],
  aggregatedStats: null,
  loading: false,
  syncing: false,
  error: null,
}

// Async thunks
export const fetchSocialAccounts = createAsyncThunk(
  'social/fetchAccounts',
  async (_, { rejectWithValue }) => {
    try {
      return await socialApi.getAccounts()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch social accounts')
    }
  }
)

export const fetchAggregatedStats = createAsyncThunk(
  'social/fetchAggregatedStats',
  async (_, { rejectWithValue }) => {
    try {
      return await socialApi.getAggregatedStats()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch aggregated stats')
    }
  }
)

export const connectSocialAccount = createAsyncThunk(
  'social/connect',
  async (
    data: {
      platform: string
      access_token: string
      refresh_token?: string
      platform_user_id: string
      username: string
      followers_count?: number
      engagement_rate?: number
    },
    { rejectWithValue }
  ) => {
    try {
      return await socialApi.connect(data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to connect account')
    }
  }
)

export const disconnectSocialAccount = createAsyncThunk(
  'social/disconnect',
  async (platform: string, { rejectWithValue }) => {
    try {
      await socialApi.disconnect(platform)
      return platform
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to disconnect account')
    }
  }
)

export const syncSocialAccount = createAsyncThunk(
  'social/syncPlatform',
  async (platform: string, { rejectWithValue }) => {
    try {
      const result = await socialApi.syncPlatform(platform)
      if (!result.success) {
        return rejectWithValue(result.error || 'Sync failed')
      }
      return result
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync account')
    }
  }
)

export const syncAllAccounts = createAsyncThunk(
  'social/syncAll',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const results = await socialApi.syncAll()
      // Refresh accounts after sync
      dispatch(fetchSocialAccounts())
      return results
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync accounts')
    }
  }
)

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch accounts
      .addCase(fetchSocialAccounts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSocialAccounts.fulfilled, (state, action) => {
        state.loading = false
        state.accounts = action.payload
      })
      .addCase(fetchSocialAccounts.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch aggregated stats
      .addCase(fetchAggregatedStats.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAggregatedStats.fulfilled, (state, action) => {
        state.loading = false
        state.aggregatedStats = action.payload
      })
      .addCase(fetchAggregatedStats.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Connect account
      .addCase(connectSocialAccount.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(connectSocialAccount.fulfilled, (state, action) => {
        state.loading = false
        state.accounts.push(action.payload)
      })
      .addCase(connectSocialAccount.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Disconnect account
      .addCase(disconnectSocialAccount.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(disconnectSocialAccount.fulfilled, (state, action) => {
        state.loading = false
        state.accounts = state.accounts.filter((acc) => acc.platform !== action.payload)
      })
      .addCase(disconnectSocialAccount.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Sync single account
      .addCase(syncSocialAccount.pending, (state) => {
        state.syncing = true
        state.error = null
      })
      .addCase(syncSocialAccount.fulfilled, (state, action) => {
        state.syncing = false
        // Update the account in the list if metrics changed
        const result = action.payload as SyncResult
        if (result.success && result.metrics) {
          const accountIndex = state.accounts.findIndex(acc => acc.platform === result.platform)
          if (accountIndex !== -1) {
            state.accounts[accountIndex] = {
              ...state.accounts[accountIndex],
              followers_count: result.metrics.followers_count || state.accounts[accountIndex].followers_count,
              engagement_rate: result.metrics.engagement_rate || state.accounts[accountIndex].engagement_rate,
              last_synced_at: result.synced_at,
            }
          }
        }
      })
      .addCase(syncSocialAccount.rejected, (state, action) => {
        state.syncing = false
        state.error = action.payload as string
      })
      // Sync all accounts
      .addCase(syncAllAccounts.pending, (state) => {
        state.syncing = true
        state.error = null
      })
      .addCase(syncAllAccounts.fulfilled, (state) => {
        state.syncing = false
      })
      .addCase(syncAllAccounts.rejected, (state, action) => {
        state.syncing = false
        state.error = action.payload as string
      })
  },
})

export const { clearError } = socialSlice.actions
export default socialSlice.reducer
