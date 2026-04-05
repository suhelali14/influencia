import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../components/Layout/DashboardLayout'
import { creatorsApi } from '../../api/creators'
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  FileText,
  Zap,
  Target,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
} from 'lucide-react'

interface CollaborationDetail {
  id: string
  campaign_id: string
  creator_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
  proposed_budget?: number
  message?: string
  deadline?: string
  created_at: string
  updated_at: string
  campaign: {
    id: string
    title: string
    description: string
    platform: string
    category: string
    budget: number
    start_date: string
    end_date: string
    requirements?: string
    deliverables?: string
    brand: {
      company_name: string
      website?: string
      description?: string
    }
  }
  aiAnalysis?: {
    mlMatchScore: number
    estimatedRoi: number
    successProbability: number
    riskAssessment: {
      overall: 'low' | 'medium' | 'high'
      factors: string[]
    }
    strengths: string[]
    concerns: string[]
    recommendations: string[]
    aiSummary: string
  }
}

export default function CollaborationDetail() {
  const navigate = useNavigate()
  const { id} = useParams<{ id: string }>()
  const [collaboration, setCollaboration] = useState<CollaborationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-analysis' | 'messages'>('overview')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [counterOffer, setCounterOffer] = useState<number | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [aiReportGenerated, setAiReportGenerated] = useState(false)

  useEffect(() => {
    loadCollaboration()
  }, [id])

  const loadCollaboration = async () => {
    if (!id) return

    try {
      setLoading(true)
      console.log('📥 [Frontend] Loading collaboration detail for ID:', id)
      const data = await creatorsApi.getCollaborationDetail(id)
      console.log('✅ [Frontend] Collaboration data loaded:', JSON.stringify(data, null, 2))
      console.log('🤖 [Frontend] AI Analysis in response:', data.aiAnalysis ? 'Present' : 'Missing')
      
      // Transform snake_case to camelCase if needed (backend compatibility)
      if (data.aiAnalysis) {
        const aiAnalysis = data.aiAnalysis as any
        console.log('📊 [Frontend] Raw AI Analysis data:', JSON.stringify(aiAnalysis, null, 2))
        
        // Normalize to camelCase
        data.aiAnalysis = {
          mlMatchScore: aiAnalysis.mlMatchScore ?? aiAnalysis.ml_match_score ?? 0,
          estimatedRoi: aiAnalysis.estimatedRoi ?? aiAnalysis.estimated_roi ?? 0,
          successProbability: aiAnalysis.successProbability ?? aiAnalysis.success_probability ?? 0,
          riskAssessment: aiAnalysis.riskAssessment ?? aiAnalysis.risk_assessment ?? { overall: 'medium', factors: [] },
          strengths: aiAnalysis.strengths ?? [],
          concerns: aiAnalysis.concerns ?? [],
          recommendations: aiAnalysis.recommendations ?? aiAnalysis.ai_recommendations ?? [],
          aiSummary: aiAnalysis.aiSummary ?? aiAnalysis.ai_summary ?? '',
        }
        
        console.log('✅ [Frontend] Normalized AI Analysis:', JSON.stringify(data.aiAnalysis, null, 2))
      }
      
      setCollaboration(data)
    } catch (error) {
      console.error('❌ [Frontend] Failed to load collaboration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!id) return
    
    try {
      const result = await creatorsApi.acceptCollaboration(id, counterOffer || undefined)
      console.log('✅ Accept result:', result)
      
      setShowAcceptModal(false)
      navigate('/creator/collaborations')
    } catch (error) {
      console.error('Failed to accept collaboration:', error)
    }
  }

  const handleReject = async () => {
    if (!id) return
    
    if (!rejectReason.trim()) {
      console.log('⚠️ Reason is required')
      return
    }

    try {
      const result = await creatorsApi.rejectCollaboration(id, rejectReason)
      console.log('✅ Reject result:', result)
      
      setShowRejectModal(false)
      navigate('/creator/collaborations')
    } catch (error) {
      console.error('Failed to decline collaboration:', error)
    }
  }

  const handleGenerateAIReport = async () => {
    if (!id) return
    
    try {
      setGeneratingReport(true)
      console.log('🤖 [Frontend] Starting AI report generation...')
      console.log('🔗 [Frontend] Collaboration ID:', id)
      
      const result = await creatorsApi.generateAIReport(id)
      console.log('✅ [Frontend] AI report API response:', JSON.stringify(result, null, 2))
      console.log('📊 [Frontend] Report data:', result.report)
      console.log('💾 [Frontend] Saved to database:', result.saved_to_database)
      
      setAiReportGenerated(true)
      
      console.log('🔄 [Frontend] Reloading collaboration data to fetch AI analysis...')
      // Reload collaboration to get updated AI analysis
      await loadCollaboration()
      console.log('✅ [Frontend] Collaboration data reloaded')
      console.log('📝 [Frontend] AI Analysis available:', collaboration?.aiAnalysis ? 'Yes' : 'No')
      
      // Switch to AI analysis tab to show the report
      setActiveTab('ai-analysis')
      console.log('🎯 [Frontend] Switched to AI Analysis tab')
      
      // Automatically download the PDF report
      console.log('📥 [Frontend] Starting PDF download...')
      downloadReportAsPDF(result.report)
    } catch (error) {
      console.error('❌ [Frontend] Failed to generate AI report:', error)
      console.error('❌ [Frontend] Error details:', error instanceof Error ? error.message : String(error))
      alert('Failed to generate AI report. Please try again.')
    } finally {
      setGeneratingReport(false)
    }
  }

  const downloadReportAsPDF = (report: any) => {
    console.log('📄 [Frontend] Generating beautiful PDF from report...')
    
    // Create a beautiful HTML template for the PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Collaboration Report - ${report.creator_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 50px 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .header .subtitle {
      font-size: 16px;
      opacity: 0.95;
      font-weight: 300;
    }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 8px 20px;
      border-radius: 50px;
      margin-top: 15px;
      font-size: 14px;
      font-weight: 600;
    }
    .content {
      padding: 40px;
    }
    .meta-info {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 25px;
      border-radius: 15px;
      margin-bottom: 30px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .meta-value {
      font-size: 16px;
      color: #111827;
      font-weight: 600;
    }
    .score-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      margin: 30px 0;
    }
    .score-value {
      font-size: 56px;
      font-weight: 700;
      margin: 10px 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .score-label {
      font-size: 18px;
      opacity: 0.95;
      font-weight: 300;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    .metric-card {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      padding: 25px;
      border-radius: 12px;
      color: white;
      text-align: center;
    }
    .metric-card:nth-child(2) {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .metric-card:nth-child(3) {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }
    .metric-value {
      font-size: 36px;
      font-weight: 700;
      margin: 10px 0;
    }
    .metric-label {
      font-size: 14px;
      opacity: 0.95;
    }
    .section {
      margin: 35px 0;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    .report-text {
      font-size: 15px;
      line-height: 1.8;
      color: #374151;
      white-space: pre-wrap;
      background: #f9fafb;
      padding: 25px;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }
    .insights-list {
      list-style: none;
      margin: 20px 0;
    }
    .insights-list li {
      background: linear-gradient(to right, #ffecd2 0%, #fcb69f 100%);
      padding: 20px;
      margin: 15px 0;
      border-radius: 12px;
      border-left: 5px solid #f97316;
      font-size: 15px;
      line-height: 1.6;
    }
    .insights-list li:before {
      content: "💡";
      margin-right: 12px;
      font-size: 20px;
    }
    .strengths-list, .concerns-list {
      list-style: none;
      margin: 20px 0;
    }
    .strengths-list li {
      background: linear-gradient(to right, #d4fc79 0%, #96e6a1 100%);
      padding: 15px 20px;
      margin: 12px 0;
      border-radius: 10px;
      border-left: 5px solid #10b981;
      font-size: 14px;
    }
    .strengths-list li:before {
      content: "✓";
      color: #059669;
      font-weight: 700;
      margin-right: 12px;
      font-size: 18px;
    }
    .concerns-list li {
      background: linear-gradient(to right, #ffecd2 0%, #fcb69f 100%);
      padding: 15px 20px;
      margin: 12px 0;
      border-radius: 10px;
      border-left: 5px solid #f59e0b;
      font-size: 14px;
    }
    .concerns-list li:before {
      content: "!";
      color: #d97706;
      font-weight: 700;
      margin-right: 12px;
      font-size: 18px;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      margin-top: 40px;
    }
    .footer-text {
      font-size: 14px;
      color: #6b7280;
      margin: 5px 0;
    }
    .footer-logo {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 AI-Powered Collaboration Analysis</h1>
      <div class="subtitle">Comprehensive Opportunity Report</div>
      <div class="badge">Powered by Google Gemini AI ✨</div>
    </div>
    
    <div class="content">
      <div class="meta-info">
        <div class="meta-item">
          <div class="meta-label">Creator</div>
          <div class="meta-value">${report.creator_name}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Brand</div>
          <div class="meta-value">${report.brand_name}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Campaign</div>
          <div class="meta-value">${report.campaign_title}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Generated</div>
          <div class="meta-value">${new Date(report.generated_at).toLocaleString()}</div>
        </div>
      </div>

      <div class="score-card">
        <div class="score-label">AI Match Score</div>
        <div class="score-value">${report.match_score.toFixed(1)}%</div>
        <div class="badge">${report.metadata.confidence.toUpperCase()} CONFIDENCE</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Estimated ROI</div>
          <div class="metric-value">${report.ml_predictions.estimated_roi.toFixed(0)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Success Rate</div>
          <div class="metric-value">${(report.dl_predictions.success_probability * 100).toFixed(0)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Engagement</div>
          <div class="metric-value">${report.dl_predictions.predicted_engagement.toFixed(1)}%</div>
        </div>
      </div>

      ${report.quick_insights && report.quick_insights.length > 0 ? `
      <div class="section">
        <div class="section-title">💡 Quick Insights</div>
        <ul class="insights-list">
          ${report.quick_insights.map((insight: string) => `<li>${insight}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">📊 Full AI Analysis</div>
        <div class="report-text">${report.full_report}</div>
      </div>

      ${report.analysis.strengths && report.analysis.strengths.length > 0 ? `
      <div class="section">
        <div class="section-title">✅ Key Strengths</div>
        <ul class="strengths-list">
          ${report.analysis.strengths.map((s: string) => `<li>${s}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${report.analysis.concerns && report.analysis.concerns.length > 0 ? `
      <div class="section">
        <div class="section-title">⚠️ Points to Consider</div>
        <ul class="concerns-list">
          ${report.analysis.concerns.map((c: string) => `<li>${c}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <div class="footer-logo">INFLUENCIA</div>
      <div class="footer-text">AI-Powered Influencer Marketing Platform</div>
      <div class="footer-text">Report ID: ${report.report_id}</div>
      <div class="footer-text">Model: ${report.metadata.model}</div>
    </div>
  </div>
</body>
</html>
    `

    // Open print dialog with the beautiful HTML
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          console.log('✅ [Frontend] PDF print dialog opened')
        }, 500)
      }
    } else {
      alert('Please allow popups to download the PDF report.')
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-700 bg-green-100'
      case 'medium':
        return 'text-yellow-700 bg-yellow-100'
      case 'high':
        return 'text-red-700 bg-red-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  if (loading || !collaboration) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/creator/collaborations')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Collaborations
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{collaboration.campaign.title}</h1>
            <p className="text-gray-600">{collaboration.campaign.brand.company_name}</p>
          </div>

          {collaboration.status === 'pending' && (
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(true)} className="btn-outline border-red-300 text-red-700 hover:bg-red-50">
                <ThumbsDown className="w-4 h-4 mr-2" />
                Decline
              </button>
              <button onClick={() => setShowAcceptModal(true)} className="btn-primary">
                <ThumbsUp className="w-4 h-4 mr-2" />
                Accept Collaboration
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview', icon: Briefcase },
            { id: 'ai-analysis', label: 'AI Analysis', icon: Zap },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Details */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Campaign Details</h2>
              <p className="text-gray-700 mb-6">{collaboration.campaign.description}</p>

              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Campaign Duration</p>
                    <p className="text-sm text-gray-600">
                      {new Date(collaboration.campaign.start_date).toLocaleDateString()} -{' '}
                      {new Date(collaboration.campaign.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <DollarSign className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Proposed Budget</p>
                    <p className="text-sm text-gray-600">
                      ${collaboration.proposed_budget?.toLocaleString()} 
                      <span className="text-xs text-gray-500 ml-2">
                        (Campaign total: ${collaboration.campaign.budget.toLocaleString()})
                      </span>
                    </p>
                  </div>
                </div>

                {collaboration.campaign.requirements && (
                  <div className="flex items-start">
                    <FileText className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">Requirements</p>
                      <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded">
                        {collaboration.campaign.requirements}
                      </div>
                    </div>
                  </div>
                )}

                {collaboration.campaign.deliverables && (
                  <div className="flex items-start">
                    <Target className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Deliverables</p>
                      <p className="text-sm text-gray-700">{collaboration.campaign.deliverables}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Brand Message */}
            {collaboration.message && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-3">Message from Brand</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-gray-800">{collaboration.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Platform</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {collaboration.campaign.platform}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Category</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {collaboration.campaign.category}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {collaboration.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Brand Info */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">About Brand</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{collaboration.campaign.brand.company_name}</p>
                  {collaboration.campaign.brand.description && (
                    <p className="text-sm text-gray-600 mt-1">{collaboration.campaign.brand.description}</p>
                  )}
                </div>
                {collaboration.campaign.brand.website && (
                  <a
                    href={collaboration.campaign.brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Visit Website →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai-analysis' && (
        <>
          {!collaboration?.aiAnalysis ? (
            <div className="card text-center py-12">
              <Zap className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-3 font-semibold">AI Analysis not available yet</p>
              <p className="text-sm text-gray-500 mb-6">
                Generate a comprehensive AI-powered analysis report using Gemini AI to understand this opportunity better.
              </p>
              <button
                onClick={handleGenerateAIReport}
                disabled={generatingReport}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Zap className="w-5 h-5" />
                {generatingReport ? (
                  <>
                    <span className="animate-pulse">Generating AI Report...</span>
                  </>
                ) : (
                  'Generate AI Analysis Report'
                )}
              </button>
              {aiReportGenerated && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg inline-block">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Report generated successfully! Reloading data...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* AI Scores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Match Score</span>
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    {(collaboration.aiAnalysis.mlMatchScore || 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">AI-powered compatibility</p>
                </div>

                <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Estimated ROI</span>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-green-600">
                    {(collaboration.aiAnalysis.estimatedRoi || 0).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Expected return</p>
                </div>

                <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Success Rate</span>
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {((collaboration.aiAnalysis.successProbability || 0) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Predicted success</p>
                </div>
              </div>

          {/* Full Gemini AI Report */}
          {collaboration.aiAnalysis.aiSummary && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg mr-3">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">AI-Powered Analysis Report</h2>
                    <p className="text-sm text-gray-600">Generated by Gemini AI • Personalized for You</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-8 rounded-xl border-2 border-purple-200 shadow-inner">
                <div className="prose prose-purple max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-base">
                    {collaboration.aiAnalysis.aiSummary}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-sm text-gray-900">Personalized</h4>
                  </div>
                  <p className="text-xs text-gray-600">Tailored to your profile and growth goals</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-indigo-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-semibold text-sm text-gray-900">Data-Driven</h4>
                  </div>
                  <p className="text-xs text-gray-600">Based on ML predictions and market analysis</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-sm text-gray-900">Actionable</h4>
                  </div>
                  <p className="text-xs text-gray-600">Includes specific recommendations and next steps</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strengths */}
            {collaboration.aiAnalysis.strengths && collaboration.aiAnalysis.strengths.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-green-700">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {collaboration.aiAnalysis.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <span className="text-green-600 mr-2">✓</span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {collaboration.aiAnalysis.concerns && collaboration.aiAnalysis.concerns.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-yellow-700">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Points to Consider
                </h3>
                <ul className="space-y-2">
                  {collaboration.aiAnalysis.concerns.map((concern, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <span className="text-yellow-600 mr-2">!</span>
                      <span className="text-gray-700">{concern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Risk Assessment */}
          {collaboration.aiAnalysis.riskAssessment && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
              <div className="flex items-center mb-4">
                <span className="text-sm font-medium text-gray-700 mr-3">Overall Risk Level:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(collaboration.aiAnalysis.riskAssessment.overall)}`}>
                  {collaboration.aiAnalysis.riskAssessment.overall.toUpperCase()}
                </span>
              </div>
              {collaboration.aiAnalysis.riskAssessment.factors && collaboration.aiAnalysis.riskAssessment.factors.length > 0 && (
                <ul className="space-y-2">
                  {collaboration.aiAnalysis.riskAssessment.factors.map((factor, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <span className="text-gray-400 mr-2">•</span>
                      <span className="text-gray-700">{factor}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Recommendations */}
          {collaboration.aiAnalysis.recommendations && collaboration.aiAnalysis.recommendations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-700">
                <Target className="w-5 h-5 mr-2" />
                AI Recommendations
              </h3>
              <ul className="space-y-3">
                {collaboration.aiAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Regenerate Report */}
          <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1 text-purple-900">Refresh AI Analysis</h3>
                <p className="text-sm text-gray-600">Generate a new AI report with latest insights from Gemini</p>
              </div>
              <button 
                onClick={handleGenerateAIReport}
                disabled={generatingReport}
                className="btn-primary flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
              >
                {generatingReport ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Regenerate Report
                  </>
                )}
              </button>
            </div>
          </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'messages' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Messages</h2>
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Messaging feature coming soon!</p>
          </div>
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Accept Collaboration</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to accept this collaboration? You'll be committing to the campaign requirements
              and timeline.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Counter Offer (Optional)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  placeholder={collaboration.proposed_budget?.toString()}
                  className="input-field pl-10"
                  value={counterOffer || ''}
                  onChange={(e) => setCounterOffer(Number(e.target.value))}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to accept the proposed budget of ${collaboration.proposed_budget?.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAcceptModal(false)} className="btn-outline flex-1">
                Cancel
              </button>
              <button onClick={handleAccept} className="btn-primary flex-1">
                Confirm Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Decline Collaboration</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for declining this collaboration request.
            </p>

            <textarea
              className="input-field resize-none"
              rows={4}
              placeholder="E.g., Budget doesn't align, Timeline conflicts, Not a good fit for my audience..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRejectModal(false)} className="btn-outline flex-1">
                Cancel
              </button>
              <button onClick={handleReject} className="btn-outline border-red-300 text-red-700 hover:bg-red-50 flex-1">
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
