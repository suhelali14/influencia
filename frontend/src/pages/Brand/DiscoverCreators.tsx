import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import Pagination from '../../components/Pagination'
import { Search, Filter, Users, TrendingUp, Star, MapPin, CheckCircle, Loader2, RefreshCw, Instagram, Youtube, Play, MessageCircle } from 'lucide-react'
import { creatorsApi, type Creator, type PaginatedResponse } from '../../api/creators'
import toast from 'react-hot-toast'

const formatNumber = (n: number | string): string => {
  const num = Number(n) || 0
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const platformIcon = (p: string) => {
  switch (p?.toLowerCase()) {
    case 'instagram': return <Instagram className="w-4 h-4 text-pink-500" />
    case 'youtube': return <Youtube className="w-4 h-4 text-red-500" />
    case 'tiktok': return <Play className="w-4 h-4 text-gray-800" />
    case 'twitter': return <MessageCircle className="w-4 h-4 text-blue-400" />
    default: return null
  }
}

export default function DiscoverCreators() {
  const navigate = useNavigate()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'rating' | 'followers' | 'campaigns'>('rating')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [allCategories, setAllCategories] = useState<string[]>([])

  const sortFieldMap: Record<string, string> = {
    rating: 'overall_rating',
    campaigns: 'total_campaigns',
    followers: 'total_earnings',
  }

  const loadCreators = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page,
        pageSize,
        sortBy: sortFieldMap[sortBy] || 'overall_rating',
        sortOrder: 'DESC' as const,
      }
      const result: PaginatedResponse<Creator> = searchQuery.trim()
        ? await creatorsApi.search(searchQuery.trim(), params)
        : await creatorsApi.getAll(params)

      setCreators(result.data || [])
      setTotalCount(result.meta.totalCount)
      setTotalPages(result.meta.totalPages)

      // Build categories from current page (first load uses all data)
      if (result.data.length > 0) {
        setAllCategories(prev => {
          const merged = new Set([...prev, ...result.data.flatMap(c => c.categories || [])])
          return [...merged].sort()
        })
      }
    } catch (err) {
      console.error('Failed to load creators:', err)
      toast.error('Failed to load creators')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, page, pageSize, sortBy])

  // Reset page when search/filter changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery, sortBy])

  useEffect(() => {
    const timer = setTimeout(() => loadCreators(), searchQuery ? 400 : 0)
    return () => clearTimeout(timer)
  }, [loadCreators])

  // Client-side filtering for platform/category (server doesn't support these)
  const filtered = creators.filter(c => {
    if (selectedPlatform !== 'all') {
      const hasPlatform = c.social_links && Object.keys(c.social_links).some(p => p.toLowerCase() === selectedPlatform.toLowerCase())
      if (!hasPlatform) return false
    }
    if (selectedCategory !== 'all') {
      const hasCat = c.categories?.some(cat => cat.toLowerCase().includes(selectedCategory.toLowerCase()))
      if (!hasCat) return false
    }
    return true
  })

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discover Creators</h1>
          <p className="text-gray-600 mt-2">Find perfect influencers for your campaigns — {totalCount} creator{totalCount !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={loadCreators} disabled={loading} className="btn-outline flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search creators by name..."
              className="input-field pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="input-field" value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="twitter">Twitter</option>
          </select>
          <select className="input-field" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex gap-4">
          <button
            onClick={() => { setSearchQuery(''); setSelectedPlatform('all'); setSelectedCategory('all') }}
            className="btn-outline flex items-center text-sm"
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select className="input-field py-2" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="rating">Rating</option>
              <option value="campaigns">Campaigns Done</option>
              <option value="followers">Followers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading creators...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No creators found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        /* Creators Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((creator) => {
            const name = `${creator.user?.first_name || ''} ${creator.user?.last_name || ''}`.trim() || 'Creator'
            const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            const platforms = creator.social_links ? Object.keys(creator.social_links).filter(k => (creator.social_links as any)[k]) : []

            return (
              <div key={creator.id} className="card hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary-200">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {initials}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                        {name}
                        {creator.is_verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                      </h3>
                      {creator.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {creator.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {creator.overall_rating > 0 && (
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold text-yellow-700">{Number(creator.overall_rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Categories */}
                {creator.categories && creator.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {creator.categories.slice(0, 3).map(cat => (
                      <span key={cat} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{cat}</span>
                    ))}
                    {creator.categories.length > 3 && (
                      <span className="text-xs text-gray-400">+{creator.categories.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="space-y-2 mb-4 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-gray-400" />
                      Campaigns
                    </span>
                    <span className="font-semibold text-gray-900">{creator.total_campaigns || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      Earnings
                    </span>
                    <span className="font-semibold text-gray-900">₹{formatNumber(creator.total_earnings || 0)}</span>
                  </div>
                  {platforms.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Platforms</span>
                      <div className="flex items-center gap-1.5">
                        {platforms.map(p => <span key={p}>{platformIcon(p)}</span>)}
                      </div>
                    </div>
                  )}
                  {creator.languages && creator.languages.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Languages</span>
                      <span className="font-medium text-gray-700">{creator.languages.slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/brand/creator/${creator.id}`)}
                    className="btn-outline flex-1 text-sm"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to campaign selection to start matching
                      toast.success(`Select a campaign to invite ${name}`)
                      navigate('/brand/campaigns')
                    }}
                    className="btn-primary flex-1 text-sm"
                  >
                    Invite
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
    </DashboardLayout>
  )
}
