import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { TrendingUp, Briefcase, Eye, Sparkles, Layers, AlertTriangle, ArrowRight, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchMyBrandProfile } from '../../store/slices/brandsSlice'
import { fetchBrandCampaigns, fetchActiveCampaigns } from '../../store/slices/campaignsSlice'
import { usePlan } from '../../hooks/usePlan'

export default function BrandDashboard() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { currentBrand } = useAppSelector((state) => state.brands)
  const { campaigns, activeCampaigns } = useAppSelector((state) => state.campaigns)
  const { billing, tier, isPastDue, usagePercent, isAtLimit } = usePlan()

  useEffect(() => {
    dispatch(fetchMyBrandProfile())
    dispatch(fetchActiveCampaigns())
  }, [dispatch])

  useEffect(() => {
    if (currentBrand?.id) {
      dispatch(fetchBrandCampaigns(currentBrand.id))
    }
  }, [dispatch, currentBrand?.id])

  const totalReach = campaigns.reduce((sum, c) => sum + c.total_reach, 0)

  const stats = [
    {
      label: 'Active Campaigns',
      value: activeCampaigns.length.toString(),
      icon: Briefcase,
      sub: `${activeCampaigns.length} running`,
      color: 'indigo',
    },
    {
      label: 'Total Campaigns',
      value: currentBrand?.total_campaigns?.toString() || '0',
      icon: Briefcase,
      sub: 'All time',
      color: 'violet',
    },
    {
      label: 'Total Reach',
      value: totalReach >= 1_000_000
        ? `${(totalReach / 1_000_000).toFixed(1)}M`
        : totalReach >= 1_000
        ? `${(totalReach / 1_000).toFixed(0)}K`
        : totalReach.toLocaleString(),
      icon: Eye,
      sub: 'Across all campaigns',
      color: 'emerald',
    },
    {
      label: 'Total Spent',
      value: `₹${currentBrand?.total_spent ? Number(currentBrand.total_spent).toLocaleString() : '0'}`,
      icon: TrendingUp,
      sub: 'All time',
      color: 'amber',
    },
  ]

  const COLOR_MAP: Record<string, { bg: string; icon: string; text: string }> = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-600' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', text: 'text-violet-600' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-600' },
  }

  const campaignPct = usagePercent('campaigns')
  const discoveryPct = usagePercent('aiDiscoveries')
  const campaignLimit = billing?.usage.campaigns.limit ?? 0
  const discoveryLimit = billing?.usage.aiDiscoveries.limit ?? 0

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.first_name}! 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">Here's an overview of your campaigns and usage</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold capitalize ${
              tier === 'enterprise' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
              tier === 'pro' ? 'bg-violet-100 text-violet-700 border border-violet-200' :
              tier === 'growth' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
              tier === 'starter' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
              'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
              {tier === 'enterprise' && <Crown className="w-3 h-3" />}
              {tier} Plan
            </span>
            <Link
              to="/brand/billing"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ── Past Due Alert ── */}
        {isPastDue && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Subscription Payment Past Due</p>
              <p className="text-sm text-red-600 mt-0.5">
                Update your billing to prevent account suspension.{' '}
                <Link to="/brand/billing" className="underline font-medium">Manage billing →</Link>
              </p>
            </div>
          </div>
        )}

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const c = COLOR_MAP[stat.color]
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${c.icon}`} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-gray-900 mb-0.5">{stat.value}</div>
                <div className="text-sm font-medium text-gray-700">{stat.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{stat.sub}</div>
              </div>
            )
          })}
        </div>

        {/* ── Usage Limits Widget ── */}
        {billing && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Plan Usage</h2>
              <Link to="/brand/billing" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
                {(campaignPct >= 80 || discoveryPct >= 80) ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-3 h-3" /> Upgrade Plan
                  </span>
                ) : 'View Plans'} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-4">
              {/* Campaign usage */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Active Campaigns
                  </span>
                  <span className={`text-xs font-bold ${isAtLimit('campaigns') ? 'text-red-600' : 'text-gray-600'}`}>
                    {billing.usage.campaigns.used} / {campaignLimit >= 9999 ? '∞' : campaignLimit}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      campaignPct >= 100 ? 'bg-red-500' :
                      campaignPct >= 80 ? 'bg-amber-500' :
                      'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, campaignPct)}%` }}
                  />
                </div>
                {isAtLimit('campaigns') && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Campaign limit reached —{' '}
                    <Link to="/brand/billing" className="underline font-medium">upgrade to create more</Link>
                  </p>
                )}
              </div>

              {/* AI Discovery usage */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    AI Discoveries (monthly)
                  </span>
                  <span className={`text-xs font-bold ${isAtLimit('aiDiscoveries') ? 'text-red-600' : 'text-gray-600'}`}>
                    {billing.usage.aiDiscoveries.used} / {discoveryLimit >= 9999 ? '∞' : discoveryLimit}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      discoveryPct >= 100 ? 'bg-red-500' :
                      discoveryPct >= 80 ? 'bg-amber-500' :
                      'bg-violet-500'
                    }`}
                    style={{ width: `${Math.min(100, discoveryPct)}%` }}
                  />
                </div>
                {isAtLimit('aiDiscoveries') && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Discovery limit reached —{' '}
                    <Link to="/brand/billing" className="underline font-medium">upgrade to get more</Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/brand/campaigns/create"
            className={`group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all text-center ${
              isAtLimit('campaigns') ? 'opacity-75' : ''
            }`}
          >
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Create Campaign</h3>
            <p className="text-xs text-gray-500">Launch a new influencer campaign</p>
            {isAtLimit('campaigns') && (
              <span className="inline-flex items-center gap-1 mt-2 text-xs text-amber-600 font-semibold">
                <AlertTriangle className="w-3 h-3" /> Limit reached
              </span>
            )}
          </Link>

          <Link
            to="/brand/discover"
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
          >
            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Discover Creators</h3>
            <p className="text-xs text-gray-500">Find perfect influencers for your brand</p>
          </Link>

          <Link
            to="/brand/analytics"
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
          >
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">View Analytics</h3>
            <p className="text-xs text-gray-500">Track campaign performance & ROI</p>
          </Link>
        </div>

        {/* ── Active Campaigns list ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Active Campaigns</h2>
            <Link to="/brand/campaigns" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activeCampaigns.length > 0 ? (
              activeCampaigns.slice(0, 5).map((campaign) => (
                <Link
                  key={campaign.id}
                  to={`/brand/campaigns/${campaign.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {campaign.platform.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">{campaign.title}</h3>
                    <p className="text-xs text-gray-500">
                      {campaign.total_creators} creators · {campaign.platform} · {campaign.category}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-gray-900">₹{Number(campaign.budget).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{campaign.total_reach.toLocaleString()} reach</div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No active campaigns yet</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Create your first campaign to get started</p>
                <Link to="/brand/campaigns/create" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all">
                  Create Campaign <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
