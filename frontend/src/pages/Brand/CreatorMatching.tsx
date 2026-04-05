import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Pagination from '../../components/Pagination'
import {
  Users,
  TrendingUp,
  Award,
  Target,
  ChevronRight,
  Star,
  MapPin,
  Briefcase,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { matchingApi, type CreatorMatch } from '../../api/matching'
import toast from 'react-hot-toast'

export default function CreatorMatching() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const [matches, setMatches] = useState<CreatorMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (campaignId) {
      loadMatches()
    }
  }, [campaignId, page, pageSize])

  const loadMatches = async () => {
    try {
      setLoading(true)
      const result = await matchingApi.findCreatorsForCampaign(campaignId!, { page, pageSize })
      setMatches(result.data)
      setTotalCount(result.meta.totalCount)
      setTotalPages(result.meta.totalPages)
    } catch (error) {
      console.error('Failed to load matches:', error)
      toast.error('Failed to load creator matches')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-blue-600 bg-blue-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-gray-600 bg-gray-100'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match'
    if (score >= 60) return 'Good Match'
    if (score >= 40) return 'Fair Match'
    return 'Low Match'
  }

  const viewDetails = (match: CreatorMatch) => {
    navigate(`/brand/campaigns/${campaignId}/creator/${match.creator.id}/analysis`)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
          <p className="ml-4 text-lg text-gray-600">Finding perfect creators for your campaign...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Perfect Creator Matches</h1>
        <p className="text-gray-600">
          We've analyzed {totalCount} creators to find the best fits for your campaign
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
          <div className="text-sm text-gray-600">Total Matches</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {matches.filter((m) => m.matchScore >= 80).length}
          </div>
          <div className="text-sm text-gray-600">Excellent Matches</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {matches.length > 0
              ? Math.round(matches.reduce((sum, m) => sum + m.analysis.estimatedROI, 0) / matches.length)
              : 0}
            %
          </div>
          <div className="text-sm text-gray-600">Avg. Est. ROI</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {matches.length > 0
              ? Math.round(
                  matches.reduce((sum, m) => sum + m.analysis.audienceOverlap, 0) / matches.length
                )
              : 0}
            %
          </div>
          <div className="text-sm text-gray-600">Avg. Audience Match</div>
        </div>
      </div>

      {/* Creators List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recommended Creators</h2>
          <div className="text-sm text-gray-600">Sorted by match score</div>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No matching creators found</p>
            <p className="text-sm mt-2">Try adjusting your campaign requirements</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.creator.id}
                className="border border-gray-200 rounded-lg p-6 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => viewDetails(match)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {match.creator.user?.first_name?.charAt(0) || 'C'}
                      {match.creator.user?.last_name?.charAt(0) || 'R'}
                    </div>

                    {/* Creator Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {match.creator.user?.first_name} {match.creator.user?.last_name}
                        </h3>
                        <span className="text-sm text-gray-500">#{match.rank}</span>
                        {match.creator.is_verified && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <Check className="w-3 h-3 mr-1" />
                            Verified
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{match.creator.bio}</p>

                      {/* Quick Stats */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                        {match.creator.location && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {match.creator.location}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-1" />
                          {match.creator.total_campaigns} campaigns
                        </div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 mr-1 text-yellow-500" />
                          {Number(match.creator.overall_rating).toFixed(1)} rating
                        </div>
                        <div className="flex items-center font-medium text-gray-900">
                          Experience: {match.analysis.experienceLevel}
                        </div>
                      </div>

                      {/* Categories */}
                      {match.creator.categories && match.creator.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {match.creator.categories.slice(0, 3).map((cat, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                            >
                              {cat}
                            </span>
                          ))}
                          {match.creator.categories.length > 3 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                              +{match.creator.categories.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Key Strengths */}
                      {match.analysis.strengths.length > 0 && (
                        <div className="space-y-1">
                          {match.analysis.strengths.slice(0, 2).map((strength, i) => (
                            <div key={i} className="flex items-start text-sm">
                              <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{strength}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Concerns */}
                      {match.analysis.concerns.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {match.analysis.concerns.slice(0, 1).map((concern, i) => (
                            <div key={i} className="flex items-start text-sm">
                              <X className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-600">{concern}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Match Score & Action */}
                  <div className="ml-6 flex flex-col items-end space-y-3">
                    <div className="text-center">
                      <div
                        className={`text-3xl font-bold ${getScoreColor(match.matchScore).split(' ')[0]}`}
                      >
                        {match.matchScore}%
                      </div>
                      <div
                        className={`text-xs font-semibold px-3 py-1 rounded-full mt-2 ${getScoreColor(match.matchScore)}`}
                      >
                        {getScoreLabel(match.matchScore)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-gray-600 text-right">
                        <div>Est. ROI: {match.analysis.estimatedROI}%</div>
                        <div>Audience: {match.analysis.audienceOverlap}%</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        viewDetails(match)
                      }}
                      className="btn-primary text-sm flex items-center whitespace-nowrap"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          loading={loading}
        />
      )}

      {/* Actions */}
      <div className="mt-8 flex justify-between">
        <button onClick={() => navigate(`/brand/campaigns/${campaignId}`)} className="btn-outline">
          View Campaign
        </button>
        <button onClick={() => navigate('/brand/campaigns')} className="btn-primary">
          Back to Campaigns
        </button>
      </div>
    </DashboardLayout>
  )
}
