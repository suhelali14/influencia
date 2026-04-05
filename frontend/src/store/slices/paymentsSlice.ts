import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { paymentsApi } from '../../api/payments'
import type { Payment } from '../../api/payments'

interface PaymentsState {
  payments: Payment[]
  earnings: {
    total: number
    pending: number
    completed: number
  } | null
  loading: boolean
  error: string | null
}

const initialState: PaymentsState = {
  payments: [],
  earnings: null,
  loading: false,
  error: null,
}

// Async thunks
export const fetchPayments = createAsyncThunk(
  'payments/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await paymentsApi.getAll()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payments')
    }
  }
)

export const fetchCreatorPayments = createAsyncThunk(
  'payments/fetchByCreator',
  async (creatorId: string, { rejectWithValue }) => {
    try {
      return await paymentsApi.getByCreator(creatorId)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch creator payments')
    }
  }
)

export const fetchCreatorEarnings = createAsyncThunk(
  'payments/fetchEarnings',
  async (creatorId: string, { rejectWithValue }) => {
    try {
      return await paymentsApi.getCreatorEarnings(creatorId)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch earnings')
    }
  }
)

export const fetchCampaignPayments = createAsyncThunk(
  'payments/fetchByCampaign',
  async (campaignId: string, { rejectWithValue }) => {
    try {
      return await paymentsApi.getByCampaign(campaignId)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch campaign payments')
    }
  }
)

export const createPayment = createAsyncThunk(
  'payments/create',
  async (
    data: {
      campaign_id: string
      creator_id: string
      amount: number
      payment_type: string
      payment_gateway?: string
      metadata?: any
    },
    { rejectWithValue }
  ) => {
    try {
      return await paymentsApi.create(data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create payment')
    }
  }
)

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all payments
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false
        state.payments = action.payload
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch creator payments
      .addCase(fetchCreatorPayments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCreatorPayments.fulfilled, (state, action) => {
        state.loading = false
        state.payments = action.payload
      })
      .addCase(fetchCreatorPayments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch creator earnings
      .addCase(fetchCreatorEarnings.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCreatorEarnings.fulfilled, (state, action) => {
        state.loading = false
        state.earnings = action.payload
      })
      .addCase(fetchCreatorEarnings.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch campaign payments
      .addCase(fetchCampaignPayments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCampaignPayments.fulfilled, (state, action) => {
        state.loading = false
        state.payments = action.payload
      })
      .addCase(fetchCampaignPayments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Create payment
      .addCase(createPayment.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.loading = false
        state.payments.unshift(action.payload)
      })
      .addCase(createPayment.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError } = paymentsSlice.actions
export default paymentsSlice.reducer
