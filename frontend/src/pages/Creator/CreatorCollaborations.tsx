import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import {
  Briefcase,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { creatorsApi } from '../../api/creators'
import toast from 'react-hot-toast'

interface Collaboration {
  id: string
  campaign_id: string
  creator_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
  proposed_budget?: number
  message?: string
  deadline?: string
  created_at: string
  updated_at: string
  campaign: {
    id: string
    title: string
    description: string
    platform: string
    category: string
    budget: number
    start_date: string
    end_date: string
    brand: {
      company_name: string
      website?: string
    }
  }
  ai_match_score?: number
  ai_recommendations?: string[]
}

export default function CreatorCollaborations() {
  const navigate = useNavigate()
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [filteredCollabs, setFilteredCollabs] = useState<Collaboration[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCollaborations()
  }, [])

  useEffect(() => {
    filterCollaborations()
  }, [filter, searchQuery, collaborations])

  const loadCollaborations = async () => {
    try {
      setLoading(true)
      const data = await creatorsApi.getRecentCollaborations(100)
      setCollaborations(data)
    } catch (error) {
      console.error('Failed to load collaborations:', error)
      toast.error('Failed to load collaborations')
    } finally {
      setLoading(false)
    }
  }

  const filterCollaborations = () => {
    let filtered = collaborations

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((c) => c.status === filter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.campaign.title.toLowerCase().includes(query) ||
          c.campaign.brand.company_name.toLowerCase().includes(query) ||
          c.campaign.category.toLowerCase().includes(query)
      )
    }

    setFilteredCollabs(filtered)
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          icon: Clock,
          label: 'Pending Review',
        }
      case 'accepted':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          icon: CheckCircle,
          label: 'Accepted',
        }
      case 'rejected':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          icon: XCircle,
          label: 'Rejected',
        }
      case 'completed':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          icon: CheckCircle,
          label: 'Completed',
        }
      case 'cancelled':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          icon: XCircle,
          label: 'Cancelled',
        }
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          icon: Clock,
          label: status,
        }
    }
  }

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'text-gray-600'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const stats = {
    pending: collaborations.filter((c) => c.status === 'pending').length,
    accepted: collaborations.filter((c) => c.status === 'accepted').length,
    completed: collaborations.filter((c) => c.status === 'completed').length,
    rejected: collaborations.filter((c) => c.status === 'rejected').length,
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Collaboration Requests</h1>
        <p className="text-gray-600">Manage your brand collaboration opportunities</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Accepted</p>
              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns, brands, or categories..."
              className="input-field pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'pending', 'accepted', 'completed', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Collaborations List */}
      {filteredCollabs.length === 0 ? (
        <div className="card text-center py-12">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {searchQuery || filter !== 'all'
              ? 'No collaborations match your filters'
              : 'No collaboration requests yet'}
          </p>
          {!searchQuery && filter === 'all' && (
            <button
              onClick={() => navigate('/creator/recommended-campaigns')}
              className="btn-primary"
            >
              Explore Campaigns
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCollabs.map((collab) => {
            const statusConfig = getStatusConfig(collab.status)
            const StatusIcon = statusConfig.icon

            return (
              <div key={collab.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-lg flex items-center justify-center text-white font-bold">
                        {collab.campaign.brand.company_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {collab.campaign.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{collab.campaign.brand.company_name}</p>
                        
                        {/* AI Match Score */}
                        {collab.ai_match_score && (
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-medium text-gray-600">AI Match Score:</span>
                            <span className={`text-sm font-bold ${getMatchScoreColor(collab.ai_match_score)}`}>
                              {collab.ai_match_score}%
                            </span>
                            {collab.ai_match_score >= 80 && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Excellent Match
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium capitalize">
                            {collab.campaign.platform}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium capitalize">
                            {collab.campaign.category}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                          {collab.proposed_budget && (
                            <span className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              ${collab.proposed_budget.toLocaleString()} proposed
                            </span>
                          )}
                          {collab.deadline && (
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Due: {new Date(collab.deadline).toLocaleDateString()}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            Received: {new Date(collab.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AI Recommendations */}
                    {collab.ai_recommendations && collab.ai_recommendations.length > 0 && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-purple-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-purple-900 mb-1">AI Insights:</p>
                            <ul className="text-xs text-purple-800 space-y-1">
                              {collab.ai_recommendations.slice(0, 2).map((rec, idx) => (
                                <li key={idx}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message Preview */}
                    {collab.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 line-clamp-2">{collab.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${statusConfig.bg} ${statusConfig.text}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => navigate(`/creator/collaborations/${collab.id}`)}
                    className="btn-outline flex-1 flex items-center justify-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </button>

                  {collab.status === 'pending' && (
                    <>
                      <button
                        onClick={() => navigate(`/creator/collaborations/${collab.id}/accept`)}
                        className="btn-primary flex-1"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => navigate(`/creator/collaborations/${collab.id}/reject`)}
                        className="btn-outline border-red-300 text-red-700 hover:bg-red-50 flex-1"
                      >
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
