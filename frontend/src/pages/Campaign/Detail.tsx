import { useEffect } from 'react'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, DollarSign, Users, TrendingUp, CheckCircle, ArrowLeft, Edit, MapPin, Target, Package } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCampaignById } from '../../store/slices/campaignsSlice'
import toast from 'react-hot-toast'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { currentCampaign: campaign, loading } = useAppSelector((state) => state.campaigns)
  const { user } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (id) {
      dispatch(fetchCampaignById(id))
        .unwrap()
        .catch((error) => {
          toast.error('Failed to load campaign')
          console.error(error)
        })
    }
  }, [dispatch, id])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading campaign...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Campaign not found</h3>
          <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist.</p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'draft': return 'bg-gray-100 text-gray-700'
      case 'paused': return 'bg-yellow-100 text-yellow-700'
      case 'completed': return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
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
      <div className="mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-gray-600">{campaign.description}</p>
          </div>
          {user?.role === 'brand_admin' && (
            <div className="flex gap-3 ml-4">
              <Link 
                to={`/brand/campaigns/${campaign.id}/matches`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Users className="w-4 h-4 mr-2" />
                Find Creators
              </Link>
              <Link 
                to={`/brand/campaigns/${campaign.id}/collaborations`}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <Package className="w-4 h-4 mr-2" />
                Collaborations
              </Link>
              <Link 
                to={`/brand/campaigns/${campaign.id}/edit`}
                className="btn-outline flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${Number(campaign.budget).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Budget</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {campaign.total_creators || 0}
          </div>
          <div className="text-sm text-gray-600">Creators</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {campaign.total_reach > 1000000 
              ? `${(campaign.total_reach / 1000000).toFixed(1)}M` 
              : campaign.total_reach.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Reach</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${Number(campaign.total_spent || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Spent</div>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Platform & Category</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm capitalize">
                    {campaign.platform}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm capitalize">
                    {campaign.category}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h3>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          {campaign.requirements && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
              <div className="space-y-4">
                {campaign.requirements.min_followers && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Minimum Followers</h3>
                    <p className="text-gray-600">{Number(campaign.requirements.min_followers).toLocaleString()}</p>
                  </div>
                )}
                {campaign.requirements.min_engagement_rate && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Minimum Engagement Rate</h3>
                    <p className="text-gray-600">{campaign.requirements.min_engagement_rate}%</p>
                  </div>
                )}
                {campaign.requirements.content_types && campaign.requirements.content_types.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Content Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {campaign.requirements.content_types.map((type: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.requirements.deliverables && campaign.requirements.deliverables.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Deliverables</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {campaign.requirements.deliverables.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Target Audience */}
          {campaign.target_audience && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Target Audience</h2>
              <div className="space-y-4">
                {campaign.target_audience.age_range && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Age Range</h3>
                    <p className="text-gray-600">{campaign.target_audience.age_range}</p>
                  </div>
                )}
                {campaign.target_audience.gender && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Gender</h3>
                    <p className="text-gray-600 capitalize">{campaign.target_audience.gender}</p>
                  </div>
                )}
                {campaign.target_audience.locations && campaign.target_audience.locations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Locations</h3>
                    <div className="flex flex-wrap gap-2">
                      {campaign.target_audience.locations.map((loc: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {loc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.target_audience.interests && campaign.target_audience.interests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {campaign.target_audience.interests.map((interest: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center">
                          <Target className="w-3 h-3 mr-1" />
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Created</span>
                <span className="text-sm text-gray-900">{formatDate(campaign.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Start Date</span>
                <span className="text-sm text-gray-900">{formatDate(campaign.start_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">End Date</span>
                <span className="text-sm text-gray-900">{formatDate(campaign.end_date)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creators Section - Coming Soon */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Participating Creators</h2>
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Creator management coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
