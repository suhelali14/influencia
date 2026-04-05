import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import {
  ArrowLeft,
  TrendingUp,
  Target,
  DollarSign,
  Award,
  CheckCircle,
  AlertCircle,
  Send,
  Calendar,
  Star,
  MapPin,
  Briefcase,
  Mail,
  Phone,
} from 'lucide-react'
import { matchingApi, type DetailedAnalysis } from '../../api/matching'
import toast from 'react-hot-toast'

export default function CreatorAnalysis() {
  const { campaignId, creatorId } = useParams()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState<DetailedAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestData, setRequestData] = useState({
    proposed_budget: '',
    message: '',
    deadline: '',
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (campaignId && creatorId) {
      loadAnalysis()
    }
  }, [campaignId, creatorId])

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      const data = await matchingApi.getDetailedAnalysis(campaignId!, creatorId!)
      setAnalysis(data)
    } catch (error) {
      console.error('Failed to load analysis:', error)
      toast.error('Failed to load creator analysis')
    } finally {
      setLoading(false)
    }
  }

  const handleSendRequest = async () => {
    if (!requestData.message.trim()) {
      toast.error('Please enter a message')
      return
    }

    try {
      setSending(true)
      await matchingApi.sendCollaborationRequest(campaignId!, creatorId!, {
        proposed_budget: requestData.proposed_budget ? Number(requestData.proposed_budget) : undefined,
        message: requestData.message,
        deadline: requestData.deadline || undefined,
      })
      toast.success('Collaboration request sent successfully!')
      setShowRequestModal(false)
      navigate(`/brand/campaigns/${campaignId}/collaborations`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request')
    } finally {
      setSending(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-gray-600'
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

  if (!analysis) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Analysis not found</p>
        </div>
      </DashboardLayout>
    )
  }

  const { creator, campaign, analysis: matchAnalysis, recommendations, comparisons } = analysis

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Matches
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {creator.user?.first_name?.charAt(0) || 'C'}
              {creator.user?.last_name?.charAt(0) || 'R'}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {creator.user?.first_name} {creator.user?.last_name}
                </h1>
                {creator.is_verified && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Verified Creator
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-4 max-w-2xl">{creator.bio}</p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                {creator.location && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {creator.location}
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <Briefcase className="w-4 h-4 mr-2" />
                  {creator.total_campaigns || 0} campaigns completed
                </div>
                <div className="flex items-center text-gray-600">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  {creator.overall_rating ? Number(creator.overall_rating).toFixed(1) : '0.0'} / 5.0 rating
                </div>
                {creator.user?.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {creator.user.email}
                  </div>
                )}
                {creator.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {creator.phone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setShowRequestModal(true)}
            className="btn-primary flex items-center"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Collaboration Request
          </button>
        </div>
      </div>

      {/* Match Score Card */}
      <div className="card bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-200 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Match Analysis</h2>
            <p className="text-gray-600">
              Based on {matchAnalysis.reasons?.length || 0} matching factors for your campaign
            </p>
          </div>
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(matchAnalysis.score)}`}>
              {matchAnalysis.score}%
            </div>
            <div className="text-sm font-semibold text-gray-600 mt-2">Match Score</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{matchAnalysis.estimatedROI}%</div>
          <div className="text-sm text-gray-600">Estimated ROI</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{matchAnalysis.audienceOverlap}%</div>
          <div className="text-sm text-gray-600">Audience Match</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{matchAnalysis.experienceLevel}</div>
          <div className="text-sm text-gray-600">Experience Level</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900">{matchAnalysis.budgetFit}</div>
          <div className="text-sm text-gray-600">Budget Fit</div>
        </div>
      </div>

      {/* AI/ML Predictions Section */}
      {analysis.aiAnalysis && (
        <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                AI-Powered Predictions
              </h2>
              <p className="text-gray-600 mt-1">
                Advanced machine learning analysis • Model v{analysis.aiAnalysis.model_version || '1.0'} • 
                Confidence: <span className="font-semibold capitalize">{analysis.aiAnalysis.confidence_level || 'high'}</span>
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  toast.loading('Generating PDF report...')
                  await matchingApi.downloadPDFReport(campaignId!, creatorId!)
                  toast.dismiss()
                  toast.success('PDF report downloaded successfully!')
                } catch (error) {
                  toast.dismiss()
                  toast.error('Failed to download report')
                }
              }}
              className="btn-primary flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download AI Report
            </button>
          </div>

          {/* ML Predictions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {analysis.aiAnalysis.ml_match_score && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">ML Match Score</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">ML Model</span>
                </div>
                <div className="text-3xl font-bold text-purple-600">
                  {Number(analysis.aiAnalysis.ml_match_score).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Random Forest Prediction</div>
              </div>
            )}

            {analysis.aiAnalysis.estimated_roi && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Estimated ROI</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">ML Model</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {Number(analysis.aiAnalysis.estimated_roi).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Gradient Boosting Prediction</div>
              </div>
            )}

            {analysis.aiAnalysis.success_probability !== undefined && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Success Probability</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">DL Model</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {(Number(analysis.aiAnalysis.success_probability) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Neural Network Prediction</div>
              </div>
            )}
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysis.aiAnalysis.predicted_engagement && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100">
                <span className="text-sm font-medium text-gray-600">Predicted Engagement</span>
                <div className="text-2xl font-bold text-indigo-600 mt-1">
                  {Number(analysis.aiAnalysis.predicted_engagement).toFixed(2)}%
                </div>
              </div>
            )}

            {analysis.aiAnalysis.audience_overlap && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-pink-100">
                <span className="text-sm font-medium text-gray-600">Audience Overlap</span>
                <div className="text-2xl font-bold text-pink-600 mt-1">
                  {Number(analysis.aiAnalysis.audience_overlap).toFixed(0)}%
                </div>
              </div>
            )}

            {analysis.aiAnalysis.dl_match_score && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-violet-100">
                <span className="text-sm font-medium text-gray-600">DL Match Score</span>
                <div className="text-2xl font-bold text-violet-600 mt-1">
                  {Number(analysis.aiAnalysis.dl_match_score).toFixed(1)}%
                </div>
              </div>
            )}
          </div>

          {/* Risk Assessment */}
          {analysis.aiAnalysis.risk_assessment && (
            <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <span className="text-sm font-semibold text-gray-700 mr-3">Risk Assessment:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      analysis.aiAnalysis.risk_assessment.risk_level === 'Low' 
                        ? 'bg-green-100 text-green-700'
                        : analysis.aiAnalysis.risk_assessment.risk_level === 'Medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {analysis.aiAnalysis.risk_assessment.risk_level} Risk
                    </span>
                  </div>
                  
                  {analysis.aiAnalysis.risk_assessment.risk_factors?.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-gray-600 uppercase">Risk Factors:</span>
                      <ul className="mt-1 space-y-1">
                        {analysis.aiAnalysis.risk_assessment.risk_factors.map((factor, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-orange-500 mr-2">•</span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.aiAnalysis.risk_assessment.mitigation_strategies?.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-600 uppercase">Mitigation Strategies:</span>
                      <ul className="mt-1 space-y-1">
                        {analysis.aiAnalysis.risk_assessment.mitigation_strategies.map((strategy, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            {strategy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Summary */}
          {analysis.aiAnalysis.ai_summary && (
            <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                AI-Generated Summary
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {analysis.aiAnalysis.ai_summary}
              </p>
            </div>
          )}

          {/* AI Recommendations */}
          {analysis.aiAnalysis.ai_recommendations && analysis.aiAnalysis.ai_recommendations.length > 0 && (
            <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">AI-Generated Recommendations</h3>
              <div className="space-y-2">
                {analysis.aiAnalysis.ai_recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start text-sm text-gray-700">
                    <span className="text-purple-600 font-bold mr-2">{idx + 1}.</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Strengths */}
          {matchAnalysis.strengths?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Key Strengths
              </h3>
              <div className="space-y-3">
                {matchAnalysis.strengths?.map((strength, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{strength}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {matchAnalysis.concerns?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                Points to Consider
              </h3>
              <div className="space-y-3">
                {matchAnalysis.concerns?.map((concern, index) => (
                  <div key={index} className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{concern}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match Reasons */}
          {matchAnalysis.reasons?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Why This Creator Matches</h3>
              <div className="space-y-2">
                {matchAnalysis.reasons?.map((reason, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creator Categories */}
          {creator.categories?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expertise & Categories</h3>
              <div className="flex flex-wrap gap-2">
                {creator.categories?.map((category, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Recommendations & Comparisons */}
        <div className="space-y-6">
          {/* Recommendations */}
          {recommendations?.length > 0 && (
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mr-3 mt-2 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry Comparisons */}
          {comparisons && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry Benchmarks</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Avg. Campaign Budget</span>
                    <span className="font-semibold text-gray-900">
                      ${comparisons.industryAverageBudget ? Number(comparisons.industryAverageBudget).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Avg. Campaign Reach</span>
                    <span className="font-semibold text-gray-900">
                      {comparisons.industryAverageReach
                        ? (comparisons.industryAverageReach >= 1000000
                          ? `${(comparisons.industryAverageReach / 1000000).toFixed(1)}M`
                          : comparisons.industryAverageReach.toLocaleString())
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Creator Positioning</span>
                    <span className="font-semibold text-gray-900">{comparisons.creatorPositioning || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Platform:</span>
                <span className="ml-2 font-semibold text-gray-900 capitalize">{campaign.platform}</span>
              </div>
              <div>
                <span className="text-gray-600">Category:</span>
                <span className="ml-2 font-semibold text-gray-900 capitalize">{campaign.category}</span>
              </div>
              <div>
                <span className="text-gray-600">Budget:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  ${campaign.budget ? Number(campaign.budget).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Send Collaboration Request</h2>
            <p className="text-gray-600 mb-6">
              Invite {creator.user?.first_name} {creator.user?.last_name} to collaborate on your campaign
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed Budget (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    className="input-field pl-10"
                    placeholder="5000"
                    value={requestData.proposed_budget}
                    onChange={(e) => setRequestData({ ...requestData, proposed_budget: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deadline (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    className="input-field pl-10"
                    value={requestData.deadline}
                    onChange={(e) => setRequestData({ ...requestData, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  className="input-field"
                  rows={6}
                  placeholder="Hi! We'd love to collaborate with you on our campaign..."
                  value={requestData.message}
                  onChange={(e) => setRequestData({ ...requestData, message: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRequestModal(false)}
                className="btn-outline flex-1"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                className="btn-primary flex-1 flex items-center justify-center"
                disabled={sending}
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
