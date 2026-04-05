import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package,
  Calendar,
  DollarSign,
  MessageSquare,
  Eye,
  Filter
} from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { getCollaborations } from '../../api/matching'
import type { Collaboration } from '../../api/matching'
import type { Campaign } from '../../api/campaigns'

type CollaborationStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'

const statusConfig: Record<CollaborationStatus, { 
  label: string
  color: string
  bgColor: string
  icon: any
}> = {
  pending: { 
    label: 'Pending', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-100',
    icon: Clock
  },
  accepted: { 
    label: 'Accepted', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    icon: CheckCircle
  },
  rejected: { 
    label: 'Rejected', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    icon: XCircle
  },
  completed: { 
    label: 'Completed', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    icon: Package
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-100',
    icon: XCircle
  }
}

export default function Collaborations() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<CollaborationStatus | 'all'>('all')

  useEffect(() => {
    fetchCollaborations()
  }, [campaignId])

  const fetchCollaborations = async () => {
    try {
      setLoading(true)
      const data = await getCollaborations(String(campaignId))
      setCollaborations(data)
      
      // Extract campaign from first collaboration
      if (data.length > 0 && data[0].campaign) {
        setCampaign(data[0].campaign)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch collaborations')
    } finally {
      setLoading(false)
    }
  }

  const filteredCollaborations = filterStatus === 'all' 
    ? collaborations 
    : collaborations.filter(c => c.status === filterStatus)

  const getStatusCounts = () => {
    return {
      all: collaborations.length,
      pending: collaborations.filter(c => c.status === 'pending').length,
      accepted: collaborations.filter(c => c.status === 'accepted').length,
      rejected: collaborations.filter(c => c.status === 'rejected').length,
      completed: collaborations.filter(c => c.status === 'completed').length,
      cancelled: collaborations.filter(c => c.status === 'cancelled').length,
    }
  }

  const counts = getStatusCounts()

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/brand/campaigns/${campaignId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Campaign
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Collaboration Requests</h1>
              {campaign && (
                <p className="text-gray-600 mt-1">For campaign: {campaign.title}</p>
              )}
            </div>

            <button
              onClick={() => navigate(`/brand/campaigns/${campaignId}/matches`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Find More Creators
            </button>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 mr-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filterStatus === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({counts.all})
          </button>

          {Object.entries(statusConfig).map(([status, config]) => {
            const StatusIcon = config.icon
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status as CollaborationStatus)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  filterStatus === status 
                    ? `${config.bgColor} ${config.color}` 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <StatusIcon className="w-4 h-4" />
                {config.label} ({counts[status as keyof typeof counts]})
              </button>
            )
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredCollaborations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filterStatus === 'all' 
                ? 'No collaboration requests yet' 
                : `No ${statusConfig[filterStatus as CollaborationStatus]?.label.toLowerCase()} requests`}
            </h3>
            <p className="text-gray-600 mb-4">
              {filterStatus === 'all'
                ? 'Start by finding creators that match your campaign'
                : `Try a different filter to see other requests`}
            </p>
            {filterStatus === 'all' && (
              <button
                onClick={() => navigate(`/brand/campaigns/${campaignId}/matches`)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Find Creators
              </button>
            )}
          </div>
        )}

        {/* Collaborations List */}
        {!loading && filteredCollaborations.length > 0 && (
          <div className="space-y-4">
            {filteredCollaborations.map((collab) => {
              const config = statusConfig[collab.status]
              const StatusIcon = config.icon
              const creator = collab.creator
              
              if (!creator) return null

              return (
                <div
                  key={collab.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    {/* Creator Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                        {creator.user?.first_name?.[0]}{creator.user?.last_name?.[0]}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {creator.user?.first_name} {creator.user?.last_name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>

                        <p className="text-gray-600 text-sm mb-3">{creator.bio}</p>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {collab.proposed_budget && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Budget</p>
                                <p className="text-sm font-medium text-gray-900">
                                  ${collab.proposed_budget.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}

                          {collab.deadline && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Deadline</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(collab.deadline).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Requested</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(collab.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {collab.payment_completed !== undefined && (
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Payment</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {collab.payment_completed ? 'Completed' : 'Pending'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Message */}
                        {collab.message && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <p className="text-xs text-gray-500 mb-1">Your Message:</p>
                            <p className="text-sm text-gray-700">{collab.message}</p>
                          </div>
                        )}

                        {/* Rejection Reason */}
                        {collab.status === 'rejected' && collab.rejection_reason && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <p className="text-xs text-red-600 mb-1">Rejection Reason:</p>
                            <p className="text-sm text-red-700">{collab.rejection_reason}</p>
                          </div>
                        )}

                        {/* Deliverables */}
                        {collab.deliverables && Array.isArray(collab.deliverables) && collab.deliverables.length > 0 && (
                          <div className="border-t border-gray-200 pt-3">
                            <p className="text-xs text-gray-500 mb-2">Deliverables:</p>
                            <div className="flex flex-wrap gap-2">
                              {collab.deliverables.map((item: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => navigate(`/brand/campaigns/${campaignId}/creator/${creator.id}/analysis`)}
                      className="ml-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4" />
                      View Profile
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
