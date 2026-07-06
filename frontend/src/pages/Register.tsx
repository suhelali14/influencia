import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { register, clearError } from '../store/slices/authSlice'
import { authApi } from '../api/auth'
import toast from 'react-hot-toast'
import { Mail, Lock, User, UserCircle, ArrowRight, Building, Sparkles } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error } = useAppSelector((state) => state.auth)
  
  const [isBrandFlow, setIsBrandFlow] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  // Creator Form Data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'creator',
    first_name: '',
    last_name: '',
  })

  // Brand Invite Request Data
  const [inviteData, setInviteData] = useState({
    email: '',
    company_name: '',
    first_name: '',
    last_name: '',
  })

  useEffect(() => {
    if (error) {
      toast.error(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    const { confirmPassword, ...registerData } = formData
    const result = await dispatch(register(registerData))
    
    if (register.fulfilled.match(result)) {
      toast.success('Account created successfully! Welcome onboard.')
      navigate('/dashboard')
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    try {
      await authApi.requestInvite(inviteData)
      setInviteSuccess(true)
      toast.success('Onboarding invite request sent successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit invite request')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Join SafarCollab</h1>
          <p className="text-gray-600">
            {isBrandFlow ? 'Exclusive, invite-only brand onboarding' : 'Create your creator account and start collaborating'}
          </p>
        </div>

        <div className="card shadow-xl border border-gray-100 bg-white/80 backdrop-blur-sm p-6 rounded-2xl">
          {/* Flow Tab Selector */}
          <div className="flex border-b border-gray-100 pb-4 mb-6">
            <button
              onClick={() => {
                setIsBrandFlow(false)
                setInviteSuccess(false)
              }}
              className={`flex-1 pb-2 text-center font-semibold text-sm transition-all border-b-2 ${
                !isBrandFlow ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <UserCircle className="w-4 h-4 inline-block mr-2" />
              Creator SignUp
            </button>
            <button
              onClick={() => setIsBrandFlow(true)}
              className={`flex-1 pb-2 text-center font-semibold text-sm transition-all border-b-2 ${
                isBrandFlow ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Building className="w-4 h-4 inline-block mr-2" />
              Brand & Agency
            </button>
          </div>

          {!isBrandFlow ? (
            /* Creator Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    className="input-field pl-10"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="input-field pl-10"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    className="input-field pl-10"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center py-2.5 rounded-xl shadow-lg shadow-primary-500/20">
                  {loading ? (
                    'Creating account...'
                  ) : (
                    <>
                      Create Creator Account
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : inviteSuccess ? (
            /* Brand Onboarding Success Screen */
            <div className="text-center py-8 px-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Invite Request Received!</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Thank you! We maintain high platform quality by manually onboarding Brand and Agency partners. 
                Our onboarding team will contact you at <strong className="text-gray-800">{inviteData.email}</strong> shortly.
              </p>
              <button
                onClick={() => {
                  setInviteSuccess(false)
                  setIsBrandFlow(false)
                }}
                className="btn-secondary w-full py-2 rounded-xl text-sm"
              >
                Back to Creator SignUp
              </button>
            </div>
          ) : (
            /* Brand Invitation Request Form */
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs leading-relaxed">
                ℹ️ <strong>Invite-Only Onboarding</strong>: SafarCollab is currently invite-only for Brands & Agencies to ensure optimal collaborations. Submit your details below to request access.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Company / Agency Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    className="input-field pl-10"
                    placeholder="Enter company name"
                    value={inviteData.company_name}
                    onChange={(e) => setInviteData({ ...inviteData, company_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Contact first name"
                    value={inviteData.first_name}
                    onChange={(e) => setInviteData({ ...inviteData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Contact last name"
                    value={inviteData.last_name}
                    onChange={(e) => setInviteData({ ...inviteData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Company Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    className="input-field pl-10"
                    placeholder="you@company.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={inviteLoading} className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center py-2.5 rounded-xl shadow-lg">
                  {inviteLoading ? (
                    'Submitting Request...'
                  ) : (
                    <>
                      Request Brand Access
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

