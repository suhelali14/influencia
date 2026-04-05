import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import { fetchMyCreatorProfile, updateCreatorProfile, createCreatorProfile } from '../../store/slices/creatorsSlice'
import toast from 'react-hot-toast'

export default function CreatorProfile() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { currentCreator, loading, error } = useAppSelector((state) => state.creators)

  const [formData, setFormData] = useState({
    bio: '',
    phone: '',
    location: '',
    categories: [] as string[],
    languages: [] as string[],
  })

  const [categoryInput, setCategoryInput] = useState('')
  const [languageInput, setLanguageInput] = useState('')

  useEffect(() => {
    dispatch(fetchMyCreatorProfile())
  }, [dispatch])

  useEffect(() => {
    if (currentCreator) {
      setFormData({
        bio: currentCreator.bio || '',
        phone: currentCreator.phone || '',
        location: currentCreator.location || '',
        categories: currentCreator.categories || [],
        languages: currentCreator.languages || [],
      })
    }
  }, [currentCreator])

  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (currentCreator) {
        await dispatch(updateCreatorProfile({ id: currentCreator.id, data: formData })).unwrap()
        toast.success('Profile updated successfully!')
      } else {
        await dispatch(createCreatorProfile(formData)).unwrap()
        toast.success('Profile created successfully!')
      }
    } catch (err) {
      // Error already handled by Redux
    }
  }

  const addCategory = () => {
    if (categoryInput && !formData.categories.includes(categoryInput)) {
      setFormData({ ...formData, categories: [...formData.categories, categoryInput] })
      setCategoryInput('')
    }
  }

  const removeCategory = (category: string) => {
    setFormData({ ...formData, categories: formData.categories.filter(c => c !== category) })
  }

  const addLanguage = () => {
    if (languageInput && !formData.languages.includes(languageInput)) {
      setFormData({ ...formData, languages: [...formData.languages, languageInput] })
      setLanguageInput('')
    }
  }

  const removeLanguage = (language: string) => {
    setFormData({ ...formData, languages: formData.languages.filter(l => l !== language) })
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">Manage your personal information</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.first_name} {user?.last_name}</h2>
            <p className="text-gray-600 mt-1">{user?.email}</p>
            {currentCreator && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rating:</span>
                  <span className="font-semibold">{Number(currentCreator.overall_rating).toFixed(1)}/5.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Campaigns:</span>
                  <span className="font-semibold">{currentCreator.total_campaigns}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Earnings:</span>
                  <span className="font-semibold">${Number(currentCreator.total_earnings).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="mt-6">
              <button className="btn-primary w-full">Upload Photo</button>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Add category (e.g., Fashion, Tech)"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  />
                  <button type="button" onClick={addCategory} className="btn-outline px-4">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {category}
                      <button type="button" onClick={() => removeCategory(category)} className="hover:text-primary-900">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Languages
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Add language (e.g., English, Spanish)"
                    value={languageInput}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                  />
                  <button type="button" onClick={addLanguage} className="btn-outline px-4">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.languages.map((language) => (
                    <span
                      key={language}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm"
                    >
                      {language}
                      <button type="button" onClick={() => removeLanguage(language)} className="hover:text-secondary-900">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="btn-outline" onClick={() => dispatch(fetchMyCreatorProfile())}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
