import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import {
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Activity,
  Award,
  Zap,
} from 'lucide-react'
import { creatorsApi } from '../../api/creators'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalCollaborations: number
  activeCollaborations: number
  completedCollaborations: number
  totalEarnings: number
  averageRating: number
  totalReach: number
  engagementRate: number
  pendingRequests: number
}

interface RecentCollaboration {
  id: string
  campaign: {
    title: string
    brand: {
      company_name: string
    }
  }
  status: string
  proposed_budget: number
  created_at: string
}

export default function CreatorDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentCollabs, setRecentCollabs] = useState<RecentCollaboration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsData, collabsData] = await Promise.all([
        creatorsApi.getCreatorStats(),
        creatorsApi.getRecentCollaborations(5),
      ])
      setStats(statsData)
      setRecentCollabs(collabsData)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'accepted':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      case 'completed':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Creator Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your performance overview.</p>
      </div>

      {/* AI-Powered Insights Banner */}
      <div className="mb-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-3">
              <Zap className="w-6 h-6 mr-2" />
              <h2 className="text-xl font-bold">AI-Powered Insights</h2>
            </div>
            <p className="text-purple-100 mb-4">
              Your profile has been analyzed by our AI. You're matching with {stats?.pendingRequests || 0} new
              campaigns!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/creator/recommended-campaigns')}
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              >
                View Recommendations
              </button>
              <button
                onClick={() => navigate('/creator/collaborations')}
                className="bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-800 transition-colors"
              >
                Manage Requests
              </button>
            </div>
          </div>
          <div className="ml-6">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Activity className="w-12 h-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Collaborations */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats?.totalCollaborations || 0}</span>
          </div>
          <p className="text-sm text-gray-600">Total Collaborations</p>
          <div className="mt-2 flex items-center text-xs text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>All time</span>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats?.activeCollaborations || 0}</span>
          </div>
          <p className="text-sm text-gray-600">Active Campaigns</p>
          <div className="mt-2 flex items-center text-xs text-blue-600">
            <Clock className="w-4 h-4 mr-1" />
            <span>In progress</span>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${((stats?.totalEarnings || 0) / 1000000).toFixed(1)}M
            </span>
          </div>
          <p className="text-sm text-gray-600">Total Earnings</p>
          <div className="mt-2 flex items-center text-xs text-purple-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>Lifetime</span>
          </div>
        </div>

        {/* Average Rating */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats?.averageRating?.toFixed(1) || '0.0'}</span>
          </div>
          <p className="text-sm text-gray-600">Average Rating</p>
          <div className="mt-2 flex items-center text-xs text-yellow-600">
            <Award className="w-4 h-4 mr-1" />
            <span>Out of 5.0</span>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Reach</p>
              <p className="text-2xl font-bold text-gray-900">
                {((stats?.totalReach || 0) / 1000000).toFixed(1)}M
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Engagement Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.engagementRate?.toFixed(1) || '0.0'}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingRequests || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Recent Collaborations */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Collaboration Requests</h2>
          <button
            onClick={() => navigate('/creator/collaborations')}
            className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
          >
            View All →
          </button>
        </div>

        {recentCollabs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No collaboration requests yet</p>
            <button
              onClick={() => navigate('/creator/recommended-campaigns')}
              className="btn-primary"
            >
              Explore Campaigns
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recentCollabs.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/creator/collaborations/${collab.id}`)}
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{collab.campaign.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{collab.campaign.brand.company_name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center">
                      <DollarSign className="w-3 h-3 mr-1" />
                      ${collab.proposed_budget?.toLocaleString() || 'TBD'}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(collab.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(collab.status)}`}>
                  {collab.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/creator/recommended-campaigns')}
          className="card hover:shadow-lg transition-shadow text-left"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">AI Recommendations</h3>
          </div>
          <p className="text-sm text-gray-600">Discover campaigns matched to your profile</p>
        </button>

        <button
          onClick={() => navigate('/creator/collaborations')}
          className="card hover:shadow-lg transition-shadow text-left"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Manage Collaborations</h3>
          </div>
          <p className="text-sm text-gray-600">View and respond to collaboration requests</p>
        </button>

        <button
          onClick={() => navigate('/creator/profile')}
          className="card hover:shadow-lg transition-shadow text-left"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Update Profile</h3>
          </div>
          <p className="text-sm text-gray-600">Keep your profile up to date for better matches</p>
        </button>
      </div>
    </DashboardLayout>
  )
}
