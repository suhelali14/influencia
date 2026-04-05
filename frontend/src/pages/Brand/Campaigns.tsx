import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { Link } from 'react-router-dom'
import { Plus, Filter, Search, Calendar, DollarSign, Users, TrendingUp } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchBrandCampaigns } from '../../store/slices/campaignsSlice'
import { fetchMyBrandProfile } from '../../store/slices/brandsSlice'
import toast from 'react-hot-toast'

export default function BrandCampaigns() {
  const dispatch = useAppDispatch()
  const { campaigns, loading } = useAppSelector((state) => state.campaigns)
  const { currentBrand } = useAppSelector((state) => state.brands)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Fetch brand profile first
  useEffect(() => {
    dispatch(fetchMyBrandProfile())
  }, [dispatch])

  // Then fetch campaigns when we have the brand ID
  useEffect(() => {
    if (currentBrand?.id) {
      dispatch(fetchBrandCampaigns(currentBrand.id))
        .unwrap()
        .catch((error) => {
          toast.error('Failed to load campaigns')
          console.error(error)
        })
    }
  }, [dispatch, currentBrand?.id])

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'draft':
        return 'bg-gray-100 text-gray-700'
      case 'paused':
        return 'bg-yellow-100 text-yellow-700'
      case 'completed':
        return 'bg-blue-100 text-blue-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-2">Manage all your influencer campaigns</p>
        </div>
        <Link to="/brand/campaigns/create" className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Create Campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="input-field pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="input-field md:w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn-outline flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredCampaigns.length === 0 && (
        <div className="text-center py-12 card">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
            <Plus className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {campaigns.length === 0 
              ? 'Get started by creating your first influencer campaign'
              : 'Try adjusting your search or filter criteria'}
          </p>
          {campaigns.length === 0 && (
            <Link to="/brand/campaigns/create" className="btn-primary inline-flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Campaign
            </Link>
          )}
        </div>
      )}

      {/* Campaigns List */}
      {!loading && filteredCampaigns.length > 0 && (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{campaign.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-gray-600">Budget:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          ${Number(campaign.budget).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-gray-600">Platform:</span>
                        <span className="ml-2 font-semibold text-gray-900 capitalize">
                          {campaign.platform}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-gray-600">Start:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {formatDate(campaign.start_date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-gray-600">Spent:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          ${Number(campaign.total_spent || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Requirements Preview */}
                  {campaign.requirements && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {campaign.requirements.min_followers && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            Min {Number(campaign.requirements.min_followers).toLocaleString()} followers
                          </span>
                        )}
                        {campaign.requirements.min_engagement_rate && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {campaign.requirements.min_engagement_rate}% engagement
                          </span>
                        )}
                        {campaign.requirements.content_types && campaign.requirements.content_types.length > 0 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {campaign.requirements.content_types.length} content types
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Link 
                    to={`/brand/campaigns/${campaign.id}`} 
                    className="btn-outline text-sm px-4 py-2 text-center"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/brand/campaigns/${campaign.id}/edit`}
                    className="btn-primary text-sm px-4 py-2 text-center"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
