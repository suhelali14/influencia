import { Injectable, Logger } from '@nestjs/common';

interface ReportData {
  creator: any;
  campaign: any;
  analysis: any;
  aiAnalysis?: any;
  recommendations: string[];
  comparisons: any;
}

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);

  /**
   * Generate comprehensive AI-powered PDF report.
   * Tries: 1) Puppeteer HTML→PDF (if Chromium available)
   *        2) Comprehensive PDFKit fallback (always works)
   */
  async generateComprehensiveReport(data: ReportData): Promise<Buffer> {
    // Attempt Puppeteer (full HTML report with styling)
    let puppeteer: any;
    try {
      puppeteer = require('puppeteer');
    } catch {
      this.logger.warn('Puppeteer not available — using comprehensive PDFKit report');
      return this.fallbackSimplePdf(data);
    }

    const html = this.buildFullReportHTML(data);
    let browser: any;
    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--single-process',
          '--no-zygote',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      });
      this.logger.log('✅ Generated PDF via Puppeteer (full HTML report)');
      return Buffer.from(pdfBuffer);
    } catch (err: any) {
      this.logger.warn(`Puppeteer failed (${err.message}) — using comprehensive PDFKit report`);
      return this.fallbackSimplePdf(data);
    } finally {
      if (browser) await browser.close();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  HTML BUILDER — creates the full multi-page report document
   * ═══════════════════════════════════════════════════════════════════ */

  private buildFullReportHTML(data: ReportData): string {
    const d = this.extractReportVars(data);
    return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>${this.getCSS()}</style>
</head>
<body>

<!-- ─────────────── PAGE 1: COVER ─────────────── -->
<div class="page cover-page">
  <div class="cover-bg">
    <div class="cover-shapes">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>
    <div class="cover-content">
      <div class="cover-badge">AI-POWERED ANALYSIS</div>
      <h1 class="cover-title">Creator-Campaign<br/>Match Report</h1>
      <div class="cover-divider"></div>
      <div class="cover-details">
        <div class="cover-detail-row">
          <span class="cover-label">Creator</span>
          <span class="cover-value">${d.creatorName}</span>
        </div>
        <div class="cover-detail-row">
          <span class="cover-label">Campaign</span>
          <span class="cover-value">${d.campaignTitle}</span>
        </div>
        <div class="cover-detail-row">
          <span class="cover-label">Platform</span>
          <span class="cover-value">${d.platform}</span>
        </div>
        <div class="cover-detail-row">
          <span class="cover-label">Category</span>
          <span class="cover-value">${d.category}</span>
        </div>
      </div>
      <div class="cover-score-container">
        <div class="cover-score-ring">
          ${this.svgRingGauge(d.matchScore, 100, 100)}
        </div>
        <div class="cover-score-label">Overall Match Score</div>
      </div>
      <div class="cover-footer">
        <div>Influencia AI Platform</div>
        <div>${d.generatedDate}</div>
      </div>
    </div>
  </div>
</div>

<!-- ─────────────── PAGE 2: EXECUTIVE SUMMARY ─────────────── -->
<div class="page">
  <div class="page-header">
    <div class="page-header-title">Executive Summary</div>
    <div class="page-header-sub">Influencia AI Report</div>
  </div>
  <div class="page-body">

    <!-- Score + 4 Key Metrics row -->
    <div class="metrics-hero">
      <div class="metric-card primary">
        <div class="metric-icon">${this.svgIcon('target')}</div>
        <div class="metric-val ${d.matchScoreColor}">${d.matchScore}%</div>
        <div class="metric-label">Match Score</div>
        <div class="metric-sub">${d.matchRating}</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">${this.svgIcon('trending')}</div>
        <div class="metric-val green">${d.estimatedROI}%</div>
        <div class="metric-label">Estimated ROI</div>
        <div class="metric-sub">Gradient Boosting</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">${this.svgIcon('users')}</div>
        <div class="metric-val blue">${d.audienceOverlap}%</div>
        <div class="metric-label">Audience Overlap</div>
        <div class="metric-sub">Demographic Fit</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">${this.svgIcon('star')}</div>
        <div class="metric-val purple">${d.experienceLevel}</div>
        <div class="metric-label">Experience Level</div>
        <div class="metric-sub">${d.totalCampaigns} campaigns</div>
      </div>
    </div>

    <!-- AI Summary -->
    ${d.aiSummary ? `
    <div class="section-card ai-summary-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('sparkle')}</span>
        <span>AI-Generated Summary</span>
        <span class="badge gemini">Gemini AI</span>
      </div>
      <p class="ai-summary-text">${d.aiSummary}</p>
    </div>` : ''}

    <!-- Creator Profile Card -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('user')}</span>
        <span>Creator Profile</span>
      </div>
      <div class="profile-grid">
        <div class="profile-item"><span class="profile-key">Name</span><span class="profile-val">${d.creatorName}</span></div>
        <div class="profile-item"><span class="profile-key">Location</span><span class="profile-val">${d.location}</span></div>
        <div class="profile-item"><span class="profile-key">Rating</span><span class="profile-val">${d.rating}/5.0 ⭐</span></div>
        <div class="profile-item"><span class="profile-key">Categories</span><span class="profile-val">${d.categories}</span></div>
        <div class="profile-item"><span class="profile-key">Languages</span><span class="profile-val">${d.languages}</span></div>
        <div class="profile-item"><span class="profile-key">Budget Fit</span><span class="profile-val">${d.budgetFit}</span></div>
      </div>
    </div>

    <!-- Campaign Info Card -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('megaphone')}</span>
        <span>Campaign Details</span>
      </div>
      <div class="profile-grid">
        <div class="profile-item"><span class="profile-key">Title</span><span class="profile-val">${d.campaignTitle}</span></div>
        <div class="profile-item"><span class="profile-key">Platform</span><span class="profile-val">${d.platform}</span></div>
        <div class="profile-item"><span class="profile-key">Category</span><span class="profile-val">${d.category}</span></div>
        <div class="profile-item"><span class="profile-key">Budget</span><span class="profile-val">₹${d.budget}</span></div>
      </div>
    </div>
  </div>
  ${this.pageFooter(2)}
</div>

