import { Link } from 'react-router-dom'
import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import type { PlanFeature } from '../hooks/usePlan'
import { FEATURE_UPGRADE_LABEL } from '../hooks/usePlan'

interface PlanGateProps {
  feature: PlanFeature
  children?: React.ReactNode
  /**
   * When true, renders the children dimmed with a lock overlay.
   * When false (default), renders a standalone upgrade card.
   */
  overlay?: boolean
  className?: string
}

const FEATURE_DESCRIPTIONS: Record<PlanFeature, { title: string; description: string; emoji: string }> = {
  campaignCreate: {
    title: 'Campaign Creation Limit Reached',
    description: 'Upgrade to create more active campaigns simultaneously.',
    emoji: '🚀',
  },
  aiDiscovery: {
    title: 'AI Creator Discovery',
    description: 'Let our AI scan the entire internet to find perfect creator matches for your campaign.',
    emoji: '🤖',
  },
  pdfReports: {
    title: 'PDF Report Export',
    description: 'Export detailed campaign analytics and creator comparisons as polished PDF reports.',
    emoji: '📄',
  },
  sideByCompare: {
    title: 'Side-by-Side Comparison',
    description: 'Compare multiple creators head-to-head across 15+ metrics to pick the best fit.',
    emoji: '⚖️',
  },
  advancedAnalytics: {
    title: 'Advanced Analytics',
    description: 'Access deep engagement analytics, audience demographics, and ROI tracking.',
    emoji: '📊',
  },
  apiAccess: {
    title: 'API Access',
    description: 'Integrate Influencia data directly into your own systems via REST API.',
    emoji: '⚡',
  },
  prioritySupport: {
    title: 'Priority Support',
    description: 'Get dedicated onboarding support and a guaranteed 4-hour response SLA.',
    emoji: '🎯',
  },
  budgetOptimization: {
    title: 'AI Budget & ROI Sandbox',
    description: 'Simulate creator combinations, optimize budget allocation with AI, and predict campaign ROI in real time.',
    emoji: '💰',
  },
}

/**
 * PlanGate — wraps a feature that requires a paid plan.
 *
 * Usage (overlay mode — blurs children):
 *   <PlanGate feature="pdfReports" overlay>
 *     <PDFExportButton />
 *   </PlanGate>
 *
 * Usage (card mode — shows upgrade card):
 *   if (!canDo('aiDiscovery')) return <PlanGate feature="aiDiscovery" />
 */
export default function PlanGate({ feature, children, overlay = false, className = '' }: PlanGateProps) {
  const info = FEATURE_DESCRIPTIONS[feature]
  const requiredPlan = FEATURE_UPGRADE_LABEL[feature]

  if (overlay && children) {
    return (
      <div className={`relative rounded-2xl overflow-hidden ${className}`}>
        {/* Dimmed children */}
        <div className="pointer-events-none select-none blur-[2px] opacity-40 saturate-0">
          {children}
        </div>
        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-3 shadow-sm">
            <Lock className="w-6 h-6 text-indigo-600" />
          </div>
          <span className="text-2xl mb-2">{info.emoji}</span>
          <h3 className="text-base font-bold text-gray-900 mb-1">{info.title}</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-[280px]">{info.description}</p>
          <Link
            to="/brand/billing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-violet-700 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to {requiredPlan}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  // Standalone card
  return (
    <div className={`relative rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-violet-50/60 p-8 flex flex-col items-center text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-indigo-100 flex items-center justify-center mb-4">
        <span className="text-3xl">{info.emoji}</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
        <Lock className="w-4 h-4 text-indigo-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{info.title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">{info.description}</p>
      <Link
        to="/brand/billing"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-violet-700 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Upgrade to {requiredPlan} Plan
        <ArrowRight className="w-4 h-4" />
      </Link>
      <p className="text-xs text-gray-400 mt-3">Available on the {requiredPlan} plan and above</p>
    </div>
  )
}
