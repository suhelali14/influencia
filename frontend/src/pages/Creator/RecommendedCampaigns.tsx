import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import {
  Zap,
  TrendingUp,
  DollarSign,
  Calendar,
  MapPin,
  Target,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
} from 'lucide-react'
import { creatorsApi } from '../../api/creators'
import toast from 'react-hot-toast'

interface RecommendedCampaign {
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
  aiMatchScore: number
  estimatedRoi: number
  successProbability: number
  matchReasons: string[]
  requirements?: string
  location?: string
}

export default function RecommendedCampaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<RecommendedCampaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<RecommendedCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [minScore, setMinScore] = useState(0)

  useEffect(() => {
    loadRecommendations()
  }, [])

  useEffect(() => {
    filterCampaigns()
  }, [selectedCategory, selectedPlatform, searchQuery, minScore, campaigns])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const data = await creatorsApi.getRecommendedCampaigns()
      // Normalize response — backend may return { recommendations: [...] } or directly [...]
      const list = Array.isArray(data) ? data : (data as any)?.recommendations || (data as any)?.campaigns || []
      
      // Map backend response to our interface
      const mapped: RecommendedCampaign[] = list.map((item: any) => ({
        id: item.id || item.campaign_id || String(Math.random()),
        title: item.title || item.campaign?.title || 'Untitled Campaign',
        description: item.description || item.campaign?.description || '',
        platform: item.platform || item.campaign?.platform || 'instagram',
        category: item.category || item.campaign?.category || 'General',
        budget: Number(item.budget || item.campaign?.budget || 0),
        start_date: item.start_date || item.campaign?.start_date || new Date().toISOString(),
        end_date: item.end_date || item.campaign?.end_date || new Date().toISOString(),
        brand: {
          company_name: item.brand?.company_name || item.campaign?.brand?.company_name || 'Brand',
          website: item.brand?.website || item.campaign?.brand?.website,
        },
        aiMatchScore: Number(item.aiMatchScore || item.match_score || item.matchScore || 0),
        estimatedRoi: Number(item.estimatedRoi || item.estimated_roi || item.estimatedROI || 0),
        successProbability: Number(item.successProbability || item.success_probability || 0),
        matchReasons: item.matchReasons || item.match_reasons || item.reasons || [],
        requirements: item.requirements || item.campaign?.requirements || '',
        location: item.location || item.campaign?.location,
      }))

      setCampaigns(mapped)
    } catch (error) {
      console.error('Failed to load recommendations:', error)
      toast.error('Failed to load campaign recommendations')
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  const refreshRecommendations = async () => {
    setRefreshing(true)
    await loadRecommendations()
    setRefreshing(false)
    toast.success('Recommendations refreshed!')
  }

  const filterCampaigns = () => {
    let filtered = campaigns

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((c) => c.category === selectedCategory)
    }

    if (selectedPlatform !== 'all') {
      filtered = filtered.filter((c) => c.platform === selectedPlatform)
    }

    if (minScore > 0) {
      filtered = filtered.filter((c) => c.aiMatchScore >= minScore)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.brand.company_name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query)
      )
    }

    // Sort by match score descending
    filtered.sort((a, b) => b.aiMatchScore - a.aiMatchScore)

    setFilteredCampaigns(filtered)
  }

  const getScoreLabel = (score: number) => {
    if (score >= 95) return 'Perfect Match'
    if (score >= 90) return 'Excellent'
    if (score >= 85) return 'Very Good'
    if (score >= 80) return 'Good'
    return 'Fair'
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Sparkles className="w-8 h-8 mr-3 text-purple-600" />
              AI-Powered Campaign Recommendations
            </h1>
            <p className="text-gray-600">
              Campaigns perfectly matched to your profile using advanced AI analysis
            </p>
          </div>
          <button
            onClick={refreshRecommendations}
            disabled={refreshing}
            className="btn-outline flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* AI Insights Banner */}
        <div className="card bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
          <div className="flex items-start gap-4">
            <Zap className="w-12 h-12 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">How AI Matching Works</h3>
              <p className="text-sm text-purple-100">
                Our machine learning models analyze over 50 factors including your audience demographics,
                engagement patterns, content style, past campaign performance, and brand alignment to recommend
                campaigns with the highest success probability. The match score represents how well a campaign
                fits your unique profile.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="input-field pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="input-field"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="fashion">Fashion</option>
            <option value="technology">Technology</option>
            <option value="fitness">Fitness</option>
            <option value="travel">Travel</option>
            <option value="food">Food & Beverage</option>
            <option value="beauty">Beauty</option>
          </select>

          {/* Platform Filter */}
          <select
            className="input-field"
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="twitter">Twitter</option>
          </select>

          {/* Min Score Filter */}
          <select
            className="input-field"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          >
            <option value="0">Any Match Score</option>
            <option value="95">95%+ (Perfect Match)</option>
            <option value="90">90%+ (Excellent)</option>
            <option value="85">85%+ (Very Good)</option>
            <option value="80">80%+ (Good)</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing <span className="font-semibold">{filteredCampaigns.length}</span> of{' '}
          <span className="font-semibold">{campaigns.length}</span> recommended campaigns
        </p>
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="card text-center py-12">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No campaigns match your current filters</p>
          <button
            onClick={() => {
              setSelectedCategory('all')
              setSelectedPlatform('all')
              setMinScore(0)
              setSearchQuery('')
            }}
            className="btn-outline mt-4"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCampaigns.map((campaign, index) => (
            <div
              key={campaign.id}
              className="card hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-purple-200"
            >
              {/* Top Badge for Top Matches */}
              {index === 0 && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    🏆 TOP MATCH
                  </span>
                </div>
              )}

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Campaign Info */}
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-lg flex items-center justify-center text-white font-bold">
                          {campaign.brand.company_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{campaign.title}</h3>
                          <p className="text-sm text-gray-600">{campaign.brand.company_name}</p>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3">{campaign.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium capitalize">
                          {campaign.platform}
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium capitalize">
                          {campaign.category}
                        </span>
                        {campaign.location && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {campaign.location}
                          </span>
                        )}
                      </div>

                      {/* Campaign Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-semibold">${campaign.budget.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                          <span>
                            {new Date(campaign.start_date).toLocaleDateString()} -{' '}
                            {new Date(campaign.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        {campaign.requirements && (
                          <div className="col-span-2 flex items-start text-gray-600">
                            <Target className="w-4 h-4 mr-2 text-purple-600 mt-0.5" />
                            <span>{campaign.requirements}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Why This Matches */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-start gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-purple-900 mb-2">Why This Is a Great Match:</h4>
                        <ul className="space-y-1">
                          {campaign.matchReasons.map((reason, idx) => (
                            <li key={idx} className="text-xs text-purple-800 flex items-start">
                              <span className="text-purple-600 mr-2">✓</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Scores Sidebar */}
                <div className="lg:w-64 space-y-4">
                  {/* Match Score */}
                  <div className="card bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
                    <div className="text-center">
                      <Zap className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm font-medium mb-1">AI Match Score</p>
                      <p className="text-4xl font-bold mb-1">{campaign.aiMatchScore.toFixed(1)}%</p>
                      <p className="text-xs text-purple-200">{getScoreLabel(campaign.aiMatchScore)}</p>
                    </div>
                  </div>

                  {/* ROI */}
                  <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">Estimated ROI</span>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{campaign.estimatedRoi}%</p>
                    <p className="text-xs text-gray-600 mt-1">Expected return on investment</p>
                  </div>

                  {/* Success Rate */}
                  <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">Success Rate</span>
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {(campaign.successProbability * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Predicted success probability</p>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => navigate(`/creator/campaigns/${campaign.id}/express-interest`)}
                    className="btn-primary w-full flex items-center justify-center"
                  >
                    Express Interest
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
