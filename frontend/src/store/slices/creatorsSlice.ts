import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { creatorsApi } from '../../api/creators'
import type { Creator } from '../../api/creators'

interface CreatorsState {
  creators: Creator[]
  currentCreator: Creator | null
  loading: boolean
  error: string | null
}

const initialState: CreatorsState = {
  creators: [],
  currentCreator: null,
  loading: false,
  error: null,
}

// Async thunks
export const fetchCreators = createAsyncThunk(
  'creators/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await creatorsApi.getAll()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch creators')
    }
  }
)

export const fetchMyCreatorProfile = createAsyncThunk(
  'creators/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      return await creatorsApi.getMe()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile')
    }
  }
)

export const createCreatorProfile = createAsyncThunk(
  'creators/create',
  async (data: Partial<Creator>, { rejectWithValue }) => {
    try {
      return await creatorsApi.create(data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create profile')
    }
  }
)

export const updateCreatorProfile = createAsyncThunk(
  'creators/update',
  async ({ id, data }: { id: string; data: Partial<Creator> }, { rejectWithValue }) => {
    try {
      return await creatorsApi.update(id, data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile')
    }
  }
)

export const searchCreators = createAsyncThunk(
  'creators/search',
  async (query: string, { rejectWithValue }) => {
    try {
      return await creatorsApi.search(query)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search creators')
    }
  }
)

const creatorsSlice = createSlice({
  name: 'creators',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all creators
      .addCase(fetchCreators.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCreators.fulfilled, (state, action) => {
        state.loading = false
        state.creators = action.payload
      })
      .addCase(fetchCreators.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch my profile
      .addCase(fetchMyCreatorProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyCreatorProfile.fulfilled, (state, action) => {
        state.loading = false
        state.currentCreator = action.payload
      })
      .addCase(fetchMyCreatorProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Create profile
      .addCase(createCreatorProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createCreatorProfile.fulfilled, (state, action) => {
        state.loading = false
        state.currentCreator = action.payload
      })
      .addCase(createCreatorProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Update profile
      .addCase(updateCreatorProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCreatorProfile.fulfilled, (state, action) => {
        state.loading = false
        state.currentCreator = action.payload
      })
      .addCase(updateCreatorProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Search creators
      .addCase(searchCreators.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(searchCreators.fulfilled, (state, action) => {
        state.loading = false
        state.creators = action.payload
      })
      .addCase(searchCreators.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError } = creatorsSlice.actions
export default creatorsSlice.reducer
