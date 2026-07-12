import { useState, useEffect, useCallback } from 'react'
import { billingApi, type BillingStatus } from '../api/billing'

// ─── Plan tier order (lower index = lower tier) ──────────────────────────────
export const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 3,
  enterprise: 4,
}

// ─── Feature flags per plan ───────────────────────────────────────────────────
export type PlanFeature =
  | 'aiDiscovery'
  | 'pdfReports'
  | 'sideByCompare'
  | 'advancedAnalytics'
  | 'apiAccess'
  | 'prioritySupport'
  | 'campaignCreate'
  | 'budgetOptimization'

const FEATURE_MIN_TIER: Record<PlanFeature, string> = {
  campaignCreate: 'free',
  aiDiscovery: 'starter',
  advancedAnalytics: 'growth',
  pdfReports: 'growth',
  sideByCompare: 'growth',
  budgetOptimization: 'growth',
  apiAccess: 'pro',
  prioritySupport: 'growth',
}

// Human-readable label for the minimum tier required
export const FEATURE_UPGRADE_LABEL: Record<PlanFeature, string> = {
  campaignCreate: 'Free',
  aiDiscovery: 'Starter',
  advancedAnalytics: 'Growth',
  pdfReports: 'Growth',
  sideByCompare: 'Growth',
  budgetOptimization: 'Growth',
  apiAccess: 'Pro',
  prioritySupport: 'Growth',
}

export interface UsePlanReturn {
  billing: BillingStatus | null
  loading: boolean
  tier: string
  isActive: boolean
  isPastDue: boolean
  canDo: (feature: PlanFeature) => boolean
  requiredTier: (feature: PlanFeature) => string
  isAtLimit: (resource: 'campaigns' | 'aiDiscoveries') => boolean
  usagePercent: (resource: 'campaigns' | 'aiDiscoveries') => number
  refetch: () => Promise<void>
}

/**
 * usePlan — central hook for subscription plan and feature-gating.
 *
 * Usage:
 *   const { canDo, tier, billing } = usePlan()
 *   if (!canDo('pdfReports')) return <PlanGate feature="pdfReports" />
 */
export function usePlan(): UsePlanReturn {
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await billingApi.getStatus()
      setBilling(data)
    } catch {
      // Silently fail — components should handle null billing gracefully
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const tier = billing?.subscription.tier || 'free'
  const status = billing?.subscription.status || 'inactive'
  const tierLevel = PLAN_ORDER[tier] ?? 0

  const canDo = (feature: PlanFeature): boolean => {
    const minTier = FEATURE_MIN_TIER[feature]
    const minLevel = PLAN_ORDER[minTier] ?? 0
    return tierLevel >= minLevel
  }

  const requiredTier = (feature: PlanFeature): string => {
    return FEATURE_UPGRADE_LABEL[feature] || 'Starter'
  }

  const isAtLimit = (resource: 'campaigns' | 'aiDiscoveries'): boolean => {
    if (!billing) return false
    const usage = billing.usage[resource]
    return usage.used >= usage.limit
  }

  const usagePercent = (resource: 'campaigns' | 'aiDiscoveries'): number => {
    if (!billing) return 0
    return billing.usage[resource].percentage
  }

  return {
    billing,
    loading,
    tier,
    isActive: status === 'active' || tier === 'free',
    isPastDue: status === 'past_due',
    canDo,
    requiredTier,
    isAtLimit,
    usagePercent,
    refetch: fetch,
  }
}
