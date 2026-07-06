import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { billingApi, type BillingStatus } from '../../api/billing'
import toast from 'react-hot-toast'
import {
  CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Sparkles,
  ArrowRight, Loader2, ArrowLeft, Layers, HelpCircle
} from 'lucide-react'

// Load Razorpay JS SDK dynamically
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.getElementById('razorpay-checkout-script')
    if (existing) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.id = 'razorpay-checkout-script'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function BillingSettings() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradingId, setUpgradingId] = useState<string | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const data = await billingApi.getStatus()
      setStatus(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load billing status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleUpgrade = async (planId: string) => {
    setUpgradingId(planId)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Failed to load Razorpay checkout script. Check your internet connection.')
        setUpgradingId(null)
        return
      }

      // 1. Get subscription parameters from backend
      const options = await billingApi.subscribe(planId)

      // Mock Payment Sandbox Bypass for local development
      if (options.subscriptionId && options.subscriptionId.startsWith('sub_mock_')) {
        toast.success('Mock Checkout Sandbox: Simulating Razorpay checkout...', { icon: '🤖' })
        setLoading(true)
        try {
          // Verify mock payment on backend
          await billingApi.verifyPayment({
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
            razorpay_subscription_id: options.subscriptionId,
            razorpay_signature: 'sig_mock_' + Math.random().toString(36).substring(7),
          })
          toast.success(`Success! Upgraded to ${planId.toUpperCase()} Plan (Sandbox).`)
          fetchStatus()
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Mock payment verification failed.')
          setLoading(false)
        } finally {
          setUpgradingId(null)
        }
        return
      }

      // 2. Open Razorpay Checkout modal
      const checkoutOptions = {
        key: options.keyId,
        subscription_id: options.subscriptionId,
        name: options.name,
        description: options.description,
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&h=100&q=80', // brand abstract icon
        handler: async (response: any) => {
          setLoading(true)
          try {
            // Verify payment on backend
            await billingApi.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            })
            toast.success(`Success! Upgraded to ${planId.toUpperCase()} Plan.`)
            fetchStatus()
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Payment verification failed.')
            setLoading(false)
          }
        },
        prefill: {
          name: options.customer.name,
          email: options.customer.email,
          contact: options.customer.contact,
        },
        theme: {
          color: '#6366f1', // Indigo accent color
        },
      }

      const rzp = new (window as any).Razorpay(checkoutOptions)
      rzp.on('payment.failed', function (resp: any) {
        toast.error(`Payment failed: ${resp.error.description}`)
      })
      rzp.open()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start payment process.')
    } finally {
      setUpgradingId(null)
    }
  }

  if (loading && !status) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    )
  }

  const currentTier = status?.subscription.tier || 'free'
  const isPastDue = status?.subscription.status === 'past_due'

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/brand/dashboard" className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-indigo-600" />
              Plans & Subscriptions
            </h1>
            <p className="text-gray-500 mt-1">Manage SaaS subscription plans, credit usage, and billing</p>
          </div>
        </div>

        {/* Past Due Warning Alert */}
        {isPastDue && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">Subscription Payment Past Due</h4>
              <p className="text-sm mt-0.5">Please upgrade or re-verify payment credentials to prevent account suspension.</p>
            </div>
          </div>
        )}

        {/* Current Plan Overview Card */}
        {status && (
          <div className="card mb-8 p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white border-none shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500 opacity-10 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  Current Plan
                </span>
                <h2 className="text-4xl font-extrabold capitalize mt-3 flex items-center gap-2">
                  {status.subscription.tier} Plan
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </h2>
                <p className="text-indigo-200 text-sm mt-2">
                  {status.subscription.expiresAt ? (
                    <>Renews on <span className="font-semibold text-white">{new Date(status.subscription.expiresAt).toLocaleDateString()}</span></>
                  ) : (
                    'Always free plan with basic search functions'
                  )}
                </p>
              </div>

              {/* Action sync info */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3 items-center">
                <Zap className="w-8 h-8 text-indigo-400 fill-indigo-400" />
                <div>
                  <h4 className="text-sm font-semibold">Need custom parameters?</h4>
                  <p className="text-xs text-indigo-200 mt-0.5">Enterprise contracts starting from ₹50,000/month</p>
                </div>
              </div>
            </div>

            {/* Meters Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-white/10 relative z-10">
              {/* Campaign Limit */}
              <div>
                <div className="flex justify-between text-sm mb-2 text-indigo-100">
                  <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-indigo-400" /> Active Campaigns</span>
                  <span className="font-semibold">{status.usage.campaigns.used} / {status.usage.campaigns.limit >= 9999 ? 'Unlimited' : status.usage.campaigns.limit}</span>
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full transition-all"
                    style={{ width: `${status.usage.campaigns.percentage}%` }}
                  />
                </div>
              </div>

              {/* AI Discoveries Limit */}
              <div>
                <div className="flex justify-between text-sm mb-2 text-indigo-100">
                  <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-indigo-400" /> AI Discoveries (Monthly)</span>
                  <span className="font-semibold">{status.usage.aiDiscoveries.used} / {status.usage.aiDiscoveries.limit >= 9999 ? 'Unlimited' : status.usage.aiDiscoveries.limit}</span>
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full transition-all"
                    style={{ width: `${status.usage.aiDiscoveries.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid Pricing Plans */}
        <h3 className="text-xl font-bold text-gray-900 mb-6">Choose Your Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {status?.plans.map((p) => {
            const isCurrent = p.isCurrent
            const isFree = p.id === 'free'
            const isEnterprise = p.id === 'enterprise'

            return (
              <div
                key={p.id}
                className={`card relative flex flex-col justify-between border-2 transition-all p-6 ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50/10 shadow-lg scale-[1.02]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Popularity Badge */}
                {p.id === 'growth' && (
                  <span className="absolute -top-3 right-6 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                    Popular
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-gray-900 capitalize">{p.name}</h3>
                  <div className="flex items-baseline mt-4">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {isEnterprise ? 'Custom' : `₹${p.price.toLocaleString()}`}
                    </span>
                    {!isEnterprise && <span className="text-gray-500 ml-1.5 text-sm">/month</span>}
                  </div>

                  {/* Limits Details */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                    <p className="text-gray-700">
                      Campaigns Limit: <span className="font-semibold">{p.campaignLimit >= 9999 ? 'Unlimited' : `${p.campaignLimit} active`}</span>
                    </p>
                    <p className="text-gray-700">
                      AI Searches Limit: <span className="font-semibold">{p.aiDiscoveryLimit >= 9999 ? 'Unlimited' : `${p.aiDiscoveryLimit}/mo`}</span>
                    </p>
                  </div>

                  {/* Features List */}
                  <ul className="mt-6 space-y-3.5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Action */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl font-semibold text-sm cursor-default"
                    >
                      Active Plan
                    </button>
                  ) : isEnterprise ? (
                    <a
                      href="mailto:support@influencia.in?subject=Enterprise Custom Plan Query"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-semibold text-sm transition-all"
                    >
                      Talk to Sales <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(p.id)}
                      disabled={upgradingId !== null}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-100"
                    >
                      {upgradingId === p.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Upgrading...
                        </>
                      ) : (
                        <>
                          Subscribe <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQs Section */}
        <div className="border-t border-gray-200 pt-10 mb-10">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-gray-500" />
            Frequently Asked Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <h4 className="font-semibold text-gray-900">How do AI search limits work?</h4>
              <p className="text-sm text-gray-500">Every time you trigger an Internet search for a campaign, 1 credit is used. Manual search queries are free and unlimited on all plans.</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-gray-900">Can I cancel my subscription anytime?</h4>
              <p className="text-sm text-gray-500">Yes. You can cancel your renewal subscription via Razorpay portal or email us. You'll retain access to paid features until the billing cycle ends.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
