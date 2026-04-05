import { useState, useEffect } from 'react'
import { authApi, ActiveSession } from '../../api/auth'
import { Monitor, Smartphone, Globe, Clock, Shield, Trash2, RefreshCw } from 'lucide-react'

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await authApi.getActiveSessions()
      setSessions(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRevoke = async (sessionId: string) => {
    try {
      setRevoking(sessionId)
      await authApi.revokeSession(sessionId)
      setSessions(sessions.filter(s => s.sessionId !== sessionId))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke session')
    } finally {
      setRevoking(null)
    }
  }

  const handleLogoutAll = async () => {
    if (!confirm('This will log you out from all devices including this one. Continue?')) {
      return
    }
    try {
      setLoading(true)
      await authApi.logoutAllDevices()
      // Redirect to login
      window.location.href = '/login'
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to logout from all devices')
      setLoading(false)
    }
  }

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Globe className="w-5 h-5" />
    
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-5 h-5" />
    }
    return <Monitor className="w-5 h-5" />
  }

  const getDeviceName = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Device'
    
    const ua = userAgent.toLowerCase()
    
    // Browser detection
    let browser = 'Unknown Browser'
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
    else if (ua.includes('edg')) browser = 'Edge'
    
    // OS detection
    let os = ''
    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('mac')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
    
    return `${browser}${os ? ` on ${os}` : ''}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading sessions...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield className="w-6 h-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-semibold">Active Sessions</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSessions}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {sessions.length > 1 && (
            <button
              onClick={handleLogoutAll}
              className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Logout All Devices
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active sessions found</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.sessionId}
              className={`border rounded-lg p-4 ${
                session.isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${session.isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                    {getDeviceIcon(session.userAgent)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getDeviceName(session.userAgent)}</span>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Last active: {getTimeAgo(session.lastAccessedAt)}</span>
                      </div>
                      {session.ipAddress && (
                        <div className="mt-0.5">IP: {session.ipAddress}</div>
                      )}
                      <div className="mt-0.5 text-xs text-gray-400">
                        Created: {formatDate(session.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevoke(session.sessionId)}
                    disabled={revoking === session.sessionId}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Revoke session"
                  >
                    {revoking === session.sessionId ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">About Sessions</h3>
        <p className="text-sm text-gray-500">
          Sessions are automatically managed and secured. Each session is stored in Redis and 
          expires after 7 days of inactivity. You can have up to 5 active sessions across different devices.
        </p>
      </div>
    </div>
  )
}
