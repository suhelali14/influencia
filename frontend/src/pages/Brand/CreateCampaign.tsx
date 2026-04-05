import { useState } from 'react'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { createCampaign } from '../../store/slices/campaignsSlice'
import toast from 'react-hot-toast'
import { ArrowRight, ArrowLeft, Plus, X } from 'lucide-react'

type PlatformType = 'instagram' | 'youtube' | 'tiktok' | 'twitter'

export default function CreateCampaign() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading } = useAppSelector((state) => state.campaigns)
  const [step, setStep] = useState(1)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    platform: 'instagram' as PlatformType,
    category: '',
    start_date: '',
    end_date: '',
    // Requirements
    min_followers: '',
    min_engagement_rate: '',
    content_types: [] as string[],
    deliverables: [] as string[],
    guidelines: '',
    // Target Audience
    age_range: '',
    gender: '',
    locations: [] as string[],
    interests: [] as string[],
  })

  const [newContentType, setNewContentType] = useState('')
  const [newDeliverable, setNewDeliverable] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newInterest, setNewInterest] = useState('')

  const addItem = (type: 'content_types' | 'deliverables' | 'locations' | 'interests', value: string) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [type]: [...formData[type], value.trim()],
      })
      // Reset input
      if (type === 'content_types') setNewContentType('')
      if (type === 'deliverables') setNewDeliverable('')
      if (type === 'locations') setNewLocation('')
      if (type === 'interests') setNewInterest('')
    }
  }

  const removeItem = (type: 'content_types' | 'deliverables' | 'locations' | 'interests', index: number) => {
    setFormData({
      ...formData,
      [type]: formData[type].filter((_, i) => i !== index),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const campaignData = {
        title: formData.title,
        description: formData.description,
        platform: formData.platform,
        category: formData.category,
        budget: Number(formData.budget),
        start_date: formData.start_date,
        end_date: formData.end_date,
        requirements: {
          min_followers: formData.min_followers ? Number(formData.min_followers) : undefined,
          min_engagement_rate: formData.min_engagement_rate ? Number(formData.min_engagement_rate) : undefined,
          content_types: formData.content_types.length > 0 ? formData.content_types : undefined,
          deliverables: formData.deliverables.length > 0 ? formData.deliverables : undefined,
        },
        target_audience: {
          age_range: formData.age_range || undefined,
          gender: formData.gender || undefined,
          locations: formData.locations.length > 0 ? formData.locations : undefined,
          interests: formData.interests.length > 0 ? formData.interests : undefined,
        },
      }

      const newCampaign = await dispatch(createCampaign(campaignData)).unwrap()
      toast.success('Campaign created! Finding perfect creators...')
      navigate(`/brand/campaigns/${newCampaign.id}/matches`)
    } catch (error: any) {
      toast.error(error || 'Failed to create campaign')
    }
  }

  const validateStep = () => {
    if (step === 1) {
      if (!formData.title || !formData.description || !formData.budget || !formData.category || !formData.start_date || !formData.end_date) {
        toast.error('Please fill all required fields')
        return false
      }
      if (new Date(formData.start_date) < new Date()) {
        toast.error('Start date must be today or in the future')
        return false
      }
      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        toast.error('End date must be after start date')
        return false
      }
    }
    return true
  }

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
          <p className="text-gray-600 mt-2">Launch your influencer marketing campaign</p>
        </div>

        {/* Progress Steps */}
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    step > s ? 'bg-primary-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-sm">
            <span className={step >= 1 ? 'text-primary-600 font-medium' : 'text-gray-600'}>Basic Info</span>
            <span className={step >= 2 ? 'text-primary-600 font-medium' : 'text-gray-600'}>Requirements</span>
            <span className={step >= 3 ? 'text-primary-600 font-medium' : 'text-gray-600'}>Audience</span>
            <span className={step >= 4 ? 'text-primary-600 font-medium' : 'text-gray-600'}>Review</span>
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Basics</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Title *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Summer Product Launch 2025"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    className="input-field"
                    rows={4}
                    placeholder="Describe your campaign objectives..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget (USD) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input-field"
                    placeholder="25000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform *
                  </label>
                  <select
                    required
                    className="input-field"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as PlatformType })}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">Twitter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    className="input-field"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    <option value="fashion">Fashion & Beauty</option>
                    <option value="tech">Technology</option>
                    <option value="food">Food & Beverage</option>
                    <option value="fitness">Health & Fitness</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="travel">Travel</option>
                    <option value="gaming">Gaming</option>
                    <option value="education">Education</option>
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="input-field"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="input-field"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Requirements */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Creator Requirements</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Followers
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="10000"
                      value={formData.min_followers}
                      onChange={(e) => setFormData({ ...formData, min_followers: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Engagement Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="input-field"
                      placeholder="3.5"
                      value={formData.min_engagement_rate}
                      onChange={(e) => setFormData({ ...formData, min_engagement_rate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Types
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="e.g., Instagram Reel, Story, Post"
                      value={newContentType}
                      onChange={(e) => setNewContentType(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addItem('content_types', newContentType)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addItem('content_types', newContentType)}
                      className="btn-primary px-4"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.content_types.map((type, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                      >
                        {type}
                        <button
                          type="button"
                          onClick={() => removeItem('content_types', index)}
                          className="hover:text-primary-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deliverables
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="e.g., 3 posts, 5 stories, 1 video"
                      value={newDeliverable}
                      onChange={(e) => setNewDeliverable(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addItem('deliverables', newDeliverable)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addItem('deliverables', newDeliverable)}
                      className="btn-primary px-4"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.deliverables.map((item, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeItem('deliverables', index)}
                          className="hover:text-primary-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guidelines & Requirements
                  </label>
                  <textarea
                    className="input-field"
                    rows={5}
                    placeholder="Specify content guidelines, brand message, dos and don'ts..."
                    value={formData.guidelines}
                    onChange={(e) => setFormData({ ...formData, guidelines: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Target Audience */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Target Audience</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age Range
                    </label>
                    <select
                      className="input-field"
                      value={formData.age_range}
                      onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
                    >
                      <option value="">Any Age</option>
                      <option value="13-17">13-17</option>
                      <option value="18-24">18-24</option>
                      <option value="25-34">25-34</option>
                      <option value="35-44">35-44</option>
                      <option value="45-54">45-54</option>
                      <option value="55+">55+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      className="input-field"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Any Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="all">All Genders</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Locations
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="e.g., USA, Canada, UK"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addItem('locations', newLocation)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addItem('locations', newLocation)}
                      className="btn-primary px-4"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.locations.map((loc, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                      >
                        {loc}
                        <button
                          type="button"
                          onClick={() => removeItem('locations', index)}
                          className="hover:text-primary-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interests & Niches
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="e.g., Fashion, Beauty, Fitness"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addItem('interests', newInterest)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addItem('interests', newInterest)}
                      className="btn-primary px-4"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => removeItem('interests', index)}
                          className="hover:text-primary-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Campaign</h2>
                
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Title:</span>
                        <span className="font-medium">{formData.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Budget:</span>
                        <span className="font-medium">${Number(formData.budget).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform:</span>
                        <span className="font-medium capitalize">{formData.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium capitalize">{formData.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{formData.start_date} to {formData.end_date}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-700">{formData.description}</p>
                    </div>
                  </div>
                  
                  {/* Requirements */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Requirements</h3>
                    <div className="space-y-2 text-sm">
                      {formData.min_followers && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Min. Followers:</span>
                          <span className="font-medium">{Number(formData.min_followers).toLocaleString()}</span>
                        </div>
                      )}
                      {formData.min_engagement_rate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Min. Engagement:</span>
                          <span className="font-medium">{formData.min_engagement_rate}%</span>
                        </div>
                      )}
                      {formData.content_types.length > 0 && (
                        <div>
                          <span className="text-gray-600">Content Types:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.content_types.map((type, i) => (
                              <span key={i} className="px-2 py-1 bg-white text-primary-700 rounded text-xs">
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {formData.deliverables.length > 0 && (
                        <div>
                          <span className="text-gray-600">Deliverables:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.deliverables.map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-white text-primary-700 rounded text-xs">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {formData.guidelines && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-700">{formData.guidelines}</p>
                      </div>
                    )}
                  </div>

                  {/* Target Audience */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Target Audience</h3>
                    <div className="space-y-2 text-sm">
                      {formData.age_range && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Age Range:</span>
                          <span className="font-medium">{formData.age_range}</span>
                        </div>
                      )}
                      {formData.gender && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gender:</span>
                          <span className="font-medium capitalize">{formData.gender}</span>
                        </div>
                      )}
                      {formData.locations.length > 0 && (
                        <div>
                          <span className="text-gray-600">Locations:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.locations.map((loc, i) => (
                              <span key={i} className="px-2 py-1 bg-white text-primary-700 rounded text-xs">
                                {loc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {formData.interests.length > 0 && (
                        <div>
                          <span className="text-gray-600">Interests:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.interests.map((int, i) => (
                              <span key={i} className="px-2 py-1 bg-white text-primary-700 rounded text-xs">
                                {int}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="btn-outline flex items-center"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>
              ) : (
                <div />
              )}
              
              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary flex items-center"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Campaign'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
