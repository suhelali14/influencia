import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { brandsApi } from '../../api/brands'
import type { Brand } from '../../api/brands'

interface BrandsState {
  brands: Brand[]
  currentBrand: Brand | null
  loading: boolean
  error: string | null
}

const initialState: BrandsState = {
  brands: [],
  currentBrand: null,
  loading: false,
  error: null,
}

// Async thunks
export const fetchBrands = createAsyncThunk(
  'brands/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await brandsApi.getAll()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch brands')
    }
  }
)

export const fetchMyBrandProfile = createAsyncThunk(
  'brands/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      return await brandsApi.getMe()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch brand profile')
    }
  }
)

export const createBrandProfile = createAsyncThunk(
  'brands/create',
  async (
    data: {
      company_name: string
      website?: string
      industry?: string
      description?: string
      logo_url?: string
      phone?: string
      address?: string
    },
    { rejectWithValue }
  ) => {
    try {
      return await brandsApi.create(data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create brand profile')
    }
  }
)

export const updateBrandProfile = createAsyncThunk(
  'brands/update',
  async ({ id, data }: { id: string; data: Partial<Brand> }, { rejectWithValue }) => {
    try {
      return await brandsApi.update(id, data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update brand profile')
    }
  }
)

const brandsSlice = createSlice({
  name: 'brands',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all brands
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false
        state.brands = action.payload
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch my brand profile
      .addCase(fetchMyBrandProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyBrandProfile.fulfilled, (state, action) => {
        state.loading = false
        state.currentBrand = action.payload
      })
      .addCase(fetchMyBrandProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Create brand profile
      .addCase(createBrandProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createBrandProfile.fulfilled, (state, action) => {
        state.loading = false
        state.currentBrand = action.payload
      })
      .addCase(createBrandProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Update brand profile
      .addCase(updateBrandProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateBrandProfile.fulfilled, (state, action) => {
        state.loading = false
        state.currentBrand = action.payload
      })
      .addCase(updateBrandProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError } = brandsSlice.actions
export default brandsSlice.reducer
