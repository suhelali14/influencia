import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { TrendingUp, Briefcase, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchMyBrandProfile } from '../../store/slices/brandsSlice'
import { fetchBrandCampaigns, fetchActiveCampaigns } from '../../store/slices/campaignsSlice'

export default function BrandDashboard() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { currentBrand } = useAppSelector((state) => state.brands)
  const { campaigns, activeCampaigns } = useAppSelector((state) => state.campaigns)

  useEffect(() => {
    dispatch(fetchMyBrandProfile())
    dispatch(fetchActiveCampaigns())
  }, [dispatch])

  useEffect(() => {
    if (currentBrand?.id) {
      dispatch(fetchBrandCampaigns(currentBrand.id))
    }
  }, [dispatch, currentBrand?.id])

  const totalReach = campaigns.reduce((sum, campaign) => sum + campaign.total_reach, 0)

  const stats = [
    {
      label: 'Active Campaigns',
      value: activeCampaigns.length.toString(),
      icon: Briefcase,
      change: `+${activeCampaigns.length}`,
      color: 'blue',
    },
    {
      label: 'Total Campaigns',
      value: currentBrand?.total_campaigns.toString() || '0',
      icon: Briefcase,
      change: 'All time',
      color: 'purple',
    },
    {
      label: 'Total Reach',
      value: totalReach > 1000000 ? `${(totalReach / 1000000).toFixed(1)}M` : totalReach.toLocaleString(),
      icon: Eye,
      change: totalReach > 0 ? `${totalReach.toLocaleString()} total` : '0',
      color: 'green',
    },
    {
      label: 'Total Spent',
      value: `$${currentBrand?.total_spent ? Number(currentBrand.total_spent).toFixed(2) : '0.00'}`,
      icon: TrendingUp,
      change: 'All time',
      color: 'orange',
    },
  ]

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.first_name}! 👋
        </h1>
        <p className="text-gray-600 mt-2">Here's an overview of your campaigns</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <span className={`text-sm font-semibold text-${stat.color}-600`}>{stat.change}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Link to="/brand/campaigns/create" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚀</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Campaign</h3>
            <p className="text-gray-600 text-sm">Launch a new influencer campaign</p>
          </div>
        </Link>

        <Link to="/brand/discover" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Discover Creators</h3>
            <p className="text-gray-600 text-sm">Find perfect influencers</p>
          </div>
        </Link>

        <Link to="/brand/analytics" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">View Analytics</h3>
            <p className="text-gray-600 text-sm">Track campaign performance</p>
          </div>
        </Link>
      </div>

      {/* Active Campaigns */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Active Campaigns</h2>
          <Link to="/brand/campaigns" className="text-primary-600 hover:text-primary-700 font-medium">
            View All
          </Link>
        </div>
        <div className="space-y-4">
          {activeCampaigns.length > 0 ? (
            activeCampaigns.slice(0, 5).map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {campaign.platform.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{campaign.title}</h3>
                    <p className="text-sm text-gray-600">
                      {campaign.total_creators} creators • {campaign.platform} • {campaign.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">${Number(campaign.budget).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">{campaign.total_reach.toLocaleString()} Reach</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No active campaigns yet</p>
              <Link to="/brand/campaigns/create" className="btn-primary mt-4 inline-block">
                Create Your First Campaign
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
