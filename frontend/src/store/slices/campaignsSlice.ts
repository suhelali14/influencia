import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { campaignsApi } from '../../api/campaigns'
import type { Campaign } from '../../api/campaigns'

interface CampaignsState {
  campaigns: Campaign[]
  activeCampaigns: Campaign[]
  currentCampaign: Campaign | null
  loading: boolean
  error: string | null
}

const initialState: CampaignsState = {
  campaigns: [],
  activeCampaigns: [],
  currentCampaign: null,
  loading: false,
  error: null,
}

// Async thunks
export const fetchCampaigns = createAsyncThunk(
  'campaigns/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await campaignsApi.getAll()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch campaigns')
    }
  }
)

export const fetchActiveCampaigns = createAsyncThunk(
  'campaigns/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      return await campaignsApi.getActive()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch active campaigns')
    }
  }
)

export const fetchCampaignById = createAsyncThunk(
  'campaigns/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await campaignsApi.getById(id)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch campaign')
    }
  }
)

export const fetchBrandCampaigns = createAsyncThunk(
  'campaigns/fetchByBrand',
  async (brandId: string, { rejectWithValue }) => {
    try {
      return await campaignsApi.getByBrand(brandId)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch brand campaigns')
    }
  }
)

export const createCampaign = createAsyncThunk(
  'campaigns/create',
  async (data: Partial<Campaign>, { rejectWithValue }) => {
    try {
      return await campaignsApi.create(data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create campaign')
    }
  }
)

export const updateCampaign = createAsyncThunk(
  'campaigns/update',
  async ({ id, data }: { id: string; data: Partial<Campaign> }, { rejectWithValue }) => {
    try {
      return await campaignsApi.update(id, data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update campaign')
    }
  }
)

export const searchCampaigns = createAsyncThunk(
  'campaigns/search',
  async (query: string, { rejectWithValue }) => {
    try {
      return await campaignsApi.search(query)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search campaigns')
    }
  }
)

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all campaigns
      .addCase(fetchCampaigns.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.loading = false
        // Handle paginated response: extract .data array
        const payload = action.payload as any
        state.campaigns = payload?.data ?? (Array.isArray(payload) ? payload : [])
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch active campaigns
      .addCase(fetchActiveCampaigns.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchActiveCampaigns.fulfilled, (state, action) => {
        state.loading = false
        const payload = action.payload as any
        state.activeCampaigns = payload?.data ?? (Array.isArray(payload) ? payload : [])
      })
      .addCase(fetchActiveCampaigns.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch campaign by id
      .addCase(fetchCampaignById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCampaignById.fulfilled, (state, action) => {
        state.loading = false
        state.currentCampaign = action.payload
      })
      .addCase(fetchCampaignById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch brand campaigns
      .addCase(fetchBrandCampaigns.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBrandCampaigns.fulfilled, (state, action) => {
        state.loading = false
        const payload = action.payload as any
        state.campaigns = payload?.data ?? (Array.isArray(payload) ? payload : [])
      })
      .addCase(fetchBrandCampaigns.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Create campaign
      .addCase(createCampaign.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createCampaign.fulfilled, (state, action) => {
        state.loading = false
        state.campaigns.unshift(action.payload)
        state.currentCampaign = action.payload
      })
      .addCase(createCampaign.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Update campaign
      .addCase(updateCampaign.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCampaign.fulfilled, (state, action) => {
        state.loading = false
        const index = state.campaigns.findIndex(c => c.id === action.payload.id)
        if (index !== -1) {
          state.campaigns[index] = action.payload
        }
        state.currentCampaign = action.payload
      })
      .addCase(updateCampaign.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Search campaigns
      .addCase(searchCampaigns.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(searchCampaigns.fulfilled, (state, action) => {
        state.loading = false
        const payload = action.payload as any
        state.campaigns = payload?.data ?? (Array.isArray(payload) ? payload : [])
      })
      .addCase(searchCampaigns.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError } = campaignsSlice.actions
export default campaignsSlice.reducer
