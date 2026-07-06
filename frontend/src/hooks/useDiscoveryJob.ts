import { useEffect, useState, useRef, useCallback } from 'react'
import api from '../api/client'

export type JobStatus = 'none' | 'pending' | 'running' | 'done' | 'failed' | 'cancelled'

export interface DiscoveryJobState {
  status: JobStatus
  progress: number       // 0–100
  totalFound: number
  triggeredBy: string
  completedAt: string | null
  errorMsg: string | null
  isLive: boolean        // true when SSE is connected
}

const DEFAULT_STATE: DiscoveryJobState = {
  status: 'none',
  progress: 0,
  totalFound: 0,
  triggeredBy: '',
  completedAt: null,
  errorMsg: null,
  isLive: false,
}

/**
 * useDiscoveryJob
 * ================
 * Custom hook that tracks the background discovery job state for a campaign
 * using Server-Sent Events (SSE). Falls back to polling if SSE fails.
 *
 * @param campaignId  Campaign UUID
 * @param onComplete  Called when job status changes to 'done' — trigger a data reload
 *
 * Usage:
 *   const { job, startSync } = useDiscoveryJob(campaignId, () => loadCreators(1))
 */
export function useDiscoveryJob(
  campaignId: string | undefined,
  onComplete?: () => void,
) {
  const [job, setJob] = useState<DiscoveryJobState>(DEFAULT_STATE)
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const prevStatusRef = useRef<JobStatus>('none')

  // ── Fetch job status via REST (one-shot) ─────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!campaignId) return
    try {
      const baseUrl = (api.defaults.baseURL || '').replace(/\/$/, '')
      const token = localStorage.getItem('token') || ''
      const res = await fetch(`${baseUrl}/discovery/campaign/${campaignId}/job-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const next: DiscoveryJobState = {
        status: data.status || 'none',
        progress: data.progress || 0,
        totalFound: data.total_found || 0,
        triggeredBy: data.triggered_by || '',
        completedAt: data.completed_at || null,
        errorMsg: data.error_msg || null,
        isLive: false,
      }
      setJob(next)

      // Fire onComplete exactly once when transitioning to done
      if (data.status === 'done' && prevStatusRef.current !== 'done') {
        onComplete?.()
      }
      prevStatusRef.current = data.status || 'none'
    } catch { /* ignore */ }
  }, [campaignId, onComplete])

  // ── Connect SSE stream ────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (!campaignId) return
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const baseUrl = (api.defaults.baseURL || '').replace(/\/$/, '')
    const token = localStorage.getItem('token') || ''
    const url = `${baseUrl}/discovery/campaign/${campaignId}/status-stream?token=${token}`

    try {
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onopen = () => {
        setJob(prev => ({ ...prev, isLive: true }))
      }

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data)
          const next: Partial<DiscoveryJobState> = {
            status: data.status || 'none',
            progress: data.progress || 0,
            totalFound: data.total_found || 0,
            triggeredBy: data.triggered_by || '',
            completedAt: data.completed_at || null,
            isLive: true,
          }
          setJob(prev => ({ ...prev, ...next }))

          if (data.status === 'done' && prevStatusRef.current !== 'done') {
            onComplete?.()
          }
          prevStatusRef.current = data.status || 'none'

          // If job is terminal, close SSE — no more updates coming
          if (['done', 'failed', 'cancelled', 'none'].includes(data.status)) {
            es.close()
            eventSourceRef.current = null
            setJob(prev => ({ ...prev, isLive: false }))
          }
        } catch { /* ignore parse errors */ }
      }

      es.onerror = () => {
        es.close()
        eventSourceRef.current = null
        setJob(prev => ({ ...prev, isLive: false }))
        // Fallback to polling
        _startPolling()
      }
    } catch {
      // SSE not supported — use polling
      _startPolling()
    }
  }, [campaignId, onComplete, fetchStatus])

  // ── Polling fallback (every 4s while job is active) ───────────────
  const _startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    pollTimerRef.current = window.setInterval(async () => {
      await fetchStatus()
      // Stop polling when job is terminal
      if (['done', 'failed', 'cancelled', 'none'].includes(prevStatusRef.current)) {
        clearInterval(pollTimerRef.current!)
        pollTimerRef.current = null
      }
    }, 4000)
  }, [fetchStatus])

  // ── startSync: trigger a new discovery job ────────────────────────
  const startSync = useCallback(async (forceRefresh = false) => {
    if (!campaignId) return
    setJob(prev => ({ ...prev, status: 'pending', progress: 0 }))
    prevStatusRef.current = 'pending'
    try {
      const baseUrl = (api.defaults.baseURL || '').replace(/\/$/, '')
      const token = localStorage.getItem('token') || ''
      await fetch(`${baseUrl}/discovery/campaign/${campaignId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ forceRefresh }),
      })
      // Connect SSE to track the new job
      connectSSE()
    } catch (err) {
      setJob(prev => ({ ...prev, status: 'failed', errorMsg: 'Failed to start sync' }))
    }
  }, [campaignId, connectSSE])

  // ── Mount: fetch initial status, then connect SSE if job is active
  useEffect(() => {
    if (!campaignId) return

    fetchStatus().then(() => {
      const isActive = ['pending', 'running'].includes(prevStatusRef.current)
      if (isActive) connectSSE()
    })

    return () => {
      eventSourceRef.current?.close()
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [campaignId])

  return { job, startSync, refetch: fetchStatus }
}
