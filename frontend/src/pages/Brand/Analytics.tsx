import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { TrendingUp, Users, Eye, Loader2, AlertCircle, DollarSign, RefreshCw } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import { fetchBrandCampaigns } from '../../store/slices/campaignsSlice'
import { fetchMyBrandProfile } from '../../store/slices/brandsSlice'
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const formatCurrency = (n: number) => {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n.toLocaleString()
}

const formatNumber = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export default function BrandAnalytics() {
  const dispatch = useAppDispatch()
  const { currentBrand } = useAppSelector((state) => state.brands)
  const { campaigns, loading: campaignsLoading } = useAppSelector((state) => state.campaigns)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await dispatch(fetchMyBrandProfile())
    }
    init()
  }, [dispatch])

  useEffect(() => {
    if (currentBrand?.id) {
      dispatch(fetchBrandCampaigns(currentBrand.id)).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [dispatch, currentBrand?.id])

  // Computed analytics from real campaign data
  const totalSpend = campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0)
  const totalReach = campaigns.reduce((sum, c) => sum + Number(c.total_reach || 0), 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const completedCampaigns = campaigns.filter(c => c.status === 'completed')
  const totalCreators = campaigns.reduce((sum, c) => sum + Number(c.total_creators || 0), 0)

  // ROI calculation (reach per rupee spent, simplified)
  const avgROI = totalSpend > 0 ? Math.round((totalReach / totalSpend) * 100) : 0

  // Campaign performance by platform (for bar chart)
  const platformData = campaigns.reduce((acc, c) => {
    const p = c.platform || 'Other'
    if (!acc[p]) acc[p] = { platform: p, budget: 0, reach: 0, count: 0 }
    acc[p].budget += Number(c.budget || 0)
    acc[p].reach += Number(c.total_reach || 0)
    acc[p].count += 1
    return acc
  }, {} as Record<string, any>)
  const platformChartData = Object.values(platformData)

  // Category breakdown (for pie chart)
  const categoryData = campaigns.reduce((acc, c) => {
    const cat = c.category || 'Other'
    if (!acc[cat]) acc[cat] = { name: cat, value: 0 }
    acc[cat].value += Number(c.budget || 0)
    return acc
  }, {} as Record<string, any>)
  const categoryChartData = Object.values(categoryData)

  // Monthly spend trend (for area chart)
  const monthlyData = campaigns.reduce((acc, c) => {
    const d = new Date(c.created_at || c.start_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!acc[key]) acc[key] = { month: key, spend: 0, reach: 0 }
    acc[key].spend += Number(c.budget || 0)
    acc[key].reach += Number(c.total_reach || 0)
    return acc
  }, {} as Record<string, any>)
  const monthlyChartData = Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month))

  const stats = [
    { label: 'Total Spend', value: formatCurrency(totalSpend), icon: DollarSign, color: 'blue', sub: `${campaigns.length} campaigns` },
    { label: 'Total Reach', value: formatNumber(totalReach), icon: Eye, color: 'purple', sub: `${activeCampaigns.length} active` },
    { label: 'Avg. ROI', value: `${avgROI}%`, icon: TrendingUp, color: 'green', sub: 'Reach per spend' },
    { label: 'Total Creators', value: totalCreators.toString(), icon: Users, color: 'orange', sub: `${completedCampaigns.length} completed` },
  ]

  if (loading || campaignsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Track your campaign performance and ROI</p>
        </div>
        <button onClick={() => { setLoading(true); dispatch(fetchMyBrandProfile()); if (currentBrand?.id) dispatch(fetchBrandCampaigns(currentBrand.id)).finally(() => setLoading(false)) }} className="btn-outline flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <span className="text-xs text-gray-500">{stat.sub}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="card text-center py-16">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No campaign data yet</h3>
          <p className="text-gray-500 text-sm">Create your first campaign to see analytics here</p>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Campaign Performance by Platform */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance by Platform</h2>
              {platformChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RechartsBarChart data={platformChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [name === 'reach' ? formatNumber(value) : formatCurrency(value), name === 'reach' ? 'Reach' : 'Budget']}
                    />
                    <Bar dataKey="budget" fill="#6366f1" name="Budget" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reach" fill="#06b6d4" name="Reach" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">No platform data</div>
              )}
            </div>

            {/* Category Breakdown Pie */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Budget by Category</h2>
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryChartData.map((_: any, i: number) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">No category data</div>
              )}
            </div>
          </div>

          {/* Spend Trend */}
          {monthlyChartData.length > 1 && (
            <div className="card mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Spend Trend</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="spend" stroke="#8b5cf6" fill="rgba(139,92,246,0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Campaign Breakdown Table */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Campaign</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Platform</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Budget</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reach</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Creators</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{campaign.title}</div>
                        <div className="text-xs text-gray-500">{campaign.category}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">{campaign.platform}</span>
                      </td>
                      <td className="py-4 px-4 text-gray-700">{formatCurrency(Number(campaign.budget))}</td>
                      <td className="py-4 px-4 text-gray-700">{formatNumber(Number(campaign.total_reach))}</td>
                      <td className="py-4 px-4 text-gray-700">{campaign.total_creators}</td>
                      <td className="py-4 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                          campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                          campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          campaign.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{campaign.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