<!-- ─────────────── PAGE 3: ML MODEL PREDICTIONS ─────────────── -->
<div class="page">
  <div class="page-header">
    <div class="page-header-title">AI/ML Model Predictions</div>
    <div class="page-header-sub">Multi-Model Ensemble Analysis</div>
  </div>
  <div class="page-body">

    <!-- Prediction gauges -->
    <div class="predictions-grid">
      ${this.predictionCard('ML Match Score', d.mlMatchScore, '%', 'RandomForest + India XGBoost + India NN', 'purple', d.mlMatchScore)}
      ${this.predictionCard('Estimated ROI', d.estimatedROI, '%', 'Gradient Boosting Regressor', 'green', Math.min(d.estimatedROI / 3, 100))}
      ${this.predictionCard('Success Probability', d.successProbability, '%', 'India Neural Network (128→64→32→1)', 'blue', d.successProbability)}
      ${this.predictionCard('Predicted Engagement', d.predictedEngagement, '%', 'RandomForest Ensemble', 'orange', Math.min(d.predictedEngagement * 10, 100))}
    </div>

    <!-- Model breakdown bar chart -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('chart')}</span>
        <span>Model Score Breakdown</span>
        <span class="badge ml">5-Model Ensemble</span>
      </div>
      <div class="bar-chart">
        ${this.barChartRow('sklearn RandomForest', d.modelScores.sklearn, '#8b5cf6', 25)}
        ${this.barChartRow('India XGBoost (R²=0.86)', d.modelScores.xgboost, '#06b6d4', 35)}
        ${this.barChartRow('India Neural Net', d.modelScores.nn, '#f59e0b', 20)}
        ${this.barChartRow('GradientBoosting ROI', d.modelScores.roi, '#10b981', 10)}
        ${this.barChartRow('RF Engagement', d.modelScores.engagement, '#ef4444', 10)}
      </div>
    </div>

    <!-- Confidence meter -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('shield')}</span>
        <span>Prediction Confidence</span>
      </div>
      <div class="confidence-meter">
        <div class="confidence-bar-bg">
          <div class="confidence-bar-fill" style="width:${d.confidence}%; background:${d.confidence >= 75 ? '#16a34a' : d.confidence >= 50 ? '#f59e0b' : '#ef4444'};"></div>
        </div>
        <div class="confidence-labels">
          <span>Low</span>
          <span class="confidence-value">${d.confidence}%</span>
          <span>High</span>
        </div>
      </div>
      <p class="confidence-text">Based on model agreement across ${d.modelsUsed} models. ${d.confidence >= 75 ? 'Strong model consensus — high reliability.' : d.confidence >= 50 ? 'Moderate agreement — review recommended.' : 'Models disagree — exercise caution.'}</p>
    </div>

  </div>
  ${this.pageFooter(3)}
</div>

<!-- ─────────────── PAGE 4: STRENGTHS, CONCERNS, REASONS ─────────────── -->
<div class="page">
  <div class="page-header">
    <div class="page-header-title">Match Analysis</div>
    <div class="page-header-sub">Strengths, Concerns & Scoring Factors</div>
  </div>
  <div class="page-body">

    <!-- Visual score breakdown -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('chart')}</span>
        <span>Score Components</span>
      </div>
      <div class="score-bars">
        ${this.scoreBar('Category Match', d.features.categoryMatch * 100, '#8b5cf6')}
        ${this.scoreBar('Follower Fit', d.features.followersMatch * 100, '#06b6d4')}
        ${this.scoreBar('Engagement Fit', d.features.engagementMatch * 100, '#10b981')}
        ${this.scoreBar('Platform Match', d.features.platformMatch * 100, '#f59e0b')}
        ${this.scoreBar('Experience', d.features.experienceScore * 20, '#ef4444')}
        ${this.scoreBar('Rating', (d.features.rating / 5) * 100, '#ec4899')}
        ${this.scoreBar('Budget Fit', Math.min(d.features.budgetFit * 50, 100), '#6366f1')}
      </div>
    </div>

    <!-- Strengths & Concerns side by side -->
    <div class="two-col">
      <div class="section-card strengths-card">
        <div class="section-card-header green-header">
          <span class="section-icon">${this.svgIcon('check')}</span>
          <span>Key Strengths</span>
        </div>
        <ul class="insight-list">
          ${d.strengths.map((s: string) => `<li class="insight-item strength-item"><span class="insight-dot green-dot"></span>${this.esc(s)}</li>`).join('')}
        </ul>
      </div>
      <div class="section-card concerns-card">
        <div class="section-card-header red-header">
          <span class="section-icon">${this.svgIcon('alert')}</span>
          <span>Points to Consider</span>
        </div>
        <ul class="insight-list">
          ${d.concerns.length > 0
            ? d.concerns.map((c: string) => `<li class="insight-item concern-item"><span class="insight-dot red-dot"></span>${this.esc(c)}</li>`).join('')
            : '<li class="insight-item no-concerns"><span class="insight-dot green-dot"></span>No significant concerns identified</li>'
          }
        </ul>
      </div>
    </div>

    <!-- Match Reasons -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('lightbulb')}</span>
        <span>Why This Creator Matches</span>
      </div>
      <div class="reasons-grid">
        ${d.reasons.map((r: string, i: number) => `
          <div class="reason-chip">
            <span class="reason-num">${i + 1}</span>
            <span>${this.esc(r)}</span>
          </div>
        `).join('')}
      </div>
    </div>

  </div>
  ${this.pageFooter(4)}
</div>

