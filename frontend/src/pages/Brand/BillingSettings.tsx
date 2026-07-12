import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { billingApi, type BillingStatus } from '../../api/billing'
import { PLAN_ORDER } from '../../hooks/usePlan'
import toast from 'react-hot-toast'
import {
  CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Sparkles,
  ArrowRight, Loader2, ArrowLeft, Layers, HelpCircle, TrendingUp,
  TrendingDown, Lock, XCircle, Crown, ChevronDown, ChevronUp,
  Infinity as InfinityIcon,
} from 'lucide-react'

// ─── Razorpay SDK loader ──────────────────────────────────────────────────────
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-script')) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.id = 'razorpay-checkout-script'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ─── Plan tier definitions (matches backend) ──────────────────────────────────
const PLAN_COLORS: Record<string, { from: string; to: string; badge: string; text: string }> = {
  free:       { from: 'from-gray-500',   to: 'to-slate-600',   badge: 'bg-gray-100 text-gray-600',    text: 'text-gray-700' },
  starter:    { from: 'from-blue-500',   to: 'to-cyan-600',    badge: 'bg-blue-50 text-blue-600',     text: 'text-blue-700' },
  growth:     { from: 'from-indigo-500', to: 'to-violet-600',  badge: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-700' },
  pro:        { from: 'from-violet-600', to: 'to-purple-700',  badge: 'bg-violet-50 text-violet-600', text: 'text-violet-700' },
  enterprise: { from: 'from-amber-500',  to: 'to-orange-600',  badge: 'bg-amber-50 text-amber-600',   text: 'text-amber-700' },
}

// ─── FAQ items ────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "How do AI Discovery credits work?",
    a: "Each time you trigger an internet-wide AI search for a campaign, 1 credit is consumed. Manual platform matching is free and unlimited on all plans.",
  },
  {
    q: "What happens when I hit my campaign limit?",
    a: "You'll see a 402 error when trying to create a new campaign. Existing campaigns remain active. Upgrade to instantly increase your limit.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel from this page. Access to paid features continues until your current billing cycle ends, then you drop to the Free plan.",
  },
  {
    q: "How do upgrades work mid-cycle?",
    a: "Upgrades take effect immediately. You'll be charged a prorated amount for the remainder of the current month via Razorpay.",
  },
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function BillingSettings() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const data = await billingApi.getStatus()
      setStatus(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load billing status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // ─── Determines if a plan is an upgrade or downgrade from current ───────────
  const getPlanAction = (planId: string): 'current' | 'upgrade' | 'downgrade' | 'free' | 'enterprise' => {
    const currentTier = status?.subscription.tier || 'free'
    if (planId === currentTier) return 'current'
    if (planId === 'enterprise') return 'enterprise'
    if (planId === 'free') return 'free'
    const currentLevel = PLAN_ORDER[currentTier] ?? 0
    const targetLevel = PLAN_ORDER[planId] ?? 0
    return targetLevel > currentLevel ? 'upgrade' : 'downgrade'
  }

  // ─── Handle plan change (upgrade or downgrade) ────────────────────────────
  const handlePlanChange = async (planId: string, action: string) => {
    if (action === 'downgrade' || action === 'free') {
      // Show downgrade confirmation modal
      setDowngradeTarget(planId)
      return
    }
    await initiateCheckout(planId)
  }

  const initiateCheckout = async (planId: string) => {
    setProcessingId(planId)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Failed to load Razorpay. Check your internet connection.')
        return
      }

      const options = await billingApi.subscribe(planId)

      // ── Dev sandbox bypass ── mock subscription ID skips Razorpay modal ──
      if (options.subscriptionId?.startsWith('sub_mock_')) {
        toast.loading('🤖 Sandbox: Bypassing Razorpay checkout...', { id: 'mock-payment' })
        try {
          const result = await billingApi.verifyPayment({
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_subscription_id: options.subscriptionId,
            // In dev mode the backend skips signature check when KEY_SECRET is placeholder
            razorpay_signature: 'mock_bypass_signature',
          })
          toast.success(`✅ Upgraded to ${result.tier?.toUpperCase()} plan (Sandbox)!`, { id: 'mock-payment' })
          await fetchStatus()
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Mock payment failed', { id: 'mock-payment' })
        }
        return
      }

      // ── Live Razorpay modal ───────────────────────────────────────────────
      const rzpOptions = {
        key: options.keyId,
        subscription_id: options.subscriptionId,
        name: options.name,
        description: options.description,
        image: '/logo192.png',
        handler: async (response: any) => {
          const toastId = toast.loading('Verifying payment...')
          try {
            const result = await billingApi.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            })
            toast.success(`🎉 Welcome to the ${result.tier?.toUpperCase()} plan!`, { id: toastId })
            await fetchStatus()
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Payment verification failed', { id: toastId })
          }
        },
        prefill: {
          name: options.customer.name,
          email: options.customer.email,
          contact: options.customer.contact,
        },
        theme: { color: '#6366f1' },
        modal: {
          ondismiss: () => {
            toast('Checkout cancelled.', { icon: '💡' })
          },
        },
      }

      const rzp = new (window as any).Razorpay(rzpOptions)
      rzp.on('payment.failed', (resp: any) => {
        toast.error(`Payment failed: ${resp.error.description}`)
      })
      rzp.open()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start checkout.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await billingApi.cancelSubscription()
      toast.success('Subscription cancelled. You\'ll retain access until your billing cycle ends.')
      setCancelConfirm(false)
      await fetchStatus()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel subscription.')
    } finally {
      setCancelling(false)
    }
  }

  const handleConfirmDowngrade = async () => {
    if (!downgradeTarget) return
    setDowngradeTarget(null)
    if (downgradeTarget === 'free') {
      await handleCancel()
    } else {
      await initiateCheckout(downgradeTarget)
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading && !status) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-indigo-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">Loading billing information...</p>
        </div>
      </DashboardLayout>
    )
  }

  const currentTier = status?.subscription.tier || 'free'
  const isPastDue = status?.subscription.status === 'past_due'
  const isPaid = currentTier !== 'free'
  const colors = PLAN_COLORS[currentTier] || PLAN_COLORS.free

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-2 space-y-8">

        {/* ── Page Header ── */}
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-indigo-600" />
              Plans & Billing
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your subscription, usage limits, and billing</p>
          </div>
        </div>

        {/* ── Past Due Alert ── */}
        {isPastDue && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Payment Past Due</h4>
              <p className="text-sm mt-0.5 text-red-600">
                Your subscription payment failed. Please update your payment method to prevent account suspension.
              </p>
            </div>
          </div>
        )}

        {/* ── Current Plan Card (Hero) ── */}
        {status && (
          <div className={`relative rounded-3xl bg-gradient-to-br ${colors.from} ${colors.to} p-8 text-white overflow-hidden shadow-2xl shadow-indigo-200/40`}>
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-black/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-white/20 border border-white/30 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                      Current Plan
                    </span>
                    {isPaid && (
                      <span className="text-xs bg-emerald-400/20 border border-emerald-400/40 text-emerald-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  <h2 className="text-4xl font-extrabold capitalize flex items-center gap-3">
                    {currentTier === 'enterprise' && <Crown className="w-8 h-8 text-amber-300" />}
                    {currentTier} Plan
                  </h2>

                  {status.subscription.expiresAt ? (
                    <p className="text-white/70 text-sm mt-2">
                      Renews on{' '}
                      <span className="text-white font-semibold">
                        {new Date(status.subscription.expiresAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </span>
                    </p>
                  ) : (
                    <p className="text-white/70 text-sm mt-2">Free plan — upgrade anytime to unlock more features</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {isPaid && !cancelConfirm && (
                    <button
                      onClick={() => setCancelConfirm(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-medium hover:bg-white/20 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Subscription
                    </button>
                  )}
                  {cancelConfirm && (
                    <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
                      <p className="text-sm font-semibold mb-3">Cancel your subscription?</p>
                      <p className="text-xs text-white/70 mb-4">
                        You'll keep access until{' '}
                        {status.subscription.expiresAt
                          ? new Date(status.subscription.expiresAt).toLocaleDateString()
                          : 'end of billing cycle'}
                        , then revert to Free plan.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancel}
                          disabled={cancelling}
                          className="flex-1 py-2 bg-red-500/80 hover:bg-red-500 border border-red-400/40 rounded-xl text-xs font-bold transition-all"
                        >
                          {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Yes, Cancel'}
                        </button>
                        <button
                          onClick={() => setCancelConfirm(false)}
                          className="flex-1 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold transition-all"
                        >
                          Keep Plan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage meters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-white/20">
                {/* Campaigns */}
                <div>
                  <div className="flex justify-between text-sm mb-2 text-white/80">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-white/60" />
                      Active Campaigns
                    </span>
                    <span className="font-bold text-white">
                      {status.usage.campaigns.used}
                      {' / '}
                      {status.usage.campaigns.limit >= 9999
                        ? <span className="inline-flex items-center gap-0.5">∞ <span className="text-xs font-normal text-white/60">Unlimited</span></span>
                        : status.usage.campaigns.limit
                      }
                    </span>
                  </div>
                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        status.usage.campaigns.percentage >= 90
                          ? 'bg-red-400'
                          : status.usage.campaigns.percentage >= 70
                          ? 'bg-amber-400'
                          : 'bg-white/80'
                      }`}
                      style={{ width: `${Math.min(100, status.usage.campaigns.percentage)}%` }}
                    />
                  </div>
                  {status.usage.campaigns.percentage >= 80 && (
                    <p className="text-xs text-amber-300 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {status.usage.campaigns.percentage >= 100 ? 'Limit reached — upgrade to create more' : `${100 - status.usage.campaigns.percentage}% remaining`}
                    </p>
                  )}
                </div>

                {/* AI Discoveries */}
                <div>
                  <div className="flex justify-between text-sm mb-2 text-white/80">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-white/60" />
                      AI Discoveries (monthly)
                    </span>
                    <span className="font-bold text-white">
                      {status.usage.aiDiscoveries.used}
                      {' / '}
                      {status.usage.aiDiscoveries.limit >= 9999 ? '∞' : status.usage.aiDiscoveries.limit}
                    </span>
                  </div>
                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        status.usage.aiDiscoveries.percentage >= 90
                          ? 'bg-red-400'
                          : status.usage.aiDiscoveries.percentage >= 70
                          ? 'bg-amber-400'
                          : 'bg-violet-300'
                      }`}
                      style={{ width: `${Math.min(100, status.usage.aiDiscoveries.percentage)}%` }}
                    />
                  </div>
                  {status.usage.aiDiscoveries.percentage >= 80 && (
                    <p className="text-xs text-amber-300 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {status.usage.aiDiscoveries.percentage >= 100 ? 'Limit reached' : `${100 - status.usage.aiDiscoveries.percentage}% remaining`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Downgrade Confirmation Modal ── */}
        {downgradeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5 mx-auto">
                <TrendingDown className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Downgrade to {downgradeTarget === 'free' ? 'Free' : downgradeTarget.charAt(0).toUpperCase() + downgradeTarget.slice(1)}?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Downgrading will remove access to features not included in the lower plan. Your data is safe and won't be deleted.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
                <p className="font-semibold mb-1">What you'll lose:</p>
                <ul className="space-y-1 text-amber-700 text-xs">
                  {downgradeTarget === 'free' && <li>• All AI Discovery credits</li>}
                  {downgradeTarget === 'free' && <li>• PDF Report exports</li>}
                  {downgradeTarget === 'free' && <li>• Side-by-side comparison</li>}
                  {(downgradeTarget === 'free' || downgradeTarget === 'starter') && <li>• Advanced analytics</li>}
                  <li>• Campaign slots reduced to plan limit</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmDowngrade}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all"
                >
                  Confirm Downgrade
                </button>
                <button
                  onClick={() => setDowngradeTarget(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                >
                  Keep Current
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Plan Tier Progress Indicator ── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {(status?.plans || []).filter(p => p.id !== 'enterprise').map((p, idx, arr) => {
            const isCurrent = p.id === currentTier
            const isPast = PLAN_ORDER[p.id] < PLAN_ORDER[currentTier]
            return (
              <div key={p.id} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`flex-1 flex flex-col items-center gap-1 min-w-0 ${isCurrent ? 'scale-105' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : isPast
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isPast ? '✓' : PLAN_ORDER[p.id] + 1}
                  </div>
                  <span className={`text-xs font-medium truncate ${isCurrent ? 'text-indigo-700 font-bold' : isPast ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {p.name}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded-full ${isPast ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
          {/* Enterprise */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <div className={`h-0.5 flex-1 rounded-full ${currentTier === 'enterprise' ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                currentTier === 'enterprise' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'bg-gray-100 text-gray-400'
              }`}>
                {currentTier === 'enterprise' ? '✓' : <Crown className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-xs font-medium ${currentTier === 'enterprise' ? 'text-amber-700 font-bold' : 'text-gray-400'}`}>
                Enterprise
              </span>
            </div>
          </div>
        </div>

        {/* ── Pricing Grid ── */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Available Plans</h2>
          <p className="text-sm text-gray-500 mb-6">Choose the right plan for your team's needs</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {status?.plans.map((p) => {
              const action = getPlanAction(p.id)
              const planColors = PLAN_COLORS[p.id] || PLAN_COLORS.free
              const isPopular = p.id === 'growth'
              const isBusy = processingId !== null

              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                    action === 'current'
                      ? 'border-indigo-500 shadow-lg shadow-indigo-100 scale-[1.02]'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  {/* Popular badge */}
                  {isPopular && action !== 'current' && (
                    <div className="absolute top-0 left-0 right-0 bg-indigo-600 text-white text-xs text-center py-1 font-bold uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}

                  {/* Card header */}
                  <div className={`bg-gradient-to-br ${planColors.from} ${planColors.to} p-5 ${isPopular && action !== 'current' ? 'pt-7' : ''}`}>
                    <h3 className="text-white font-bold text-lg capitalize">{p.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-white font-extrabold text-2xl">
                        {p.id === 'enterprise' ? 'Custom' : `₹${p.price.toLocaleString()}`}
                      </span>
                      {p.id !== 'enterprise' && p.id !== 'free' && (
                        <span className="text-white/70 text-xs">/mo</span>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-5 bg-white">
                    {/* Limits */}
                    <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-xl text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Layers className="w-3 h-3" /> Campaigns
                        </span>
                        <span className="font-bold text-gray-800">
                          {p.campaignLimit >= 9999 ? (
                            <span className="flex items-center gap-0.5"><InfinityIcon className="w-3 h-3" /></span>
                          ) : p.campaignLimit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI Searches/mo
                        </span>
                        <span className="font-bold text-gray-800">
                          {p.aiDiscoveryLimit >= 9999 ? <InfinityIcon className="w-3 h-3" /> : p.aiDiscoveryLimit}
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 flex-1 mb-5">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    <div className="mt-auto">
                      {action === 'current' && (
                        <div className="w-full py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" /> Current Plan
                        </div>
                      )}

                      {action === 'enterprise' && (
                        <a
                          href="mailto:support@influencia.in?subject=Enterprise Plan Query"
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold text-sm transition-all"
                        >
                          Talk to Sales <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {action === 'free' && (
                        <button
                          onClick={() => handlePlanChange(p.id, action)}
                          disabled={isBusy}
                          className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <TrendingDown className="w-3.5 h-3.5" /> Downgrade to Free
                        </button>
                      )}

                      {action === 'upgrade' && (
                        <button
                          onClick={() => handlePlanChange(p.id, action)}
                          disabled={isBusy}
                          className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-100`}
                        >
                          {processingId === p.id ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                          ) : (
                            <><TrendingUp className="w-3.5 h-3.5" /> Upgrade <ArrowRight className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      )}

                      {action === 'downgrade' && (
                        <button
                          onClick={() => handlePlanChange(p.id, action)}
                          disabled={isBusy}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                        >
                          <TrendingDown className="w-3.5 h-3.5" /> Downgrade
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Enterprise Banner ── */}
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <span className="text-amber-400 font-bold uppercase text-xs tracking-widest">Enterprise</span>
              </div>
              <h3 className="text-2xl font-extrabold text-white mb-2">Need custom scale?</h3>
              <p className="text-slate-400 text-sm max-w-md">
                Custom campaign limits, dedicated CSM, white-label options, SLA-backed uptime, and enterprise SSO. Starting from ₹50,000/month.
              </p>
            </div>
            <a
              href="mailto:support@influencia.in?subject=Enterprise Plan Query"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/30"
            >
              <Zap className="w-4 h-4" />
              Talk to Sales
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* ── FAQ Section ── */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-gray-400" />
            Frequently Asked Questions
          </h3>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-sm text-gray-900">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-500 border-t border-gray-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* spacer */}
        <div className="pb-6" />
      </div>
    </DashboardLayout>
  )
}
