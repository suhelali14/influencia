import api from './client'

export interface PlanLimits {
  used: number
  limit: number
  percentage: number
}

export interface BillingStatus {
  brandId: string
  companyName: string
  subscription: {
    tier: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise'
    status: 'active' | 'inactive' | 'past_due' | 'trial'
    expiresAt: string | null
    razorpaySubscriptionId: string | null
  }
  usage: {
    campaigns: PlanLimits
    aiDiscoveries: PlanLimits
  }
  plans: Array<{
    id: string
    name: string
    price: number
    campaignLimit: number
    aiDiscoveryLimit: number
    features: string[]
    isCurrent: boolean
  }>
}

export interface SubscriptionCheckoutOptions {
  subscriptionId: string
  keyId: string
  amount: number
  name: string
  description: string
  customer: {
    name: string
    email: string
    contact: string
  }
}

export const billingApi = {
  /**
   * Get brand's active plan limits usage and all pricing choices.
   */
  getStatus: async () => {
    const { data } = await api.get<BillingStatus>('/billing/status')
    return data
  },

  /**
   * Create Razorpay Checkout parameters for subscription upgrade.
   */
  subscribe: async (planId: string) => {
    const { data } = await api.post<SubscriptionCheckoutOptions>('/billing/subscribe', { planId })
    return data
  },

  /**
   * Send Razorpay callback response payload to verify and activate.
   */
  verifyPayment: async (payload: {
    razorpay_payment_id: string
    razorpay_subscription_id: string
    razorpay_signature: string
  }) => {
    const { data } = await api.post<{ success: boolean; tier: string }>('/billing/verify', payload)
    return data
  },
}
