import api from './client'

export interface Payment {
  id: string
  campaign_id: string
  creator_id: string
  amount: number
  payment_type: 'campaign_payment' | 'platform_fee' | 'refund'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  transaction_id?: string
  payment_gateway?: string
  metadata?: any
  processed_at?: string
  created_at: string
  updated_at: string
}

export const paymentsApi = {
  create: async (data: {
    campaign_id: string
    creator_id: string
    amount: number
    payment_type: string
    payment_gateway?: string
  }) => {
    const response = await api.post<Payment>('/payments', data)
    return response.data
  },

  getAll: async () => {
    const { data } = await api.get<Payment[]>('/payments')
    return data
  },

  getByCreator: async (creatorId: string) => {
    const { data } = await api.get<Payment[]>(`/payments/creator/${creatorId}`)
    return data
  },

  getCreatorEarnings: async (creatorId: string) => {
    const { data } = await api.get(`/payments/creator/${creatorId}/earnings`)
    return data
  },

  getByCampaign: async (campaignId: string) => {
    const { data } = await api.get<Payment[]>(`/payments/campaign/${campaignId}`)
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get<Payment>(`/payments/${id}`)
    return data
  },

  updateStatus: async (id: string, status: string, transaction_id?: string) => {
    const { data } = await api.patch<Payment>(`/payments/${id}/status`, {
      status,
      transaction_id,
    })
    return data
  },
}
