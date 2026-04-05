import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { Instagram, Youtube, RefreshCw, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchSocialAccounts, disconnectSocialAccount, syncSocialAccount, syncAllAccounts } from '../../store/slices/socialSlice'
import { socialApi } from '../../api/social'
import SocialAccountDetails from '../../components/Social/SocialAccountDetails'
import toast from 'react-hot-toast'

export default function SocialConnect() {
  const dispatch = useAppDispatch()
  const { accounts, loading, syncing } = useAppSelector((state) => state.social)
  const [searchParams, setSearchParams] = useSearchParams()
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchSocialAccounts())
    
    // Handle OAuth callback result
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const platform = searchParams.get('platform')
    
    if (success === 'true' && platform) {
      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully!`)
      dispatch(fetchSocialAccounts()) // Refresh accounts
      // Clear query params
      setSearchParams({})
    } else if (error && platform) {
      toast.error(`Failed to connect ${platform}: ${decodeURIComponent(error)}`)
      setSearchParams({})
    }
  }, [dispatch, searchParams, setSearchParams])

  const handleDisconnect = async (platform: string) => {
    if (window.confirm(`Are you sure you want to disconnect ${platform}?`)) {
      try {
        await dispatch(disconnectSocialAccount(platform)).unwrap()
        toast.success(`${platform} disconnected successfully`)
      } catch (error) {
        toast.error('Failed to disconnect account')
      }
    }
  }

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform)
    
    try {
      // Get OAuth URL from backend
      const { authUrl } = await socialApi.getOAuthUrl(platform)
      
      // Redirect to OAuth provider
      window.location.href = authUrl
    } catch (error: any) {
      console.error('OAuth error:', error)
      toast.error(error.response?.data?.message || `Failed to start ${platform} connection`)
      setConnectingPlatform(null)
    }
  }

  const handleSync = async (platform: string) => {
    try {
      await dispatch(syncSocialAccount(platform)).unwrap()
      toast.success(`${platform} metrics synced successfully`)
    } catch (error: any) {
      toast.error(error || 'Failed to sync metrics')
    }
  }

  const handleSyncAll = async () => {
    try {
      await dispatch(syncAllAccounts()).unwrap()
      toast.success('All platforms synced successfully')
    } catch (error: any) {
      toast.error('Some platforms failed to sync')
    }
  }

  const platformIcons: Record<string, LucideIcon | null> = {
    instagram: Instagram,
    youtube: Youtube,
    tiktok: null,
    twitter: null,
  }

  const platformEmojis: Record<string, string> = {
    tiktok: '🎵',
    twitter: '🐦',
  }

  const platformColors: Record<string, string> = {
    instagram: 'pink',
    youtube: 'red',
    tiktok: 'gray',
    twitter: 'blue',
  }

  const allPlatforms = ['instagram', 'youtube', 'tiktok', 'twitter']

  const getTimeSinceSync = (lastSynced: string | undefined) => {
    if (!lastSynced) return 'Never'
    const diff = Date.now() - new Date(lastSynced).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const isStale = (lastSynced: string | undefined) => {
    if (!lastSynced) return true
    const hours = (Date.now() - new Date(lastSynced).getTime()) / (1000 * 60 * 60)
    return hours > 6
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Social Accounts</h1>
          <p className="text-gray-600 mt-2">Connect and manage your social media accounts</p>
        </div>
        {accounts.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync All
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading accounts...</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-6">
            {allPlatforms.map((platformName) => {
              const account = accounts.find((acc) => acc.platform === platformName)
              const Icon = platformIcons[platformName]
              const emoji = platformEmojis[platformName]
              const color = platformColors[platformName] || 'gray'
              const name = platformName.charAt(0).toUpperCase() + platformName.slice(1)
              const isConnecting = connectingPlatform === platformName

              return (
                <div key={platformName} className="card relative">
                  {/* Stale indicator */}
                  {account && isStale(account.last_synced_at) && (
                    <div className="absolute top-2 right-2">
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        Needs sync
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        color === 'pink'
                          ? 'bg-pink-100'
                          : color === 'red'
                            ? 'bg-red-100'
                            : color === 'blue'
                              ? 'bg-blue-100'
                              : 'bg-gray-100'
                      }`}
                    >
                      {Icon ? (
                        <Icon
                          className={`w-6 h-6 ${
                            color === 'pink'
                              ? 'text-pink-600'
                              : color === 'red'
                                ? 'text-red-600'
                                : color === 'blue'
                                  ? 'text-blue-600'
                                  : 'text-gray-600'
                          }`}
                        />
                      ) : (
                        <div className="text-2xl">{emoji}</div>
                      )}
                    </div>
                    {account ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Not Connected
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{name}</h3>

                  {account ? (
                    <>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Username</span>
                          <span className="font-semibold text-gray-900">@{account.username}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Followers</span>
                          <span className="font-semibold text-gray-900">
                            {account.followers_count.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Engagement</span>
                          <span className="font-semibold text-gray-900 flex items-center gap-1">
                            {Number(account.engagement_rate).toFixed(1)}%
                            {account.metrics?.quality_score && (
                              <TrendingUp className="w-3 h-3 text-green-500" />
                            )}
                          </span>
                        </div>
                        {account.metrics?.quality_score && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Quality Score</span>
                            <span className="font-semibold text-primary-600">
                              {account.metrics.quality_score}/100
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Last Sync</span>
                          <span className={`font-medium ${isStale(account.last_synced_at) ? 'text-amber-600' : 'text-gray-500'}`}>
                            {getTimeSinceSync(account.last_synced_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSync(platformName)}
                          disabled={syncing}
                          className="btn-outline flex-1 flex items-center justify-center gap-1"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                          Sync
                        </button>
                        <button
                          onClick={() => handleDisconnect(platformName)}
                          className="btn-outline text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Disconnect
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(platformName)}
                      disabled={isConnecting}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        `Connect ${name}`
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Detailed Account Analytics */}
          {accounts.length > 0 && (
            <div className="mt-8 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Connected Accounts - Detailed Analytics</h2>
              {accounts.map((account) => (
                <SocialAccountDetails
                  key={account.id}
                  account={account}
                  onSync={() => handleSync(account.platform)}
                  syncing={syncing}
                />
              ))}
            </div>
          )}

          {/* OAuth Info Card */}
          <div className="card mt-8 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">🔐 Secure OAuth Connection</h3>
            <p className="text-blue-800 text-sm">
              When you connect your social accounts, you'll be redirected to each platform's official login page.
              We never see or store your platform passwords. We only receive permission to read your public metrics
              and analytics data.
            </p>
            <ul className="mt-3 text-sm text-blue-700 space-y-1">
              <li>✓ Your credentials stay with the platform</li>
              <li>✓ Tokens are encrypted and stored securely</li>
              <li>✓ You can disconnect at any time</li>
              <li>✓ Metrics are synced every 6 hours automatically</li>
            </ul>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