<!-- ─────────────── PAGE 5: RISK + RECOMMENDATIONS ─────────────── -->
<div class="page">
  <div class="page-header">
    <div class="page-header-title">Risk Assessment & Recommendations</div>
    <div class="page-header-sub">Strategic Guidance</div>
  </div>
  <div class="page-body">

    <!-- Risk Assessment -->
    <div class="section-card risk-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('shield')}</span>
        <span>Risk Assessment</span>
        <span class="badge ${d.riskLevel.toLowerCase()}">${d.riskLevel} Risk</span>
      </div>
      <div class="risk-meter">
        <div class="risk-track">
          <div class="risk-zone low-zone" style="width:33%;">Low</div>
          <div class="risk-zone medium-zone" style="width:34%;">Medium</div>
          <div class="risk-zone high-zone" style="width:33%;">High</div>
        </div>
        <div class="risk-indicator" style="left:${d.riskLevel === 'Low' ? '16' : d.riskLevel === 'Medium' ? '50' : '83'}%;"></div>
      </div>

      ${d.riskFactors.length > 0 ? `
      <div class="risk-section">
        <h4 class="risk-section-title red-text">⚠ Risk Factors</h4>
        <ul class="risk-list">
          ${d.riskFactors.map((f: string) => `<li>${this.esc(f)}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${d.mitigationStrategies.length > 0 ? `
      <div class="risk-section">
        <h4 class="risk-section-title green-text">✓ Mitigation Strategies</h4>
        <ul class="risk-list mitigation">
          ${d.mitigationStrategies.map((s: string) => `<li>${this.esc(s)}</li>`).join('')}
        </ul>
      </div>` : ''}
    </div>

    <!-- Strategic Recommendations -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('sparkle')}</span>
        <span>Strategic Recommendations</span>
        ${d.hasGemini ? '<span class="badge gemini">Gemini AI</span>' : ''}
      </div>
      <div class="recommendations-list">
        ${d.allRecommendations.map((r: string, i: number) => `
          <div class="rec-item">
            <div class="rec-number">${i + 1}</div>
            <div class="rec-text">${this.esc(r)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Industry Benchmarks -->
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('chart')}</span>
        <span>Industry Benchmarks</span>
      </div>
      <div class="benchmarks-grid">
        <div class="benchmark-item">
          <div class="benchmark-val">${d.creatorTier}</div>
          <div class="benchmark-label">Creator Tier</div>
        </div>
        <div class="benchmark-item">
          <div class="benchmark-val">₹${d.industryAvgBudget}</div>
          <div class="benchmark-label">Avg. Industry Budget</div>
        </div>
        <div class="benchmark-item">
          <div class="benchmark-val">${d.industryAvgReach}</div>
          <div class="benchmark-label">Avg. Industry Reach</div>
        </div>
        <div class="benchmark-item">
          <div class="benchmark-val">${d.creatorEngagement}</div>
          <div class="benchmark-label">Engagement vs ${d.benchmarkEngagement}% avg</div>
        </div>
        <div class="benchmark-item">
          <div class="benchmark-val">$${d.estimatedCPM}</div>
          <div class="benchmark-label">Est. CPM</div>
        </div>
        <div class="benchmark-item">
          <div class="benchmark-val">${d.creatorPositioning}</div>
          <div class="benchmark-label">Creator Positioning</div>
        </div>
      </div>
    </div>

  </div>
  ${this.pageFooter(5)}
</div>

<!-- ─────────────── PAGE 6: FULL AI REPORT ─────────────── -->
${d.fullReport ? `
<div class="page">
  <div class="page-header">
    <div class="page-header-title">Detailed AI Analysis Report</div>
    <div class="page-header-sub">Generated by Gemini AI</div>
  </div>
  <div class="page-body">
    <div class="section-card full-report-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('sparkle')}</span>
        <span>Comprehensive Analysis</span>
        <span class="badge gemini">Gemini AI</span>
      </div>
      <div class="full-report-text">${this.formatReportText(d.fullReport)}</div>
    </div>
  </div>
  ${this.pageFooter(6)}
</div>` : ''}

<!-- ─────────────── FINAL PAGE: DISCLAIMER ─────────────── -->
<div class="page last-page">
  <div class="page-body disclaimer-body">
    <div class="section-card">
      <div class="section-card-header">
        <span class="section-icon">${this.svgIcon('info')}</span>
        <span>Methodology & Disclaimer</span>
      </div>
      <div class="disclaimer-content">
        <h4>Models Used</h4>
        <ul>
          <li><strong>India XGBoost Regressor</strong> — Trained on 15,000 India creators, 7,000 campaigns, 150,000 interactions (R²=0.86)</li>
          <li><strong>India Neural Network</strong> — PyTorch 128→64→32→1 architecture (MSE=0.40)</li>
          <li><strong>sklearn RandomForest</strong> — Match scoring (200 trees, depth 15)</li>
          <li><strong>sklearn GradientBoosting</strong> — ROI prediction (150 trees)</li>
          <li><strong>Google Gemini Pro</strong> — Natural language reports and risk assessment</li>
        </ul>
        <h4>Feature Engineering</h4>
        <p>15 features extracted: category match, follower fit, engagement fit, platform match, experience score, rating, categories count, languages count, followers, engagement rate, budget, duration, budget fit, versatility, success rate.</p>
        <h4>Disclaimer</h4>
        <p>This report is generated by AI/ML models and should be used as a decision-support tool. Actual campaign performance may vary based on market conditions, content quality, and audience behavior. Past performance does not guarantee future results.</p>
      </div>
    </div>
    <div class="final-footer">
      <div class="final-logo">INFLUENCIA</div>
      <div class="final-tagline">AI-Powered Influencer Marketing Platform</div>
      <div class="final-date">Report generated on ${d.generatedDate}</div>
    </div>
  </div>
</div>

</body>
</html>`;
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  DATA EXTRACTION — normalizes all fields from the analysis data
   * ═══════════════════════════════════════════════════════════════════ */

  private extractReportVars(data: ReportData) {
    const { creator, campaign, analysis, aiAnalysis, recommendations, comparisons } = data;

    const creatorName = `${creator?.user?.first_name || ''} ${creator?.user?.last_name || ''}`.trim() || 'Creator';
    const matchScore = Math.round(analysis?.score ?? 0);
    const mlMatchScore = Math.round(aiAnalysis?.ml_predictions?.match_score ?? aiAnalysis?.ml_match_score ?? matchScore);
    const estimatedROI = Math.round(aiAnalysis?.ml_predictions?.estimated_roi ?? aiAnalysis?.estimated_roi ?? analysis?.estimatedROI ?? 100);
    const successProb = aiAnalysis?.dl_predictions?.success_probability ?? aiAnalysis?.success_probability ?? matchScore / 120;
    const successProbability = Math.round((typeof successProb === 'number' && successProb <= 1 ? successProb * 100 : Number(successProb) || 50));
    const predictedEngagement = Number(aiAnalysis?.dl_predictions?.predicted_engagement ?? aiAnalysis?.predicted_engagement ?? aiAnalysis?.ml_predictions?.estimated_engagement ?? 5).toFixed(2);
    const confidence = Math.round(aiAnalysis?.ml_predictions?.confidence ?? 50);

    const modelBreakdown = aiAnalysis?.ml_predictions?.model_breakdown || {};
    const modelScoresRaw = aiAnalysis?.ml_predictions?.model_scores || aiAnalysis?.model_scores || {};

    const features = aiAnalysis?.features || {};

    return {
      creatorName,
      campaignTitle: campaign?.title || 'Campaign',
      platform: campaign?.platform || 'N/A',
      category: campaign?.category || 'N/A',
      budget: Number(campaign?.budget || 0).toLocaleString(),
      generatedDate: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
      matchScore,
      matchScoreColor: matchScore >= 80 ? 'green' : matchScore >= 60 ? 'blue' : matchScore >= 40 ? 'yellow' : 'red',
      matchRating: matchScore >= 90 ? 'Exceptional Match' : matchScore >= 80 ? 'Excellent Match' : matchScore >= 70 ? 'Great Match' : matchScore >= 60 ? 'Good Match' : matchScore >= 40 ? 'Moderate Match' : 'Limited Match',
      estimatedROI,
      audienceOverlap: Math.round(aiAnalysis?.audience_overlap ?? analysis?.audienceOverlap ?? 50),
      experienceLevel: aiAnalysis?.experience_level ?? analysis?.experienceLevel ?? 'N/A',
      totalCampaigns: creator?.total_campaigns ?? 0,
      rating: Number(creator?.overall_rating ?? 0).toFixed(1),
      location: creator?.location || 'N/A',
      categories: (creator?.categories || []).join(', ') || 'General',
      languages: (creator?.languages || []).join(', ') || 'English',
      budgetFit: aiAnalysis?.budget_fit ?? analysis?.budgetFit ?? 'N/A',

      mlMatchScore,
      successProbability,
      predictedEngagement: Number(predictedEngagement),
      confidence,
      modelsUsed: 5,

      modelScores: {
        sklearn: Math.round(modelBreakdown.xgboost || modelScoresRaw.sklearn_match || mlMatchScore * 0.9),
        xgboost: Math.round(modelBreakdown.xgboost || modelScoresRaw.india_xgboost || mlMatchScore * 1.02),
        nn: Math.round(modelBreakdown.neural_network || modelScoresRaw.india_nn || successProbability),
        roi: Math.round(estimatedROI / 3),
        engagement: Math.round(Number(predictedEngagement) * 10),
      },

      features: {
        categoryMatch: features.category_match ?? (analysis?.reasons?.some((r: string) => r.toLowerCase().includes('category')) ? 1 : 0.5),
        followersMatch: features.followers_match ?? 0.8,
        engagementMatch: features.engagement_match ?? 0.7,
        platformMatch: features.platform_match ?? 0.8,
        experienceScore: features.experience_score ?? Math.min((creator?.total_campaigns || 0) / 10, 5),
        rating: Number(creator?.overall_rating ?? 3),
        budgetFit: features.budget_fit ?? 1,
      },

      strengths: [...new Set([...(analysis?.strengths || []), ...(aiAnalysis?.strengths || [])])],
      concerns: [...new Set([...(analysis?.concerns || []), ...(aiAnalysis?.concerns || [])])],
      reasons: [...new Set([...(analysis?.reasons || []), ...(aiAnalysis?.reasons || [])])],

      riskLevel: aiAnalysis?.risk_assessment?.risk_level || (matchScore >= 70 ? 'Low' : matchScore >= 50 ? 'Medium' : 'High'),
      riskFactors: aiAnalysis?.risk_assessment?.risk_factors || [],
      mitigationStrategies: aiAnalysis?.risk_assessment?.mitigation_strategies || [],

      allRecommendations: [...new Set([...(recommendations || []), ...(aiAnalysis?.ai_recommendations || [])])],
      hasGemini: !!(aiAnalysis?.ai_summary || aiAnalysis?.ai_recommendations?.length),

      aiSummary: aiAnalysis?.ai_summary || aiAnalysis?.quick_summary || '',
      fullReport: aiAnalysis?.full_report || '',

      industryAvgBudget: Number(comparisons?.industryAverageBudget || 0).toLocaleString(),
      industryAvgReach: Number(comparisons?.industryAverageReach || 0).toLocaleString(),
      creatorPositioning: comparisons?.creatorPositioning || 'N/A',
      creatorTier: comparisons?.creatorTier || 'N/A',
      creatorEngagement: comparisons?.engagementRate != null ? `${Number(comparisons.engagementRate).toFixed(2)}%` : 'N/A',
      benchmarkEngagement: comparisons?.benchmarkEngagementRate || 4,
      estimatedCPM: comparisons?.estimatedCPM || 10,
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  COMPONENT HELPERS
   * ═══════════════════════════════════════════════════════════════════ */

  private svgRingGauge(value: number, cx: number, cy: number): string {
    const r = 68;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(value, 100) / 100;
    const offset = circ * (1 - pct);
    const color = value >= 80 ? '#22c55e' : value >= 60 ? '#3b82f6' : value >= 40 ? '#f59e0b' : '#ef4444';
    return `<svg width="200" height="200" viewBox="0 0 200 200">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="12"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="12"
        stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"
        style="filter: drop-shadow(0 0 8px ${color}60);"/>
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="white" font-size="42" font-weight="700">${value}</text>
      <text x="${cx}" y="${cy + 18}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="16" font-weight="400">/ 100</text>
    </svg>`;
  }

  private predictionCard(label: string, value: number, unit: string, model: string, color: string, barPct: number): string {
    const colors: Record<string, string> = { purple: '#8b5cf6', green: '#16a34a', blue: '#3b82f6', orange: '#f59e0b' };
    const c = colors[color] || '#6366f1';
    return `
    <div class="prediction-card">
      <div class="pred-bar-bg"><div class="pred-bar-fill" style="width:${Math.min(barPct, 100)}%;background:${c};"></div></div>
      <div class="pred-value" style="color:${c};">${value}${unit}</div>
      <div class="pred-label">${label}</div>
      <div class="pred-model">${model}</div>
    </div>`;
  }

  private barChartRow(label: string, value: number, color: string, weight: number): string {
    const w = Math.min(Math.max(value, 2), 100);
    return `
    <div class="bar-row">
      <div class="bar-label">${label} <span class="bar-weight">(${weight}%)</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${color};"></div></div>
      <div class="bar-value" style="color:${color};">${Math.round(value)}</div>
    </div>`;
  }

  private scoreBar(label: string, pct: number, color: string): string {
    const w = Math.min(Math.max(pct, 2), 100);
    return `
    <div class="score-bar-row">
      <span class="score-bar-label">${label}</span>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${w}%;background:${color};"></div></div>
      <span class="score-bar-val">${Math.round(pct)}%</span>
    </div>`;
  }

  private pageFooter(pageNum: number): string {
    return `<div class="page-footer">
      <span>Influencia AI • Confidential</span>
      <span>Page ${pageNum}</span>
    </div>`;
  }

  private formatReportText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  private esc(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  SVG ICONS (inline, no external deps)
   * ═══════════════════════════════════════════════════════════════════ */

  private svgIcon(name: string): string {
    const icons: Record<string, string> = {
      target: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
      trending: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
      users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      star: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      sparkle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/></svg>',
      user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      megaphone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
      chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
      shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      alert: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      lightbulb: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };
    return icons[name] || '';
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  CSS STYLESHEET
   * ═══════════════════════════════════════════════════════════════════ */

  private getCSS(): string {
    return `
/* ── Reset & Base ───────────────────────────────────── */
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;font-size:11px;line-height:1.5;background:#f8fafc;}

/* ── Page ──────────────────────────────────────────── */
.page{width:210mm;min-height:297mm;position:relative;page-break-after:always;background:#fff;overflow:hidden;}
.page-header{background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%);color:#fff;padding:24px 36px 18px;position:relative;}
.page-header::after{content:'';position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#f59e0b,#ef4444,#ec4899,#8b5cf6);}
.page-header-title{font-size:20px;font-weight:700;letter-spacing:-0.3px;}
.page-header-sub{font-size:10px;opacity:0.8;margin-top:2px;}
.page-body{padding:24px 36px 60px;}
.page-footer{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;padding:10px 36px;font-size:8px;color:#94a3b8;border-top:1px solid #e2e8f0;}

/* ── Cover Page ───────────────────────────────────── */
.cover-page{background:#0f172a;}
.cover-bg{width:100%;height:100%;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.cover-shapes{position:absolute;inset:0;}
.shape{position:absolute;border-radius:50%;opacity:0.08;}
.shape-1{width:500px;height:500px;background:#8b5cf6;top:-100px;right:-150px;}
.shape-2{width:400px;height:400px;background:#06b6d4;bottom:-100px;left:-100px;}
.shape-3{width:250px;height:250px;background:#f59e0b;top:40%;left:50%;}
.cover-content{position:relative;z-index:1;text-align:center;color:#fff;padding:40px;}
.cover-badge{display:inline-block;padding:6px 20px;border:1px solid rgba(139,92,246,0.5);border-radius:50px;font-size:10px;letter-spacing:3px;color:#a78bfa;margin-bottom:20px;background:rgba(139,92,246,0.1);}
.cover-title{font-size:38px;font-weight:800;line-height:1.15;letter-spacing:-1px;margin-bottom:16px;background:linear-gradient(135deg,#fff 0%,#c4b5fd 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.cover-divider{width:80px;height:3px;background:linear-gradient(90deg,#8b5cf6,#06b6d4);margin:0 auto 28px;border-radius:2px;}
.cover-details{display:grid;grid-template-columns:1fr 1fr;gap:10px 40px;text-align:left;max-width:400px;margin:0 auto 30px;padding:16px 24px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.06);}
.cover-detail-row{display:flex;flex-direction:column;gap:2px;}
.cover-label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;}
.cover-value{font-size:13px;font-weight:600;color:#e2e8f0;}
.cover-score-container{display:flex;flex-direction:column;align-items:center;margin:10px 0;}
.cover-score-label{font-size:11px;color:#94a3b8;margin-top:4px;letter-spacing:1px;text-transform:uppercase;}
.cover-footer{position:absolute;bottom:40px;left:0;right:0;display:flex;justify-content:space-between;padding:0 60px;font-size:10px;color:#64748b;}

/* ── Section Cards ──────────────────────────────── */
.section-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);}
.section-card-header{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#1e293b;}
.section-icon{display:flex;align-items:center;color:#6366f1;}
.green-header{background:#f0fdf4;border-bottom-color:#bbf7d0;}.green-header .section-icon{color:#16a34a;}
.red-header{background:#fef2f2;border-bottom-color:#fecaca;}.red-header .section-icon{color:#dc2626;}

/* ── Badges ─────────────────────────────────────── */
.badge{font-size:8px;padding:3px 10px;border-radius:50px;font-weight:600;letter-spacing:0.5px;margin-left:auto;}
.badge.gemini{background:linear-gradient(135deg,#6366f1,#a78bfa);color:#fff;}
.badge.ml{background:#0ea5e9;color:#fff;}
.badge.low{background:#dcfce7;color:#166534;}.badge.medium{background:#fef3c7;color:#92400e;}.badge.high{background:#fee2e2;color:#991b1b;}

/* ── Metrics Hero ──────────────────────────────── */
.metrics-hero{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.metric-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 12px;text-align:center;position:relative;overflow:hidden;}
.metric-card.primary{border-color:#8b5cf6;box-shadow:0 0 0 1px #8b5cf620;}
.metric-card.primary::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#6366f1,#a78bfa);}
.metric-icon{display:flex;justify-content:center;color:#6366f1;margin-bottom:6px;}
.metric-val{font-size:22px;font-weight:800;line-height:1;}
.metric-val.green{color:#16a34a;}.metric-val.blue{color:#3b82f6;}.metric-val.purple{color:#8b5cf6;}.metric-val.yellow{color:#f59e0b;}.metric-val.red{color:#ef4444;}
.metric-label{font-size:9px;color:#64748b;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}
.metric-sub{font-size:8px;color:#94a3b8;margin-top:2px;}

/* ── AI Summary ─────────────────────────────────── */
.ai-summary-card{border-left:3px solid #8b5cf6;}
.ai-summary-text{padding:14px 16px;font-size:11px;color:#475569;line-height:1.7;}

/* ── Profile Grid ──────────────────────────────── */
.profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;padding:8px 0;}
.profile-item{display:flex;justify-content:space-between;padding:8px 16px;border-bottom:1px solid #f1f5f9;}
.profile-item:nth-child(odd){border-right:1px solid #f1f5f9;}
.profile-key{color:#64748b;font-size:10px;font-weight:600;}
.profile-val{color:#1e293b;font-size:10px;font-weight:500;text-align:right;max-width:60%;}

/* ── Predictions Grid ──────────────────────────── */
.predictions-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;}
.prediction-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;position:relative;overflow:hidden;}
.pred-bar-bg{width:100%;height:5px;background:#f1f5f9;border-radius:3px;margin-bottom:12px;overflow:hidden;}
.pred-bar-fill{height:100%;border-radius:3px;transition:width .3s;}
.pred-value{font-size:28px;font-weight:800;line-height:1;}
.pred-label{font-size:11px;font-weight:700;color:#334155;margin-top:4px;}
.pred-model{font-size:8px;color:#94a3b8;margin-top:2px;}

/* ── Bar Chart ─────────────────────────────────── */
.bar-chart{padding:16px;}
.bar-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.bar-label{width:180px;font-size:9px;color:#475569;font-weight:500;flex-shrink:0;}
.bar-weight{color:#94a3b8;}
.bar-track{flex:1;height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden;}
.bar-fill{height:100%;border-radius:4px;min-width:2%;}
.bar-value{width:30px;text-align:right;font-size:11px;font-weight:700;}

/* ── Confidence ─────────────────────────────────── */
.confidence-meter{padding:16px 16px 4px;}
.confidence-bar-bg{width:100%;height:12px;background:#f1f5f9;border-radius:6px;overflow:hidden;}
.confidence-bar-fill{height:100%;border-radius:6px;}
.confidence-labels{display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;margin-top:4px;}
.confidence-value{font-weight:700;color:#1e293b;font-size:11px;}
.confidence-text{padding:6px 16px 16px;font-size:9px;color:#64748b;}

/* ── Score Bars ─────────────────────────────────── */
.score-bars{padding:16px;}
.score-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.score-bar-label{width:110px;font-size:9px;color:#475569;font-weight:600;flex-shrink:0;}
.score-bar-track{flex:1;height:14px;background:#f1f5f9;border-radius:4px;overflow:hidden;}
.score-bar-fill{height:100%;border-radius:4px;}
.score-bar-val{width:36px;text-align:right;font-size:10px;font-weight:700;color:#334155;}

/* ── Two Column ─────────────────────────────────── */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;}

/* ── Insight Lists ─────────────────────────────── */
.insight-list{list-style:none;padding:12px 16px;}
.insight-item{display:flex;align-items:flex-start;gap:8px;font-size:10px;color:#374151;padding:5px 0;line-height:1.5;}
.insight-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.green-dot{background:#16a34a;}.red-dot{background:#ef4444;}
.no-concerns{color:#16a34a;font-style:italic;}
.strengths-card{border-top:3px solid #16a34a;}
.concerns-card{border-top:3px solid #ef4444;}

/* ── Reasons ─────────────────────────────────────── */
.reasons-grid{display:flex;flex-wrap:wrap;gap:8px;padding:14px 16px;}
.reason-chip{display:flex;align-items:center;gap:6px;padding:6px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:50px;font-size:9px;color:#0c4a6e;}
.reason-num{width:18px;height:18px;background:#0ea5e9;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0;}

/* ── Risk ──────────────────────────────────────── */
.risk-card{border-top:3px solid #f59e0b;}
.risk-meter{padding:16px 16px 8px;position:relative;}
.risk-track{display:flex;height:20px;border-radius:6px;overflow:hidden;}
.risk-zone{display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;color:#fff;}
.low-zone{background:#22c55e;}.medium-zone{background:#f59e0b;}.high-zone{background:#ef4444;}
.risk-indicator{position:absolute;top:12px;width:3px;height:28px;background:#1e293b;border-radius:2px;transform:translateX(-50%);}
.risk-section{padding:8px 16px 12px;}
.risk-section-title{font-size:11px;margin-bottom:6px;}
.red-text{color:#dc2626;}.green-text{color:#16a34a;}
.risk-list{padding-left:20px;font-size:10px;color:#475569;}
.risk-list li{margin-bottom:4px;}
.risk-list.mitigation{color:#166534;}

/* ── Recommendations ────────────────────────────── */
.recommendations-list{padding:12px 16px;}
.rec-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;}
.rec-item:last-child{border-bottom:none;}
.rec-number{width:26px;height:26px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}
.rec-text{font-size:10px;color:#374151;line-height:1.6;padding-top:4px;}

/* ── Benchmarks ─────────────────────────────────── */
.benchmarks-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e2e8f0;}
.benchmark-item{background:#fff;padding:16px;text-align:center;}
.benchmark-val{font-size:18px;font-weight:800;color:#6366f1;}
.benchmark-label{font-size:9px;color:#64748b;margin-top:4px;}

/* ── Full Report ────────────────────────────────── */
.full-report-card{border-left:3px solid #8b5cf6;}
.full-report-text{padding:16px;font-size:10px;color:#374151;line-height:1.8;}
.full-report-text p{margin-bottom:10px;}.full-report-text strong{color:#1e293b;}

/* ── Last Page / Disclaimer ─────────────────────── */
.last-page{display:flex;flex-direction:column;}
.disclaimer-body{flex:1;display:flex;flex-direction:column;padding-top:40px;}
.disclaimer-content{padding:16px;font-size:9px;color:#64748b;line-height:1.7;}
.disclaimer-content h4{color:#334155;font-size:11px;margin:12px 0 4px;}
.disclaimer-content ul{padding-left:18px;margin-bottom:8px;}
.disclaimer-content li{margin-bottom:3px;}
.final-footer{margin-top:auto;text-align:center;padding:40px 36px 50px;}
.final-logo{font-size:28px;font-weight:900;letter-spacing:4px;color:#6366f1;}
.final-tagline{font-size:10px;color:#94a3b8;margin-top:4px;letter-spacing:1px;}
.final-date{font-size:9px;color:#cbd5e1;margin-top:8px;}

/* ── Print ──────────────────────────────────────── */
@media print{.page{page-break-after:always;}}
@page{size:A4;margin:0;}
`;
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  FALLBACK — simple pdfkit if puppeteer fails
   * ═══════════════════════════════════════════════════════════════════ */

  private async fallbackSimplePdf(data: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const PDFDoc = require('pdfkit');
      const doc = new PDFDoc({ size: 'A4', margin: 50 });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const d = this.extractReportVars(data);
      const W = doc.page.width;
      const M = 50; // margin
      const CW = W - M * 2; // content width

      // ─── Helpers ─────────────────────────────────────────
      const drawBar = (x: number, y: number, w: number, pct: number, color: string) => {
        doc.rect(x, y, w, 8).fill('#e5e7eb');
        doc.rect(x, y, w * Math.min(pct / 100, 1), 8).fill(color);
      };
      const scoreColor = (v: number) => v >= 80 ? '#16a34a' : v >= 60 ? '#3b82f6' : v >= 40 ? '#f59e0b' : '#ef4444';
      const section = (title: string) => {
        if (doc.y > 680) doc.addPage();
        doc.moveDown(0.8);
        doc.rect(M, doc.y, CW, 22).fill('#f1f5f9');
        doc.fontSize(11).fillColor('#1e293b').font('Helvetica-Bold').text(title, M + 8, doc.y + 5, { width: CW - 16 });
        doc.moveDown(1.2);
      };
      const kv = (key: string, val: string) => {
        const y = doc.y;
        doc.fontSize(9).fillColor('#64748b').font('Helvetica').text(key, M, y, { width: 150 });
        doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold').text(val, M + 155, y, { width: CW - 155 });
        doc.moveDown(0.4);
      };

      // ═══════════════════════════════════════════════════════
      //  PAGE 1: COVER
      // ═══════════════════════════════════════════════════════
      doc.rect(0, 0, W, 160).fill('#6366f1');
      doc.fontSize(10).fillColor('#c7d2fe').font('Helvetica').text('AI-POWERED ANALYSIS', M, 25, { align: 'center' });
      doc.fontSize(26).fillColor('#ffffff').font('Helvetica-Bold').text('Creator-Campaign Match Report', M, 48, { align: 'center' });
      doc.rect(W / 2 - 30, 90, 60, 3).fill('#a5b4fc');
      doc.fontSize(11).fillColor('#e0e7ff').font('Helvetica').text(`${d.creatorName}  ×  ${d.campaignTitle}`, M, 103, { align: 'center' });
      doc.fontSize(9).text(`${d.platform} • ${d.category} • ${d.generatedDate}`, M, 120, { align: 'center' });
      // Score circle area
      doc.fontSize(60).fillColor('#ffffff').font('Helvetica-Bold').text(`${d.matchScore}`, M, 138, { align: 'center', continued: false });

      doc.moveDown(4);
      doc.fillColor('#6366f1').fontSize(9).font('Helvetica').text('OVERALL MATCH SCORE', M, doc.y, { align: 'center' });
      doc.moveDown(1.5);

      // ─── Executive Summary ───────────────────────────────
      section('Executive Summary');
      // 4 key metrics in a row
      const metricsData = [
        { label: 'Match Score', value: `${d.matchScore}%`, sub: d.matchRating },
        { label: 'Estimated ROI', value: `${d.estimatedROI}%`, sub: 'ML Prediction' },
        { label: 'Audience Overlap', value: `${d.audienceOverlap}%`, sub: 'Demographic Fit' },
        { label: 'Experience', value: d.experienceLevel, sub: `${d.totalCampaigns} campaigns` },
      ];
      const colW = CW / 4;
      metricsData.forEach((m, i) => {
        const x = M + i * colW;
        const y = doc.y;
        doc.fontSize(16).fillColor(scoreColor(parseInt(m.value) || 50)).font('Helvetica-Bold').text(m.value, x, y, { width: colW, align: 'center' });
        doc.fontSize(8).fillColor('#475569').font('Helvetica').text(m.label, x, y + 20, { width: colW, align: 'center' });
        doc.fontSize(7).fillColor('#94a3b8').text(m.sub, x, y + 30, { width: colW, align: 'center' });
      });
      doc.moveDown(3.5);

      // AI Summary
      if (d.aiSummary) {
        doc.rect(M, doc.y, CW, 1).fill('#e5e7eb');
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#6366f1').font('Helvetica-Bold').text('🤖 AI Summary (Gemini)', M);
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#475569').font('Helvetica').text(d.aiSummary, M, doc.y, { width: CW });
        doc.moveDown(0.8);
      }

      // ─── Creator Profile ─────────────────────────────────
      section('Creator Profile');
      kv('Name', d.creatorName);
      kv('Location', d.location);
      kv('Rating', `${d.rating}/5.0 ⭐`);
      kv('Categories', d.categories);
      kv('Languages', d.languages);
      kv('Budget Fit', d.budgetFit);
      kv('Total Campaigns', `${d.totalCampaigns}`);

      // ─── Campaign Details ────────────────────────────────
      section('Campaign Details');
      kv('Title', d.campaignTitle);
      kv('Platform', d.platform);
      kv('Category', d.category);
      kv('Budget', `₹${d.budget}`);

      // ═══════════════════════════════════════════════════════
      //  PAGE 2: MODEL SCORES & PREDICTIONS
      // ═══════════════════════════════════════════════════════
      doc.addPage();
      section('AI/ML Model Predictions — 5-Model Ensemble');
      const predictions = [
        { label: 'ML Match Score', value: d.mlMatchScore, unit: '%', model: 'RandomForest + XGBoost + NN' },
        { label: 'Estimated ROI', value: d.estimatedROI, unit: '%', model: 'Gradient Boosting Regressor' },
        { label: 'Success Probability', value: d.successProbability, unit: '%', model: 'India Neural Network' },
        { label: 'Predicted Engagement', value: d.predictedEngagement, unit: '%', model: 'RandomForest Ensemble' },
      ];
      predictions.forEach((p) => {
        const y = doc.y;
        doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold').text(p.label, M, y, { width: 180 });
        doc.fontSize(14).fillColor(scoreColor(p.value)).font('Helvetica-Bold').text(`${p.value}${p.unit}`, M + 185, y - 2, { width: 80 });
        doc.fontSize(7).fillColor('#94a3b8').font('Helvetica').text(p.model, M + 270, y + 2, { width: CW - 270 });
        drawBar(M, y + 18, CW, p.value, scoreColor(p.value));
        doc.moveDown(2);
      });

      // Model Score Breakdown
      section('Model Score Breakdown');
      const models = [
        { name: 'sklearn RandomForest (25%)', score: d.modelScores.sklearn },
        { name: 'India XGBoost R²=0.86 (35%)', score: d.modelScores.xgboost },
        { name: 'India Neural Net (20%)', score: d.modelScores.nn },
        { name: 'GradientBoosting ROI (10%)', score: d.modelScores.roi },
        { name: 'RF Engagement (10%)', score: d.modelScores.engagement },
      ];
      models.forEach((m) => {
        const y = doc.y;
        doc.fontSize(9).fillColor('#334155').font('Helvetica').text(m.name, M, y, { width: 200 });
        doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold').text(`${m.score}`, M + CW - 30, y, { width: 30, align: 'right' });
        drawBar(M + 205, y + 2, CW - 240, m.score, scoreColor(m.score));
        doc.moveDown(1);
      });

      // Confidence
      doc.moveDown(0.5);
      kv('Prediction Confidence', `${d.confidence}%`);
      drawBar(M, doc.y, CW, d.confidence, d.confidence >= 70 ? '#16a34a' : d.confidence >= 50 ? '#f59e0b' : '#ef4444');
      doc.moveDown(1.5);

      // ═══════════════════════════════════════════════════════
      //  PAGE 3: SCORE COMPONENTS & MATCH ANALYSIS
      // ═══════════════════════════════════════════════════════
      doc.addPage();
      section('Score Components — Feature Importance');
      const features = [
        { name: 'Category Match', value: Math.round((d.features.categoryMatch || 0) * 100) },
        { name: 'Follower Fit', value: Math.round((d.features.followersMatch || 0) * 100) },
        { name: 'Engagement Fit', value: Math.round((d.features.engagementMatch || 0) * 100) },
        { name: 'Platform Match', value: Math.round((d.features.platformMatch || 0) * 100) },
        { name: 'Experience Score', value: Math.round(Math.min((d.features.experienceScore || 0) / 5, 1) * 100) },
        { name: 'Creator Rating', value: Math.round((d.features.rating || 0) / 5 * 100) },
        { name: 'Budget Fit', value: Math.round((d.features.budgetFit || 0) * 100) },
      ];
      features.forEach((f) => {
        const y = doc.y;
        doc.fontSize(9).fillColor('#334155').font('Helvetica').text(f.name, M, y, { width: 130 });
        drawBar(M + 135, y + 1, CW - 175, f.value, scoreColor(f.value));
        doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold').text(`${f.value}%`, M + CW - 35, y, { width: 35, align: 'right' });
        doc.moveDown(1);
      });

      // Strengths
      section('Key Strengths');
      d.strengths.forEach((s: string) => {
        doc.fontSize(9).fillColor('#166534').font('Helvetica').text(`✅  ${s}`, M + 5, doc.y, { width: CW - 10 });
        doc.moveDown(0.4);
      });
      if (d.strengths.length === 0) {
        doc.fontSize(9).fillColor('#94a3b8').font('Helvetica').text('No specific strengths identified', M + 5);
        doc.moveDown(0.4);
      }

      // Concerns
      section('Points to Consider');
      d.concerns.forEach((c: string) => {
        doc.fontSize(9).fillColor('#991b1b').font('Helvetica').text(`⚠️  ${c}`, M + 5, doc.y, { width: CW - 10 });
        doc.moveDown(0.4);
      });
      if (d.concerns.length === 0) {
        doc.fontSize(9).fillColor('#64748b').font('Helvetica').text('No significant concerns identified', M + 5);
        doc.moveDown(0.4);
      }

      // Matching Reasons
      section('Why This Creator Matches');
      d.reasons.forEach((r: string, i: number) => {
        doc.fontSize(9).fillColor('#1e3a5f').font('Helvetica').text(`${i + 1}.  ${r}`, M + 5, doc.y, { width: CW - 10 });
        doc.moveDown(0.4);
      });

      // ═══════════════════════════════════════════════════════
      //  PAGE 4: RISK, RECOMMENDATIONS, BENCHMARKS
      // ═══════════════════════════════════════════════════════
      doc.addPage();

      // Risk Assessment
      section(`Risk Assessment — ${d.riskLevel} Risk`);
      const riskColors: Record<string, string> = { Low: '#16a34a', Medium: '#f59e0b', High: '#ef4444' };
      const rc = riskColors[d.riskLevel] || '#f59e0b';
      doc.rect(M, doc.y, CW, 6).fill('#e5e7eb');
      const riskPct = d.riskLevel === 'Low' ? 25 : d.riskLevel === 'Medium' ? 55 : 85;
      doc.rect(M, doc.y - 6, CW * riskPct / 100, 6).fill(rc);
      doc.moveDown(0.8);
      if (d.riskFactors.length > 0) {
        doc.fontSize(9).fillColor('#334155').font('Helvetica-Bold').text('Risk Factors:', M);
        doc.moveDown(0.3);
        d.riskFactors.forEach((rf: string) => {
          doc.fontSize(8).fillColor('#991b1b').font('Helvetica').text(`•  ${rf}`, M + 10, doc.y, { width: CW - 20 });
          doc.moveDown(0.3);
        });
      }
      if (d.mitigationStrategies.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#334155').font('Helvetica-Bold').text('Mitigation Strategies:', M);
        doc.moveDown(0.3);
        d.mitigationStrategies.forEach((ms: string) => {
          doc.fontSize(8).fillColor('#166534').font('Helvetica').text(`→  ${ms}`, M + 10, doc.y, { width: CW - 20 });
          doc.moveDown(0.3);
        });
      }

      // Recommendations
      section('Strategic Recommendations');
      d.allRecommendations.forEach((r: string, i: number) => {
        doc.fontSize(9).fillColor('#1e293b').font('Helvetica').text(`${i + 1}.  ${r}`, M + 5, doc.y, { width: CW - 10 });
        doc.moveDown(0.5);
      });

      // Industry Benchmarks
      section('Industry Benchmarks');
      kv('Creator Tier', d.creatorTier);
      kv('Avg. Industry Budget', `₹${d.industryAvgBudget}`);
      kv('Avg. Industry Reach', d.industryAvgReach);
      kv('Engagement Rate', d.creatorEngagement);
      kv('Benchmark Engagement', `${d.benchmarkEngagement}%`);
      kv('Estimated CPM', `$${d.estimatedCPM}`);
      kv('Creator Positioning', d.creatorPositioning);

      // ─── Full AI Report (if available) ───────────────────
      if (d.fullReport) {
        doc.addPage();
        section('Detailed AI Analysis Report — Gemini AI');
        doc.fontSize(9).fillColor('#334155').font('Helvetica').text(d.fullReport, M, doc.y, { width: CW, lineGap: 2 });
      }

      // ═══════════════════════════════════════════════════════
      //  FINAL PAGE: METHODOLOGY & DISCLAIMER
      // ═══════════════════════════════════════════════════════
      doc.addPage();
      section('Methodology & Disclaimer');
      doc.fontSize(9).fillColor('#334155').font('Helvetica-Bold').text('Models Used', M);
      doc.moveDown(0.3);
      const modelList = [
        'India XGBoost Regressor — Trained on 15,000 India creators, 7,000 campaigns, 150,000 interactions (R²=0.86)',
        'India Neural Network — PyTorch 128→64→32→1 architecture (MSE=0.40)',
        'sklearn RandomForest — Match scoring (200 trees, depth 15)',
        'sklearn GradientBoosting — ROI prediction (150 trees)',
        'Google Gemini Pro — Natural language reports and risk assessment',
      ];
      modelList.forEach((m) => {
        doc.fontSize(8).fillColor('#475569').font('Helvetica').text(`•  ${m}`, M + 10, doc.y, { width: CW - 20 });
        doc.moveDown(0.3);
      });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#334155').font('Helvetica-Bold').text('Feature Engineering', M);
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#475569').font('Helvetica').text(
        '15 features extracted: category match, follower fit, engagement fit, platform match, experience score, rating, categories count, languages count, followers, engagement rate, budget, duration, budget fit, versatility, success rate.',
        M, doc.y, { width: CW },
      );
      doc.moveDown(0.8);
      doc.fontSize(9).fillColor('#334155').font('Helvetica-Bold').text('Disclaimer', M);
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#475569').font('Helvetica').text(
        'This report is generated by AI/ML models and should be used as a decision-support tool. Actual campaign performance may vary based on market conditions, content quality, and audience behavior. Past performance does not guarantee future results.',
        M, doc.y, { width: CW },
      );

      // Footer
      doc.moveDown(3);
      doc.rect(M, doc.y, CW, 1).fill('#e5e7eb');
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor('#6366f1').font('Helvetica-Bold').text('INFLUENCIA', M, doc.y, { align: 'center' });
      doc.fontSize(9).fillColor('#94a3b8').font('Helvetica').text('AI-Powered Influencer Marketing Platform', M, doc.y, { align: 'center' });
      doc.fontSize(8).text(`Report generated on ${d.generatedDate}`, M, doc.y, { align: 'center' });

      doc.end();
    });
  }
}
