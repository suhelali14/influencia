import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import campaignsReducer from './slices/campaignsSlice'
import creatorsReducer from './slices/creatorsSlice'
import brandsReducer from './slices/brandsSlice'
import socialReducer from './slices/socialSlice'
import paymentsReducer from './slices/paymentsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    campaigns: campaignsReducer,
    creators: creatorsReducer,
    brands: brandsReducer,
    social: socialReducer,
    payments: paymentsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
