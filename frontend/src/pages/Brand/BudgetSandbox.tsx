import { useState, useEffect, useCallback } from 'react'
import { matchingApi, type BudgetAllocation, type BudgetRecommendation } from '../../api/matching'
import { usePlan } from '../../hooks/usePlan'
import PlanGate from '../../components/PlanGate'
import toast from 'react-hot-toast'
import {
  Sparkles, Loader2, Lock, Unlock, Trash2, ArrowUpDown, TrendingUp,
  DollarSign, Eye, Users, Target, BarChart3, Zap, RefreshCw,
  ChevronDown, ChevronUp, IndianRupee
} from 'lucide-react'

interface BudgetSandboxProps {
  campaignId: string
  campaign: any
}

function formatINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n}`
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const METRICS = [
  { key: 'reach', label: 'Max Reach', icon: Eye, desc: 'Maximize total impressions' },
  { key: 'engagement', label: 'Max Engagement', icon: TrendingUp, desc: 'Maximize total engagements' },
  { key: 'conversions', label: 'Max ROI', icon: Target, desc: 'Maximize predicted ROI' },
]

const BUDGET_PRESETS = [10000, 25000, 50000, 100000, 250000, 500000, 1000000]

export default function BudgetSandbox({ campaignId, campaign }: BudgetSandboxProps) {
  const { canDo } = usePlan()
  const [budget, setBudget] = useState(100000)
  const [customBudget, setCustomBudget] = useState('')
  const [targetMetric, setTargetMetric] = useState('reach')
  const [recommendation, setRecommendation] = useState<BudgetRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')

  useEffect(() => {
    if (campaign?.budget) {
      setBudget(Number(campaign.budget))
    }
  }, [campaign?.budget])

  useEffect(() => {
    if (campaignId && campaign?.budget) {
      const initialLoad = async () => {
        setLoading(true)
        try {
          const result = await matchingApi.recommendBudget(
            campaignId,
            Number(campaign.budget),
            targetMetric
          )
          setRecommendation(result)
        } catch {
          // Silent catch for initial render
        }
        setLoading(false)
      }
      initialLoad()
    }
  }, [campaignId, campaign?.budget])

  if (!canDo('budgetOptimization')) {
    return <PlanGate feature="budgetOptimization" />
  }

  const runOptimization = async () => {
    setLoading(true)
    try {
      const lockedIds = recommendation?.allocations
        .filter(a => a.is_locked)
        .map(a => a.creator_id) || []
      const result = await matchingApi.recommendBudget(campaignId, budget, targetMetric, lockedIds)
      setRecommendation(result)
      toast.success(`Optimized for ${result.allocations.length} creators`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to get recommendation')
    }
    setLoading(false)
  }

  const toggleLock = (idx: number) => {
    if (!recommendation) return
    const updated = { ...recommendation }
    updated.allocations = [...updated.allocations]
    updated.allocations[idx] = { ...updated.allocations[idx], is_locked: !updated.allocations[idx].is_locked }
    setRecommendation(updated)
  }

  const removeCreator = async (idx: number) => {
    if (!recommendation) return
    const updated = { ...recommendation }
    updated.allocations = updated.allocations.filter((_, i) => i !== idx)
    await recalculate(updated.allocations)
  }

  const startEditAmount = (idx: number) => {
    if (!recommendation) return
    setEditingIdx(idx)
    setEditAmount(String(recommendation.allocations[idx].allocated_amount))
  }

  const commitEditAmount = async () => {
    if (!recommendation || editingIdx === null) return
    const val = parseFloat(editAmount)
    if (isNaN(val) || val <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    const updated = [...recommendation.allocations]
    updated[editingIdx] = { ...updated[editingIdx], allocated_amount: val }
    setEditingIdx(null)
    await recalculate(updated)
  }

  const recalculate = async (allocations: BudgetAllocation[]) => {
    setRecalculating(true)
    try {
      const result = await matchingApi.recalculateBudget(
        campaignId,
        allocations.map(a => ({
          creator_id: a.creator_id,
          allocated_amount: a.allocated_amount,
          is_locked: a.is_locked,
        }))
      )
      // Preserve total_budget from the original recommendation
      result.total_budget = recommendation?.total_budget || budget
      result.remaining_budget = result.total_budget - result.allocated_budget
      setRecommendation(result)
    } catch {
      toast.error('Recalculation failed')
    }
    setRecalculating(false)
  }

  const handleCustomBudget = () => {
    const val = parseFloat(customBudget)
    if (!isNaN(val) && val > 0) {
      setBudget(val)
      setCustomBudget('')
    }
  }

  const utilizationPercent = recommendation
    ? Math.min(100, (recommendation.allocated_budget / recommendation.total_budget) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* ── Header Card ─────────────────────────────────────────────────── */}
      <div className="card bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-teal-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-100">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">AI Budget & ROI Sandbox</h2>
            <p className="text-sm text-gray-500 mt-1">
              Simulate different creator combinations under your campaign budget. Lock key creators, swap them, and compare ROI live.
            </p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
            Premium Feature
          </span>
        </div>
      </div>

      {/* ── Budget & Metric Config ──────────────────────────────────────── */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Configure Budget & Optimization Goal
        </h3>

        {/* Budget presets */}
        <div className="mb-4">
          <label className="text-sm text-gray-500 font-medium mb-2 block">Campaign Budget (INR)</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {BUDGET_PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setBudget(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  budget === p
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                {formatINR(p)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <IndianRupee className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                value={customBudget}
                onChange={e => setCustomBudget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustomBudget()}
                placeholder="Enter custom amount..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
              />
            </div>
            <button
              onClick={handleCustomBudget}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Set
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Current budget: <span className="font-semibold text-gray-700">{formatINR(budget)}</span></p>
        </div>

        {/* Metric selector */}
        <div className="mb-4">
          <label className="text-sm text-gray-500 font-medium mb-2 block">Optimization Goal</label>
          <div className="grid grid-cols-3 gap-3">
            {METRICS.map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.key}
                  onClick={() => setTargetMetric(m.key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    targetMetric === m.key
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100'
                      : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${targetMetric === m.key ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-semibold ${targetMetric === m.key ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {m.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{m.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={runOptimization}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-100 hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'Optimizing Creator Mix...' : 'Generate AI Recommendation'}
        </button>
      </div>

      {/* ── Results Dashboard ───────────────────────────────────────────── */}
      {recommendation && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Allocated Budget', value: formatINR(recommendation.allocated_budget), color: 'text-emerald-700', bg: 'bg-emerald-50', icon: DollarSign },
              { label: 'Predicted Reach', value: formatNum(recommendation.predicted_reach), color: 'text-blue-700', bg: 'bg-blue-50', icon: Eye },
              { label: 'Avg. Engagement', value: `${recommendation.predicted_engagement}%`, color: 'text-purple-700', bg: 'bg-purple-50', icon: TrendingUp },
              { label: 'Predicted ROI', value: `${recommendation.predicted_roi}%`, color: 'text-orange-700', bg: 'bg-orange-50', icon: Target },
              { label: 'Creators', value: String(recommendation.allocations.length), color: 'text-pink-700', bg: 'bg-pink-50', icon: Users },
            ].map((kpi) => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} className={`card ${kpi.bg} border-0`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                    <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              )
            })}
          </div>

          {/* Budget Utilization Bar */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Budget Utilization
              </h4>
              <span className="text-sm font-mono text-gray-500">
                {formatINR(recommendation.allocated_budget)} / {formatINR(recommendation.total_budget)}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  utilizationPercent > 90 ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                  utilizationPercent > 50 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' :
                  'bg-gradient-to-r from-blue-400 to-cyan-400'
                }`}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">{utilizationPercent.toFixed(1)}% utilized</span>
              <span className="text-xs text-gray-400">{formatINR(recommendation.remaining_budget)} remaining</span>
            </div>
          </div>

          {/* Creator Allocations Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Creator Allocations
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {recommendation.allocations.length} creators
                </span>
              </h4>
              <div className="flex items-center gap-2">
                {recalculating && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Recalculating...
                  </span>
                )}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showDetails ? 'Compact' : 'Expanded'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {recommendation.allocations.map((alloc, idx) => (
                <div
                  key={alloc.creator_id}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    alloc.is_locked
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30'
                  }`}
                >
                  {/* Rank */}
                  <span className="text-xs font-bold text-gray-300 w-6 text-center">#{idx + 1}</span>

                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {alloc.avatar_url ? (
                      <img src={alloc.avatar_url} alt={alloc.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-gray-500">{alloc.name.charAt(0)}</span>
                    )}
                  </div>

                  {/* Name & Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{alloc.name}</p>
                      {(alloc as any).isDiscovered ? (
                        <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded-full font-medium">Web</span>
                      ) : (
                        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">Platform</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatNum(alloc.followers)} followers</span>
                      <span>{alloc.engagementRate}% ER</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${
                        alloc.matchScore >= 70 ? 'text-green-700 bg-green-50 border-green-200' :
                        alloc.matchScore >= 50 ? 'text-blue-700 bg-blue-50 border-blue-200' :
                        'text-yellow-700 bg-yellow-50 border-yellow-200'
                      }`}>
                        {alloc.matchScore}%
                      </span>
                    </div>
                    {showDetails && (
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                        <span>Est. Impressions: <span className="text-gray-600 font-medium">{formatNum(alloc.expected_impressions)}</span></span>
                        <span>Est. Engagements: <span className="text-gray-600 font-medium">{formatNum(alloc.expected_engagements)}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Budget Amount */}
                  <div className="text-right flex-shrink-0">
                    {editingIdx === idx ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && commitEditAmount()}
                          onBlur={commitEditAmount}
                          autoFocus
                          className="w-24 px-2 py-1 border border-emerald-300 rounded text-sm text-right focus:ring-2 focus:ring-emerald-100 outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditAmount(idx)}
                        className="text-sm font-bold text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                        title="Click to edit allocation"
                      >
                        {formatINR(alloc.allocated_amount)}
                      </button>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleLock(idx)}
                      title={alloc.is_locked ? 'Unlock this creator' : 'Lock this creator (always include in optimization)'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        alloc.is_locked
                          ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-400 hover:text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {alloc.is_locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => removeCreator(idx)}
                      title="Remove creator from mix"
                      className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {recommendation.allocations.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No creators fit within the budget constraints.</p>
                <p className="text-gray-400 text-xs mt-1">Try increasing the budget or changing the optimization target.</p>
              </div>
            )}
          </div>

          {/* Re-optimize with locks */}
          <button
            onClick={runOptimization}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-emerald-300 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Re-optimize {recommendation.allocations.filter(a => a.is_locked).length > 0
              ? `(keeping ${recommendation.allocations.filter(a => a.is_locked).length} locked)`
              : 'Creator Mix'}
          </button>
        </>
      )}

      {/* Empty state */}
      {!recommendation && !loading && (
        <div className="card text-center py-16 bg-gradient-to-br from-gray-50 to-white">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">Ready to Optimize</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Set your budget and target goal above, then click <strong>Generate AI Recommendation</strong> to get an optimized creator mix with predicted reach, engagement, and ROI.
          </p>
        </div>
      )}
    </div>
  )
}
