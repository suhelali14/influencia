import { useAppSelector } from '../../store/hooks'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { logout, fetchProfile } from '../../store/slices/authSlice'
import { useAppDispatch } from '../../store/hooks'
import { authApi } from '../../api/auth'
import toast from 'react-hot-toast'
import {
  LayoutDashboard,
  User,
  Briefcase,
  BarChart3,
  DollarSign,
  Building,
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  ShieldAlert,
  Wrench,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  Sliders,
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Developer Console state
  const [devConsoleOpen, setDevConsoleOpen] = useState(false)
  const [devTab, setDevTab] = useState<'profile' | 'invites'>('profile')
  const [invites, setInvites] = useState<any[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string; company_name: string } | null>(null)
  const [togglingVerification, setTogglingVerification] = useState(false)

  const fetchInvites = async () => {
    setInvitesLoading(true)
    try {
      const data = await authApi.getInvites()
      setInvites(data)
    } catch (err) {
      console.error('Failed to fetch invites:', err)
    } finally {
      setInvitesLoading(false)
    }
  }

  useEffect(() => {
    if (devConsoleOpen && devTab === 'invites') {
      fetchInvites()
    }
  }, [devConsoleOpen, devTab])

  const isCreator = user?.role === 'creator'

  const creatorNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Profile', href: '/creator/profile', icon: User },
    { name: 'Campaigns', href: '/creator/campaigns', icon: Briefcase },
    { name: 'Analytics', href: '/creator/analytics', icon: BarChart3 },
    { name: 'Earnings', href: '/creator/earnings', icon: DollarSign },
    { name: 'Social Accounts', href: '/creator/social-connect', icon: Settings },
  ]

  const brandNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Campaigns', href: '/brand/campaigns', icon: Briefcase },
    { name: 'Discover Creators', href: '/brand/discover', icon: Search },
    { name: 'Analytics', href: '/brand/analytics', icon: BarChart3 },
    { name: 'Billing & Plans', href: '/brand/billing', icon: DollarSign },
    { name: 'Settings', href: '/brand/settings', icon: Settings },
  ]

  const navigation = isCreator ? creatorNav : brandNav

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              SafarCollab
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-semibold mr-3">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-600 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-16">
          <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <button className="relative text-gray-600 hover:text-gray-900">
              <Bell className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                3
              </span>
            </button>
          </div>
        </header>

        {/* Creator Verification Alert Banner */}
        {isCreator && !user?.is_verified && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 text-amber-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Creator Account Unverified</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  Your creator portal is currently unverified. Vetting processes must complete before brands can directly discover or collaborate with you.
                </p>
              </div>
            </div>
            <Link 
              to="/creator/social-connect"
              className="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-all shrink-0 hover:scale-105"
            >
              Verify Accounts
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>

      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Developer Console Floating Widget */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
        {/* Console Panel */}
        {devConsoleOpen && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/60 w-[420px] max-h-[600px] overflow-hidden flex flex-col mb-4 animate-fade-in-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-800 px-4 py-3 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 animate-pulse" />
                <span className="font-bold text-sm tracking-wide">Developer Sandbox Control</span>
              </div>
              <button 
                onClick={() => setDevConsoleOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-950 border-b border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setDevTab('profile')}
                className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
                  devTab === 'profile' 
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 inline mr-1.5" />
                Creator Vetting
              </button>
              <button
                onClick={() => setDevTab('invites')}
                className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
                  devTab === 'invites' 
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building className="w-3.5 h-3.5 inline mr-1.5" />
                Brand Invites ({invites.filter(i => i.status === 'pending').length})
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 text-xs space-y-4 max-h-[380px] bg-slate-900/40">
              {devTab === 'profile' ? (
                /* Profile Tab */
                <div className="space-y-4">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <p className="font-semibold text-slate-300">Active Session Profile</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-400">
                      <div>Name: <span className="text-slate-200">{user?.first_name} {user?.last_name}</span></div>
                      <div>Role: <span className="text-slate-200 font-mono">{user?.role}</span></div>
                      <div className="col-span-2">Email: <span className="text-slate-200">{user?.email}</span></div>
                    </div>
                  </div>

                  {isCreator ? (
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center space-y-3">
                      <div>
                        {user?.is_verified ? (
                          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800">
                            <CheckCircle className="w-6 h-6" />
                          </div>
                        ) : (
                          <div className="mx-auto w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center border border-rose-800">
                            <XCircle className="w-6 h-6 animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm">
                          Verification Status: {user?.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          You can instantly toggle this creator's verification status below to test unverified dashboard alerts vs verified actions.
                        </p>
                      </div>
                      <button
                        disabled={togglingVerification}
                        onClick={async () => {
                          if (!user) return
                          setTogglingVerification(true)
                          try {
                            const nextState = !user.is_verified
                            await authApi.verifyCreator(user.id, nextState)
                            await dispatch(fetchProfile())
                            toast.success(`Creator successfully ${nextState ? 'verified' : 'unverified'}!`)
                          } catch (err) {
                            toast.error('Failed to update creator verification status')
                          } finally {
                            setTogglingVerification(false)
                          }
                        }}
                        className={`w-full py-2 rounded-lg font-semibold transition-all ${
                          user?.is_verified
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {togglingVerification 
                          ? 'Processing...' 
                          : user?.is_verified 
                            ? 'Revoke Verification' 
                            : 'Approve & Verify Account'
                        }
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950/40 border border-slate-800 text-slate-400 rounded-xl text-center">
                      ℹ️ Verification statuses are exclusive to Creator accounts. You are currently logged in as a <strong>{user?.role}</strong>.
                    </div>
                  )}
                </div>
              ) : (
                /* Brand Invites Tab */
                <div className="space-y-3">
                  {createdCredentials && (
                    <div className="bg-indigo-950/80 border border-indigo-800 p-3.5 rounded-xl space-y-2 text-indigo-200">
                      <p className="font-bold text-xs flex items-center gap-1.5 text-white">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Brand Onboarded successfully!
                      </p>
                      <p className="text-[11px] text-indigo-300">
                        Use these credentials to sign in and test out the Brand portal:
                      </p>
                      <div className="bg-indigo-950 p-2.5 rounded-lg border border-indigo-800 font-mono space-y-1 select-all relative group">
                        <div>Email: {createdCredentials.email}</div>
                        <div>Pass: {createdCredentials.tempPassword}</div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPass: ${createdCredentials.tempPassword}`)
                            toast.success('Credentials copied!')
                          }}
                          className="absolute right-2 top-2 p-1 hover:bg-indigo-900 rounded text-indigo-400"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setCreatedCredentials(null)
                          handleLogout()
                        }}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg mt-1 transition-all"
                      >
                        Sign In as {createdCredentials.company_name} →
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-slate-300">Onboarding Request Inbox</p>
                    <button 
                      onClick={fetchInvites}
                      className="p-1 hover:bg-slate-800 rounded transition-all text-slate-400"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${invitesLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {invitesLoading ? (
                    <div className="text-center text-slate-400 py-6">Loading brand invites...</div>
                  ) : invites.length === 0 ? (
                    <div className="text-center text-slate-500 py-6 border border-dashed border-slate-800 rounded-xl">No pending invites. Request one on registration page!</div>
                  ) : (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                      {invites.map((invite) => (
                        <div key={invite.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-200 truncate">{invite.company_name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{invite.email}</p>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              By: {invite.first_name} {invite.last_name || ''}
                            </p>
                          </div>
                          {invite.status === 'accepted' ? (
                            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full shrink-0">
                              Accepted
                            </span>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  toast.loading('Onboarding Brand and creating Tenant profile...')
                                  const res = await authApi.onboardBrand({
                                    email: invite.email,
                                    company_name: invite.company_name,
                                    first_name: invite.first_name || 'Admin',
                                    last_name: invite.last_name || 'User',
                                  })
                                  toast.dismiss()
                                  toast.success('Brand Account generated!')
                                  setCreatedCredentials({
                                    email: invite.email,
                                    tempPassword: res.tempPassword,
                                    company_name: invite.company_name,
                                  })
                                  fetchInvites()
                                } catch (err: any) {
                                  toast.dismiss()
                                  toast.error(err.response?.data?.message || 'Failed to onboard brand')
                                }
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg shrink-0 transition-all text-[11px]"
                            >
                              Onboard
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
              <span>Neon Database Synced</span>
              <span>v1.2.0 (Stable)</span>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <button
          onClick={() => setDevConsoleOpen(!devConsoleOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-full text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 ${
            devConsoleOpen 
              ? 'bg-slate-800 hover:bg-slate-700 border border-slate-600/40' 
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span className="font-bold text-xs uppercase tracking-wider">Dev Sandbox</span>
        </button>
      </div>
    </div>
  )
}

