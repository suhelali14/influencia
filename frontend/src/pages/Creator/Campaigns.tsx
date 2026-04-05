import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { Filter, Search } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchActiveCampaigns, searchCampaigns } from '../../store/slices/campaignsSlice'

export default function CreatorCampaigns() {
  const dispatch = useAppDispatch()
  const { activeCampaigns, loading } = useAppSelector((state) => state.campaigns)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    dispatch(fetchActiveCampaigns())
  }, [dispatch])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      dispatch(searchCampaigns(searchQuery))
    } else {
      dispatch(fetchActiveCampaigns())
    }
  }

  const filteredCampaigns = activeCampaigns.filter((campaign) => {
    if (statusFilter === 'all') return true
    return campaign.status === statusFilter
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

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Available Campaigns</h1>
          <p className="text-gray-600 mt-2">Browse and apply for campaigns</p>
        </div>
        <button className="btn-primary">View My Applications</button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
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
          </select>
          <button type="submit" className="btn-outline flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Search
          </button>
        </form>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{campaign.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{campaign.description}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span className="font-medium">Platform: <span className="capitalize">{campaign.platform}</span></span>
                    <span className="font-medium">Category: {campaign.category}</span>
                    <span className="font-medium">Budget: ${campaign.budget.toLocaleString()}</span>
                    <span className="font-medium">
                      Deadline: {new Date(campaign.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  {campaign.requirements && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Requirements:</p>
                      <p className="text-sm text-gray-600">{JSON.stringify(campaign.requirements)}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button className="btn-outline text-sm px-4 py-2">View Details</button>
                  {campaign.status === 'active' && (
                    <button className="btn-primary text-sm px-4 py-2">Apply Now</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-600 text-lg">No campaigns found</p>
          <p className="text-gray-500 mt-2">Try adjusting your filters or check back later</p>
        </div>
      )}
    </DashboardLayout>
  )
}
