import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creator } from '../creators/entities/creator.entity';
import { Campaign, CampaignStatus } from '../campaigns/entities/campaign.entity';
import { Collaboration, CollaborationStatus } from '../campaigns/entities/collaboration.entity';
import { AIAnalysisReport } from './entities/ai-analysis-report.entity';
import { SocialAccount } from '../social/entities/social-account.entity';
import { BudgetPlan } from './entities/budget-plan.entity';
import { BudgetPlanAllocation } from './entities/budget-plan-allocation.entity';
import { DiscoveredCreator } from '../discovery/discovered-creator.entity';
import { AIPythonService } from './ai-python.service';
import { AiMatchingService } from '../ai/ai-matching.service';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

interface MatchAnalysis {
  score: number;
  reasons: string[];
  strengths: string[];
  concerns: string[];
  audienceOverlap: number;
  budgetFit: string;
  experienceLevel: string;
  estimatedROI: number;
}

interface CreatorMatch {
  creator: Creator;
  matchScore: number;
  analysis: MatchAnalysis;
  aiAnalysis?: AIAnalysisReport | null;
  rank: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  /**
   * In-memory cache for matching results.
   * Key: campaignId, Value: { results, timestamp }
   * TTL: 5 minutes — avoids re-running ML for every page request
   */
  private matchCache = new Map<string, { results: CreatorMatch[]; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Creator)
    private creatorsRepository: Repository<Creator>,
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
    @InjectRepository(Collaboration)
    private collaborationsRepository: Repository<Collaboration>,
    @InjectRepository(AIAnalysisReport)
    private aiReportsRepository: Repository<AIAnalysisReport>,
    @InjectRepository(SocialAccount)
    private socialAccountsRepository: Repository<SocialAccount>,
    @InjectRepository(BudgetPlan)
    private budgetPlansRepository: Repository<BudgetPlan>,
    @InjectRepository(BudgetPlanAllocation)
    private budgetPlanAllocationsRepository: Repository<BudgetPlanAllocation>,
    @InjectRepository(DiscoveredCreator)
    private discoveredCreatorsRepository: Repository<DiscoveredCreator>,
    private aiPythonService: AIPythonService,
    private aiMatchingService: AiMatchingService,
  ) {}

  async findMatchingCreators(
    campaignId: string,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<CreatorMatch>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 12;

    const campaign = await this.campaignsRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // ── Check cache ──────────────────────────────────
    const cached = this.matchCache.get(campaignId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.log(`⚡ Cache hit for campaign ${campaignId} (${cached.results.length} creators)`);
      const start = (page - 1) * pageSize;
      const slice = cached.results.slice(start, start + pageSize);
      return new PaginatedResponse(slice, cached.results.length, page, pageSize);
    }

    // ── Cache miss: compute matches ─────────────────
    this.logger.log(`🔄 Computing matches for campaign ${campaignId}...`);

    // Get all active and verified creators
    const creators = await this.creatorsRepository.find({
      where: { is_active: true, is_verified: true },
      relations: ['user'],
    });

    // Fetch all connected social accounts
    const socialAccounts = await this.socialAccountsRepository.find({
      where: { is_connected: true },
    });

    // Group social accounts by creator_id
    const socialMap = new Map<string, SocialAccount[]>();
    for (const sa of socialAccounts) {
      let list = socialMap.get(sa.creator_id);
      if (!list) {
        list = [];
        socialMap.set(sa.creator_id, list);
      }
      list.push(sa);
    }

    // STEP 1: Fast rule-based scoring for ALL creators (no external calls)
    const ruleBasedMatches: CreatorMatch[] = creators.map((creator) => {
      const analysis = this.analyzeMatch(creator, campaign!, socialMap);
      return {
        creator,
        matchScore: analysis.score,
        analysis,
        aiAnalysis: null,
        rank: 0,
      };
    });

    // Sort by rule-based score
    ruleBasedMatches.sort((a, b) => b.matchScore - a.matchScore);

    // STEP 2: Enhance TOP creators with AI/ML (only top 20 for performance)
    const topN = Math.min(20, ruleBasedMatches.length);
    const aiEnhancedPromises = ruleBasedMatches.slice(0, topN).map(async (match) => {
      try {
        // Check if cached AI report exists in DB
        const existingReport = await this.aiReportsRepository.findOne({
          where: { campaign_id: campaignId, creator_id: match.creator.id },
          order: { created_at: 'DESC' },
        });

        if (existingReport) {
          // Use cached DB report
          if (existingReport.ml_match_score) {
            match.analysis.score = Number(existingReport.ml_match_score);
            match.matchScore = Number(existingReport.ml_match_score);
          }
          if (existingReport.estimated_roi) {
            match.analysis.estimatedROI = Number(existingReport.estimated_roi);
          }
          if (existingReport.strengths?.length) {
            match.analysis.strengths = [...new Set([...match.analysis.strengths, ...existingReport.strengths])];
          }
          if (existingReport.concerns?.length) {
            match.analysis.concerns = [...new Set([...match.analysis.concerns, ...existingReport.concerns])];
          }
          match.aiAnalysis = existingReport;
        }
        // If no cached report, skip ML call — it will be done on-demand via detailed analysis
      } catch (err) {
        this.logger.warn(`⚠️ AI enrichment skipped for creator ${match.creator.id}`);
      }
      return match;
    });

    const enhanced = await Promise.all(aiEnhancedPromises);

    // Merge: AI-enhanced top N + remaining rule-based
    const allMatches = [...enhanced, ...ruleBasedMatches.slice(topN)];

    // Re-sort and assign ranks
    allMatches.sort((a, b) => b.matchScore - a.matchScore);
    allMatches.forEach((m, i) => { m.rank = i + 1; });

    // Store in cache
    this.matchCache.set(campaignId, { results: allMatches, timestamp: Date.now() });
    this.logger.log(`✅ Cached ${allMatches.length} matches for campaign ${campaignId}`);

    // Return requested page
    const start = (page - 1) * pageSize;
    const slice = allMatches.slice(start, start + pageSize);
    return new PaginatedResponse(slice, allMatches.length, page, pageSize);
  }

  private analyzeMatch(creator: Creator, campaign: Campaign, socialMap?: Map<string, SocialAccount[]>): MatchAnalysis {
    let score = 0;
    const reasons: string[] = [];
    const strengths: string[] = [];
    const concerns: string[] = [];

    // Category Match (30 points)
    if (creator.categories && creator.categories.includes(campaign.category)) {
      score += 30;
      reasons.push(`Perfect category match: ${campaign.category}`);
      strengths.push('Expert in campaign category');
    } else if (creator.categories && creator.categories.length > 0) {
      score += 10;
      concerns.push('Category mismatch - creator specializes in different niches');
    }

    const totalFollowers = this.getTotalFollowers(creator, socialMap);

    // Requirements Match (25 points)
    if (campaign.requirements) {
      const req = campaign.requirements;
      
      // Followers check
      if (req.min_followers) {
        if (totalFollowers >= req.min_followers) {
          score += 15;
          reasons.push(`Exceeds follower requirement (${totalFollowers.toLocaleString()} followers)`);
          strengths.push(`Strong audience size (${this.formatNumber(totalFollowers)} followers)`);
        } else {
          concerns.push(`Below follower requirement (has ${totalFollowers.toLocaleString()}, needs ${req.min_followers.toLocaleString()})`);
        }
      }

      // Engagement rate check
      const minEngagement = req.min_engagement_rate || 1.5;
      const engRate = this.getAverageEngagementRate(creator.id, socialMap);
      if (engRate >= minEngagement) {
        score += 10;
        reasons.push(`Exceeds engagement requirement (${engRate}% engagement rate)`);
      } else {
        concerns.push(`Below engagement requirement (has ${engRate}%, needs ${minEngagement}%)`);
      }
    }

    // ── Follower Size & Budget Mismatch Penalty (max -35 points) ──
    const { max: targetMax } = this.getTargetFollowerRange(Number(campaign.budget));
    if (totalFollowers > targetMax * 3) {
      score -= 35;
      concerns.push('Follower count is too large for campaign budget (potential pricing mismatch)');
    }

    // Experience Level (20 points)
    const experienceScore = this.calculateExperienceScore(creator);
    score += experienceScore;
    if (creator.total_campaigns > 20) {
      reasons.push(`Highly experienced (${creator.total_campaigns} campaigns completed)`);
      strengths.push('Proven track record with multiple successful campaigns');
    } else if (creator.total_campaigns > 5) {
      reasons.push(`Experienced creator (${creator.total_campaigns} campaigns)`);
      strengths.push('Solid campaign experience');
    } else if (creator.total_campaigns > 0) {
      concerns.push('Limited campaign experience');
    } else {
      concerns.push('No previous campaign experience');
    }

    // Rating & Reliability (15 points)
    if (creator.overall_rating >= 4.5) {
      score += 15;
      reasons.push(`Excellent rating: ${creator.overall_rating}/5.0`);
      strengths.push('Highly rated by previous brand partners');
    } else if (creator.overall_rating >= 4.0) {
      score += 10;
      strengths.push('Good reputation with brands');
    } else if (creator.overall_rating >= 3.0) {
      score += 5;
      concerns.push('Average rating from previous collaborations');
    }

    // Platform Match (10 points)
    const platformMatch = this.checkPlatformMatch(creator, campaign);
    score += platformMatch.score;
    if (platformMatch.matched) {
      reasons.push(`Active on ${campaign.platform}`);
      strengths.push(`Strong ${campaign.platform} presence`);
    } else {
      concerns.push(`Not primarily active on ${campaign.platform}`);
    }

    // Audience Demographics Match
    const audienceOverlap = this.calculateAudienceOverlap(creator, campaign);
    if (audienceOverlap > 70) {
      strengths.push('Excellent target audience alignment');
    } else if (audienceOverlap > 40) {
      strengths.push('Good audience match');
    } else {
      concerns.push('Limited audience overlap with target demographics');
    }

    // Budget Fit
    const budgetFit = this.assessBudgetFit(creator, campaign);

    // Experience Level
    const experienceLevel = this.getExperienceLevel(creator);

    // Estimated ROI
    const estimatedROI = this.calculateEstimatedROI(creator, campaign, score);

    return {
      score: Math.max(0, Math.min(score, 100)),
      reasons,
      strengths,
      concerns,
      audienceOverlap,
      budgetFit,
      experienceLevel,
      estimatedROI,
    };
  }

  private getTotalFollowers(creator: Creator, socialMap?: Map<string, SocialAccount[]>): number {
    if (socialMap) {
      const accounts = socialMap.get(creator.id) || [];
      if (accounts.length > 0) {
        return accounts.reduce((sum, sa) => sum + (sa.followers_count || 0), 0);
      }
    }
    // Fallback proxy
    return creator.total_campaigns * 10000 + 5000;
  }

  private getAverageEngagementRate(creatorId: string, socialMap?: Map<string, SocialAccount[]>): number {
    if (socialMap) {
      const accounts = socialMap.get(creatorId) || [];
      if (accounts.length > 0) {
        const sum = accounts.reduce((sum, sa) => sum + Number(sa.engagement_rate || 0), 0);
        return Number((sum / accounts.length).toFixed(2));
      }
    }
    return 2.5;
  }

  private getTargetFollowerRange(budget: number): { min: number; max: number } {
    if (budget > 500000) return { min: 1000000, max: 100000000 };
    if (budget > 100000) return { min: 500000, max: 1000000 };
    if (budget > 20000) return { min: 50000, max: 500000 };
    if (budget > 5000) return { min: 10000, max: 50000 };
    return { min: 1000, max: 10000 };
  }

  private calculateExperienceScore(creator: Creator): number {
    if (creator.total_campaigns >= 20) return 20;
    if (creator.total_campaigns >= 10) return 15;
    if (creator.total_campaigns >= 5) return 10;
    if (creator.total_campaigns >= 1) return 5;
    return 0;
  }

  private checkPlatformMatch(creator: Creator, campaign: Campaign): { score: number; matched: boolean } {
    // Check if creator has linked social accounts for the platform
    const socialLinks = creator.social_links || {};
    const platform = campaign.platform.toLowerCase();
    
    const hasPlatform = !!(socialLinks as any)[platform];

    return {
      score: hasPlatform ? 10 : 5, // Give partial credit if no social link
      matched: hasPlatform,
    };
  }

  private calculateAudienceOverlap(creator: Creator, campaign: Campaign): number {
    // Simplified audience overlap calculation
    // In production, use actual demographic data
    let overlap = 50; // Base overlap

    if (campaign.target_audience) {
      // Check category alignment
      if (creator.categories && creator.categories.includes(campaign.category)) {
        overlap += 30;
      }

      // Check location overlap
      if (campaign.target_audience.locations && creator.location) {
        const locationMatch = campaign.target_audience.locations.some(
          (loc: string) => creator.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (locationMatch) overlap += 20;
      }
    }

    return Math.min(overlap, 100);
  }

  private assessBudgetFit(creator: Creator, campaign: Campaign): string {
    const estimatedCost = this.estimateCreatorCost(creator);
    const budgetPerCreator = campaign.budget / Math.max(campaign.total_creators || 5, 1);

    if (estimatedCost <= budgetPerCreator * 0.7) {
      return 'Excellent fit - well within budget';
    } else if (estimatedCost <= budgetPerCreator) {
      return 'Good fit - within budget range';
    } else if (estimatedCost <= budgetPerCreator * 1.3) {
      return 'Moderate fit - slightly above typical budget';
    } else {
      return 'Premium pricing - above budget range';
    }
  }

  private estimateCreatorCost(creator: Creator): number {
    // Estimate based on followers, engagement, and experience
    const followers = this.getTotalFollowers(creator);
    const baseRate = followers * 0.01; // $0.01 per follower as base
    const experienceMultiplier = 1 + (creator.total_campaigns * 0.05);
    const ratingMultiplier = creator.overall_rating / 4.0;

    return baseRate * experienceMultiplier * ratingMultiplier;
  }

  private getExperienceLevel(creator: Creator): string {
    if (creator.total_campaigns >= 20) return 'Expert';
    if (creator.total_campaigns >= 10) return 'Advanced';
    if (creator.total_campaigns >= 5) return 'Intermediate';
    if (creator.total_campaigns >= 1) return 'Beginner';
    return 'New';
  }

  private calculateEstimatedROI(creator: Creator, campaign: Campaign, matchScore: number): number {
    // ROI estimation based on various factors
    const engagementFactor = 1; // Default engagement factor
    const ratingFactor = Number(creator.overall_rating) / 5;
    const matchFactor = matchScore / 100;
    const experienceFactor = Math.min(creator.total_campaigns / 20, 1);

    const roi = (engagementFactor + ratingFactor + matchFactor + experienceFactor) / 4 * 300;
    return Math.round(roi);
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  async getDetailedCreatorAnalysis(campaignId: string, creatorId: string): Promise<any> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id: campaignId },
    });

    const creator = await this.creatorsRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],
    });

    if (!campaign || !creator) {
      throw new NotFoundException('Campaign or Creator not found');
    }

    // Start with basic rule-based analysis
    const analysis = this.analyzeMatch(creator, campaign);

    // Get AI/ML analysis
    let aiAnalysis: any = null;
    try {
      aiAnalysis = await this.getAIAnalysis(campaignId, creatorId);
      
      // ✅ FIX: Use ML score instead of rule-based score
      // getAIAnalysis returns ml_predictions.match_score (already 0-100 percentage)
      if (aiAnalysis?.ml_predictions?.match_score !== undefined) {
        analysis.score = Math.round(aiAnalysis.ml_predictions.match_score);
        this.logger.log(`📊 Using ML predictions score: ${analysis.score}%`);
      } else if (aiAnalysis?.match_score !== undefined) {
        analysis.score = Math.round(aiAnalysis.match_score);
        this.logger.log(`📊 Using combined match score: ${analysis.score}%`);
      } else {
        this.logger.warn(`⚠️ No ML score available, using rule-based: ${analysis.score}%`);
      }
      
      // Update other metrics from AI analysis
      if (aiAnalysis?.ml_predictions?.estimated_roi) {
        analysis.estimatedROI = Math.round(aiAnalysis.ml_predictions.estimated_roi);
      }
      if (aiAnalysis?.audience_overlap) {
        analysis.audienceOverlap = Math.round(aiAnalysis.audience_overlap);
      }
      
      // Update experience level from AI insights
      if (aiAnalysis?.ml_predictions?.confidence) {
        const confidence = aiAnalysis.ml_predictions.confidence;
        if (confidence >= 90) {
          analysis.experienceLevel = 'Expert';
        } else if (confidence >= 75) {
          analysis.experienceLevel = 'Advanced';
        } else if (confidence >= 60) {
          analysis.experienceLevel = 'Intermediate';
        }
      }
    } catch (error) {
      this.logger.error(`❌ AI analysis failed, using rule-based score: ${analysis.score}%`, error.message);
    }

    return {
      creator,
      campaign,
      analysis,
      recommendations: this.generateRecommendations(creator, campaign, analysis),
      comparisons: await this.getComparativeMetrics(creator, campaign),
      aiAnalysis, // Include AI analysis in response
    };
  }

  private generateRecommendations(creator: Creator, campaign: Campaign, analysis: MatchAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.score >= 80) {
      recommendations.push('Highly recommended collaboration');
      recommendations.push('Send collaboration request immediately');
    } else if (analysis.score >= 60) {
      recommendations.push('Good potential match');
      recommendations.push('Consider for collaboration with clear deliverables');
    }

    if (analysis.concerns.length > 0) {
      recommendations.push('Address concerns in collaboration brief');
    }

    if (creator.total_campaigns === 0) {
      recommendations.push('New creator - consider starting with smaller deliverables');
    }

    return recommendations;
  }

  /**
   * Industry benchmark data derived from ML training data (data_generator.py)
   * and real influencer marketing industry standards.
   */
  private readonly INDUSTRY_BENCHMARKS = {
    // Tier thresholds (follower count)
    tierThresholds: {
      nano: { min: 0, max: 10_000 },
      micro: { min: 10_000, max: 50_000 },
      mid: { min: 50_000, max: 500_000 },
      macro: { min: 500_000, max: 1_000_000 },
      mega: { min: 1_000_000, max: Infinity },
    },
    // Average campaign earnings per post by tier
    avgEarningsPerCampaign: {
      nano: { min: 100, max: 500, avg: 250 },
      micro: { min: 500, max: 2000, avg: 1000 },
      mid: { min: 2000, max: 10000, avg: 5000 },
      macro: { min: 10000, max: 50000, avg: 25000 },
      mega: { min: 50000, max: 500000, avg: 150000 },
    },
    // Expected engagement rate by platform & tier
    engagementBenchmarks: {
      instagram: { nano: 8, micro: 6, mid: 4, macro: 2.5, mega: 1.5 },
      youtube: { nano: 6, micro: 5, mid: 3.5, macro: 2, mega: 1.2 },
      tiktok: { nano: 12, micro: 10, mid: 7, macro: 4, mega: 2.5 },
      twitter: { nano: 4, micro: 3, mid: 2, macro: 1.2, mega: 0.8 },
    } as Record<string, Record<string, number>>,
    // Average reach multiplier (reach as % of followers)
    reachMultiplier: {
      nano: 0.35,
      micro: 0.28,
      mid: 0.20,
      macro: 0.15,
      mega: 0.10,
    } as Record<string, number>,
    // Average ROI multiplier by tier (matched campaigns)
    roiByTier: {
      nano: 8.0,
      micro: 6.0,
      mid: 4.5,
      macro: 3.5,
      mega: 2.5,
    } as Record<string, number>,
    // CPM (cost per mille / cost per 1000 impressions) by platform
    cpmByPlatform: {
      instagram: { min: 5, max: 15, avg: 10 },
      youtube: { min: 8, max: 25, avg: 15 },
      tiktok: { min: 3, max: 10, avg: 6 },
      twitter: { min: 3, max: 8, avg: 5 },
    } as Record<string, { min: number; max: number; avg: number }>,
    // Category-specific budget multipliers
    categoryBudgetMultiplier: {
      fashion: 1.3, beauty: 1.25, luxury: 2.0, tech: 1.4, gaming: 1.1,
      fitness: 1.0, food: 0.9, travel: 1.3, finance: 1.5, education: 0.8,
      entertainment: 1.0, music: 1.1, health: 1.2, lifestyle: 1.0, parenting: 0.85,
      pets: 0.8, sports: 1.1, automotive: 1.4, home: 0.9, art: 0.75,
    } as Record<string, number>,
  };

  private getCreatorTier(followers: number): string {
    const { tierThresholds } = this.INDUSTRY_BENCHMARKS;
    if (followers >= tierThresholds.mega.min) return 'mega';
    if (followers >= tierThresholds.macro.min) return 'macro';
    if (followers >= tierThresholds.mid.min) return 'mid';
    if (followers >= tierThresholds.micro.min) return 'micro';
    return 'nano';
  }

  private async getComparativeMetrics(creator: Creator, campaign: Campaign): Promise<any> {
    // ── 1. Get creator's social accounts for real follower / engagement data ──
    const socialAccounts = await this.socialAccountsRepository.find({
      where: { creator_id: creator.id, is_connected: true },
    });

    // Aggregate follower count and best engagement rate across platforms
    let totalFollowers = 0;
    let bestEngagementRate = 0;
    let primaryPlatform = campaign.platform?.toLowerCase() || 'instagram';
    let platformFollowers = 0;

    for (const account of socialAccounts) {
      const followers = account.followers_count || 0;
      const engagement = Number(account.engagement_rate) || 0;
      totalFollowers += followers;
      if (engagement > bestEngagementRate) bestEngagementRate = engagement;
      if (account.platform === primaryPlatform) {
        platformFollowers = followers;
      }
    }

    // Fallback: if no social accounts linked, estimate from campaign history
    if (totalFollowers === 0) {
      totalFollowers = this.getTotalFollowers(creator);
    }
    // Use platform-specific followers if available, otherwise total
    const relevantFollowers = platformFollowers > 0 ? platformFollowers : totalFollowers;
    const tier = this.getCreatorTier(relevantFollowers);

    // ── 2. Calculate Industry Average Budget for this category + tier ──
    const category = (campaign.category || '').toLowerCase();
    const categoryMultiplier = this.INDUSTRY_BENCHMARKS.categoryBudgetMultiplier[category] || 1.0;
    const tierEarnings = this.INDUSTRY_BENCHMARKS.avgEarningsPerCampaign[tier];
    const industryAverageBudget = Math.round(tierEarnings.avg * categoryMultiplier);

    // Also check DB for real completed campaign data to blend
    const similarCampaigns = await this.campaignsRepository.find({
      where: { category: campaign.category, status: CampaignStatus.COMPLETED },
      take: 20,
    });
    let dbAvgBudget = 0;
    if (similarCampaigns.length > 0) {
      dbAvgBudget = similarCampaigns.reduce((sum, c) => sum + Number(c.budget), 0) / similarCampaigns.length;
    }
    // Blend: if we have real data, weight it 60% vs 40% industry benchmark
    const blendedBudget = dbAvgBudget > 0
      ? Math.round(dbAvgBudget * 0.6 + industryAverageBudget * 0.4)
      : industryAverageBudget;

    // ── 3. Calculate Industry Average Reach ──
    const reachMultiplier = this.INDUSTRY_BENCHMARKS.reachMultiplier[tier];
    const estimatedReachPerPost = Math.round(relevantFollowers * reachMultiplier);
    let dbAvgReach = 0;
    if (similarCampaigns.length > 0) {
      dbAvgReach = similarCampaigns.reduce((sum, c) => sum + (c.total_reach || 0), 0) / similarCampaigns.length;
    }
    const blendedReach = dbAvgReach > 0
      ? Math.round(dbAvgReach * 0.6 + estimatedReachPerPost * 0.4)
      : estimatedReachPerPost;

    // ── 4. Engagement Rate Benchmark ──
    const platformBenchmarks = this.INDUSTRY_BENCHMARKS.engagementBenchmarks[primaryPlatform]
      || this.INDUSTRY_BENCHMARKS.engagementBenchmarks.instagram;
    const benchmarkEngagement = platformBenchmarks[tier] || 4.0;
    const creatorEngagement = bestEngagementRate > 0 ? bestEngagementRate : null;

    // ── 5. CPM Estimate ──
    const platformCPM = this.INDUSTRY_BENCHMARKS.cpmByPlatform[primaryPlatform]
      || this.INDUSTRY_BENCHMARKS.cpmByPlatform.instagram;

    // ── 6. Creator Positioning (multi-factor scoring) ──
    let positioningScore = 0;
    let positioningFactors: string[] = [];

    // Factor 1: Engagement vs benchmark (40% weight)
    if (creatorEngagement !== null) {
      const engagementRatio = creatorEngagement / benchmarkEngagement;
      if (engagementRatio >= 1.5) {
        positioningScore += 40;
        positioningFactors.push('Exceptional engagement rate');
      } else if (engagementRatio >= 1.0) {
        positioningScore += 30;
        positioningFactors.push('Above-average engagement');
      } else if (engagementRatio >= 0.7) {
        positioningScore += 20;
        positioningFactors.push('Average engagement');
      } else {
        positioningScore += 10;
        positioningFactors.push('Below-average engagement');
      }
    } else {
      positioningScore += 20; // Neutral if no data
    }

    // Factor 2: Rating (25% weight)
    const rating = Number(creator.overall_rating) || 0;
    if (rating >= 4.5) {
      positioningScore += 25;
      positioningFactors.push('Excellent brand rating');
    } else if (rating >= 4.0) {
      positioningScore += 20;
      positioningFactors.push('Good brand rating');
    } else if (rating >= 3.0) {
      positioningScore += 12;
    } else {
      positioningScore += 5;
    }

    // Factor 3: Experience (20% weight)
    const campaigns = creator.total_campaigns || 0;
    if (campaigns >= 20) {
      positioningScore += 20;
      positioningFactors.push('Veteran creator');
    } else if (campaigns >= 10) {
      positioningScore += 15;
    } else if (campaigns >= 5) {
      positioningScore += 10;
    } else {
      positioningScore += 5;
    }

    // Factor 4: Follower tier (15% weight)
    const tierScoreMap: Record<string, number> = { mega: 15, macro: 13, mid: 10, micro: 7, nano: 5 };
    positioningScore += tierScoreMap[tier] || 5;

    // Map score to positioning label
    let creatorPositioning: string;
    if (positioningScore >= 85) creatorPositioning = 'Top 5% — Elite';
    else if (positioningScore >= 70) creatorPositioning = 'Top 15% — Excellent';
    else if (positioningScore >= 55) creatorPositioning = 'Above Average';
    else if (positioningScore >= 40) creatorPositioning = 'Average';
    else creatorPositioning = 'Below Average';

    // ── 7. Estimated ROI ──
    const tierROI = this.INDUSTRY_BENCHMARKS.roiByTier[tier] || 4.0;

    return {
      industryAverageBudget: blendedBudget,
      industryAverageReach: blendedReach,
      creatorPositioning,
      // Extended benchmark data
      creatorTier: tier.charAt(0).toUpperCase() + tier.slice(1),
      totalFollowers: relevantFollowers,
      engagementRate: creatorEngagement,
      benchmarkEngagementRate: benchmarkEngagement,
      estimatedCPM: platformCPM.avg,
      estimatedROI: tierROI,
      positioningScore,
      positioningFactors,
      tierEarningsRange: { min: tierEarnings.min, max: tierEarnings.max },
    };
  }

  async getRecommendedCampaigns(creatorId: string): Promise<any[]> {
    const creator = await this.creatorsRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      return [];
    }

    const socialAccounts = await this.socialAccountsRepository.find({
      where: { creator_id: creatorId, is_connected: true },
    });

    const socialMap = new Map<string, SocialAccount[]>();
    socialMap.set(creatorId, socialAccounts);

    const campaigns = await this.campaignsRepository.find({
      where: { status: CampaignStatus.ACTIVE },
      relations: ['brand'],
    });

    return campaigns.map(campaign => ({
      ...campaign,
      matchScore: this.analyzeMatch(creator, campaign, socialMap).score,
    })).sort((a, b) => b.matchScore - a.matchScore);
  }

  async createCollaborationRequest(
    campaignId: string,
    creatorId: string,
    data: { proposed_budget?: number; message?: string; deliverables?: any; deadline?: Date },
  ): Promise<Collaboration> {
    // Check if collaboration already exists
    const existing = await this.collaborationsRepository.findOne({
      where: { campaign_id: campaignId, creator_id: creatorId },
    });

    if (existing) {
      throw new Error('Collaboration request already exists');
    }

    const collaboration = this.collaborationsRepository.create({
      campaign_id: campaignId,
      creator_id: creatorId,
      ...data,
      status: CollaborationStatus.PENDING,
    });

    return this.collaborationsRepository.save(collaboration);
  }

  async getCollaborationsByCampaign(campaignId: string): Promise<Collaboration[]> {
    return this.collaborationsRepository.find({
      where: { campaign_id: campaignId },
      relations: ['creator', 'creator.user'],
      order: { created_at: 'DESC' },
    });
  }

  // AI-POWERED METHODS

  /**
   * Get AI-powered comprehensive analysis
   * Flow: ML API (predictions) → AI Service (Gemini reports)
   */
  async getAIAnalysis(campaignId: string, creatorId: string): Promise<any> {
    // ALWAYS generate fresh analysis (no cache for now)
    this.logger.log(`🔍 Getting AI analysis for campaign ${campaignId} and creator ${creatorId}`);
    
    const campaign = await this.campaignsRepository.findOne({
      where: { id: campaignId },
    });

    const creator = await this.creatorsRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],
    });

    if (!campaign || !creator) {
      throw new NotFoundException('Campaign or creator not found');
    }

    const socialAccounts = await this.socialAccountsRepository.find({
      where: { creator_id: creatorId, is_connected: true },
    });

    const socialMap = new Map<string, SocialAccount[]>();
    socialMap.set(creatorId, socialAccounts);

    // STEP 1: Get ML predictions from FastAPI (port 5001)
    this.logger.log(`📊 Step 1: Getting ML predictions from FastAPI...`);
    let mlPrediction: any;
    try {
      mlPrediction = await this.aiMatchingService.getMatchScore(
        this.aiMatchingService.formatCreatorForML(creator, socialAccounts),
        this.aiMatchingService.formatCampaignForML(campaign)
      );
      this.logger.log(`✅ ML Prediction received: score=${mlPrediction.match_score}, confidence=${mlPrediction.confidence}`);
    } catch (error) {
      this.logger.warn(`⚠️ ML API unavailable, using fallback predictions`);
      // Fallback to basic scoring
      mlPrediction = {
        match_score: this.analyzeMatch(creator, campaign, socialMap).score / 100,
        confidence: 0.5,
        model_scores: {
          xgboost: 0,
          neural_network: 0,
          bert_semantic: 0
        }
      };
    }

    // STEP 2: Get AI-powered comprehensive analysis from Flask API (port 5002)
    this.logger.log(`🤖 Step 2: Generating AI-powered report with Gemini...`);
    let aiAnalysis: any;
    try {
      aiAnalysis = await this.aiPythonService.getAnalysis(creator, campaign);
      this.logger.log(`✅ AI Analysis received with Gemini insights`);
    } catch (error) {
      this.logger.warn(`⚠️ AI service unavailable, using basic analysis`);
      aiAnalysis = {
        match_score: mlPrediction.match_score * 100,
        ml_predictions: {
          match_score: mlPrediction.match_score * 100,
          estimated_roi: 150,
          estimated_engagement: 5.0
        },
        strengths: [],
        concerns: [],
        reasons: [],
        audience_overlap: 50
      };
    }

    // STEP 3: Merge ML predictions with AI analysis
    const combinedAnalysis = {
      ...aiAnalysis,
      ml_predictions: {
        match_score: mlPrediction.match_score * 100,
        confidence: mlPrediction.confidence * 100,
        estimated_roi: aiAnalysis.ml_predictions?.estimated_roi || 150,
        estimated_engagement: aiAnalysis.ml_predictions?.estimated_engagement || 5.0,
        model_breakdown: {
          xgboost: (mlPrediction.model_scores?.xgboost || 0) * 100,
          neural_network: (mlPrediction.model_scores?.neural_network || 0) * 100,
          bert_semantic: (mlPrediction.model_scores?.bert_semantic || 0) * 100
        }
      },
      match_score: mlPrediction.match_score * 100  // Use ML score as primary
    };

    this.logger.log(`✅ Combined Analysis: ML=${combinedAnalysis.ml_predictions.match_score.toFixed(2)}%, Confidence=${combinedAnalysis.ml_predictions.confidence.toFixed(2)}%, ROI=${combinedAnalysis.ml_predictions.estimated_roi}%`);

    // Delete old cached report if exists
    await this.aiReportsRepository.delete({
      campaign_id: campaignId,
      creator_id: creatorId,
    });

    // Save NEW analysis to database
    const report = new AIAnalysisReport();
    report.campaign_id = campaignId;
    report.creator_id = creatorId;
    report.match_score = combinedAnalysis.match_score || 0;
    if (combinedAnalysis.ml_predictions?.match_score) report.ml_match_score = combinedAnalysis.ml_predictions.match_score;
    if (combinedAnalysis.dl_predictions?.match_score) report.dl_match_score = combinedAnalysis.dl_predictions.match_score;
    if (combinedAnalysis.ml_predictions?.estimated_roi) report.estimated_roi = combinedAnalysis.ml_predictions.estimated_roi;
    if (combinedAnalysis.dl_predictions?.success_probability) report.success_probability = combinedAnalysis.dl_predictions.success_probability;
    if (combinedAnalysis.dl_predictions?.predicted_engagement) report.predicted_engagement = combinedAnalysis.dl_predictions.predicted_engagement;
    if (combinedAnalysis.audience_overlap) report.audience_overlap = combinedAnalysis.audience_overlap;
    report.strengths = combinedAnalysis.strengths || [];
    report.concerns = combinedAnalysis.concerns || [];
    report.reasons = combinedAnalysis.reasons || [];
    report.model_version = '1.0';
    report.confidence_level = combinedAnalysis.match_score >= 80 ? 'high' : combinedAnalysis.match_score >= 60 ? 'medium' : 'low';
    report.features_used = combinedAnalysis.features || {};

    await this.aiReportsRepository.save(report);

    this.logger.log(`💾 Saved AI report to database`);

    return combinedAnalysis;
  }

  /**
   * Generate comprehensive AI report with Gemini
   * Flow: Get/Generate ML analysis → Generate Gemini report
   */
  async generateAIReport(campaignId: string, creatorId: string): Promise<any> {
    this.logger.log(`📝 Generating comprehensive AI report for campaign ${campaignId} and creator ${creatorId}`);
    
    const campaign = await this.campaignsRepository.findOne({
      where: { id: campaignId },
    });

    const creator = await this.creatorsRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],
    });

    if (!campaign || !creator) {
      throw new NotFoundException('Campaign or creator not found');
    }

    // STEP 1: Get or generate ML-powered analysis
    let analysis = await this.aiReportsRepository.findOne({
      where: { campaign_id: campaignId, creator_id: creatorId },
    });

    if (!analysis) {
      this.logger.log(`📊 No existing analysis found, generating new ML analysis...`);
      const combinedAnalysis = await this.getAIAnalysis(campaignId, creatorId);
      // Analysis is now saved in database by getAIAnalysis
      analysis = await this.aiReportsRepository.findOne({
        where: { campaign_id: campaignId, creator_id: creatorId },
      });
    } else {
      this.logger.log(`✅ Using existing ML analysis (score: ${analysis.ml_match_score})`);
    }

    // STEP 2: Generate Gemini-powered comprehensive report
    this.logger.log(`🤖 Generating Gemini AI report...`);
    // Pass undefined for now - Gemini will use creator/campaign data directly
    const report = await this.aiPythonService.generateReport(creator, campaign, undefined);

    // STEP 3: Update database with full Gemini report
    if (analysis) {
      analysis.full_report = report.full_report;
      analysis.ai_summary = report.quick_summary;
      analysis.ai_recommendations = report.recommendations;
      analysis.risk_assessment = report.risk_assessment;

      await this.aiReportsRepository.save(analysis);
      this.logger.log(`💾 Saved Gemini report to database`);
    }

    return report;
  }

  /**
   * Get all AI reports for a campaign
   */
  async getAIReportsByCampaign(campaignId: string): Promise<AIAnalysisReport[]> {
    return this.aiReportsRepository.find({
      where: { campaign_id: campaignId },
      relations: ['creator', 'creator.user'],
      order: { match_score: 'DESC' },
    });
  }

  /**
   * AI-driven budget optimizer helper calculations
   */
  private getCreatorCPM(platform: string, followers: number): number {
    const p = platform.toLowerCase();
    if (p === 'youtube') {
      if (followers >= 1000000) return 950;
      if (followers >= 500000) return 650;
      if (followers >= 50000) return 450;
      if (followers >= 10000) return 350;
      return 250;
    } else { // instagram / tiktok / default
      if (followers >= 1000000) return 650;
      if (followers >= 500000) return 450;
      if (followers >= 50000) return 300;
      if (followers >= 10000) return 200;
      return 150;
    }
  }

  private estimateBudgetCost(followers: number, platform: string, engagementRate: number = 3.5): number {
    const f = Math.max(1000, followers || 25000);
    let baseRate = 5000;

    if (f >= 100000000) { // Super Mega (100M+) -> e.g. MrBeast
      baseRate = 5000000 + ((f - 100000000) / 100000000) * 2000000; // ₹50 Lakhs - ₹70 Lakhs base
    } else if (f >= 10000000) { // Mega (10M - 100M)
      baseRate = 500000 + ((f - 10000000) / 90000000) * 1500000; // ₹5 Lakhs - ₹20 Lakhs base
    } else if (f >= 1000000) { // Mega (1M - 10M)
      baseRate = 120000 + ((f - 1000000) / 9000000) * 380000; // ₹1.2 Lakhs - ₹5 Lakhs base
    } else if (f >= 500000) { // Macro (500K - 1M)
      baseRate = 60000 + ((f - 500000) / 500000) * 60000; // ₹60K - ₹1.2 Lakhs base
    } else if (f >= 50000) { // Mid (50K - 500K)
      baseRate = 18000 + ((f - 50000) / 450000) * 42000; // ₹18K - ₹60K base
    } else if (f >= 10000) { // Micro (10K - 50K)
      baseRate = 5000 + ((f - 10000) / 40000) * 13000; // ₹5K - ₹18K base
    } else { // Nano (<10K)
      baseRate = 1500 + (f / 10000) * 3500; // ₹1.5K - ₹5K base
    }

    const platformMultiplier = platform?.toLowerCase() === 'youtube' ? 1.4 : 1.0;
    const engMultiplier = Math.max(0.8, Math.min(2.0, (engagementRate || 3.5) / 3.5));

    const finalRate = Math.round(baseRate * platformMultiplier * engMultiplier);
    return Math.max(1500, finalRate);
  }

  async recommendBudgetAllocation(
    campaignId: string,
    totalBudget?: number,
    targetMetric: string = 'reach',
    lockedCreatorIds: string[] = [],
  ): Promise<any> {
    const campaign = await this.campaignsRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const effectiveBudget = (totalBudget && totalBudget > 0) ? Number(totalBudget) : Number(campaign.budget || 100000);

    // Get all platform creators and connect their social metrics
    const creators = await this.creatorsRepository.find({
      where: { is_active: true },
      relations: ['user'],
    });

    const socialAccounts = await this.socialAccountsRepository.find({
      where: { is_connected: true },
    });

    const socialMap = new Map<string, SocialAccount[]>();
    for (const sa of socialAccounts) {
      let list = socialMap.get(sa.creator_id);
      if (!list) {
        list = [];
        socialMap.set(sa.creator_id, list);
      }
      list.push(sa);
    }

    // Get discovered creators for this campaign, with fallback to global discovered creators
    let discoveredCreators = await this.discoveredCreatorsRepository.find({
      where: { campaign_id: campaignId },
    });

    if (discoveredCreators.length < 5) {
      const globalDiscovered = await this.discoveredCreatorsRepository.find({
        take: 20,
        order: { match_score: 'DESC' },
      });
      const existingIds = new Set(discoveredCreators.map((dc) => dc.id));
      for (const g of globalDiscovered) {
        if (!existingIds.has(g.id)) {
          discoveredCreators.push(g);
        }
      }
    }

    // 1. Build registered platform creators pool
    const registeredPool = creators.map((creator) => {
      const followers = this.getTotalFollowers(creator, socialMap);
      const engagementRate = this.getAverageEngagementRate(creator.id, socialMap);
      const cost = this.estimateBudgetCost(followers, campaign.platform, engagementRate);
      
      const expectedImpressions = Math.round((followers || 25000) * 0.85);
      const expectedEngagements = Math.round(expectedImpressions * ((engagementRate || 4.0) / 100));
      const matchScore = this.analyzeMatch(creator, campaign, socialMap).score;

      let metricValue = expectedImpressions;
      if (targetMetric === 'engagement') {
        metricValue = expectedEngagements;
      } else if (targetMetric === 'conversions') {
        metricValue = Math.round(expectedEngagements * 0.15);
      }
      const density = cost > 0 ? (metricValue * matchScore) / cost : 0;

      return {
        creator_id: creator.id,
        name: `${creator.user?.first_name || ''} ${creator.user?.last_name || ''}`.trim() || 'Creator',
        avatar_url: creator.avatar_url,
        followers,
        engagementRate,
        cost,
        expectedImpressions,
        expectedEngagements,
        matchScore,
        density,
        isDiscovered: false,
      };
    });

    // 2. Build campaign discovered creators pool
    const discoveredPool = discoveredCreators.map((dc) => {
      const followers = dc.followers_count || 50000;
      const engagementRate = Number(dc.engagement_rate) || 4.5;
      const cost = this.estimateBudgetCost(followers, dc.platform || campaign.platform, engagementRate);
      
      const expectedImpressions = Math.round(followers * 0.85);
      const expectedEngagements = Math.round(expectedImpressions * (engagementRate / 100));
      const matchScore = Number(dc.match_score) || 75;

      let metricValue = expectedImpressions;
      if (targetMetric === 'engagement') {
        metricValue = expectedEngagements;
      } else if (targetMetric === 'conversions') {
        metricValue = Math.round(expectedEngagements * 0.15);
      }
      const density = cost > 0 ? (metricValue * matchScore) / cost : 0;

      return {
        creator_id: dc.id,
        name: dc.name || 'Discovered Creator',
        avatar_url: dc.avatar_url,
        followers,
        engagementRate,
        cost,
        expectedImpressions,
        expectedEngagements,
        matchScore,
        density,
        isDiscovered: true,
      };
    });

    const preselectedIds = new Set(lockedCreatorIds);

    // Filter out creators whose actual base cost exceeds the campaign budget
    // (Unless they are locked by the user, in which case we keep them in the pool)
    const creatorPool = [...registeredPool, ...discoveredPool].filter(
      (item) => item.cost <= effectiveBudget || preselectedIds.has(item.creator_id)
    );

    // Solve greedy knapsack
    let remainingBudget = effectiveBudget;
    const selectedAllocations: any[] = [];

    // First pass: select locked creators
    for (const item of creatorPool) {
      if (preselectedIds.has(item.creator_id)) {
        selectedAllocations.push({
          creator_id: item.creator_id,
          name: item.name,
          avatar_url: item.avatar_url,
          followers: item.followers,
          engagementRate: item.engagementRate,
          allocated_amount: item.cost,
          expected_impressions: item.expectedImpressions,
          expected_engagements: item.expectedEngagements,
          is_locked: true,
          matchScore: item.matchScore,
          isDiscovered: item.isDiscovered,
        });
        remainingBudget -= item.cost;
      }
    }

    // Second pass: fill remaining budget with max 35% allocation per single creator
    const maxSingleCreatorCost = Math.max(8000, effectiveBudget * 0.35);
    const remainingPool = creatorPool
      .filter((item) => !preselectedIds.has(item.creator_id))
      .sort((a, b) => b.density - a.density);

    for (const item of remainingPool) {
      const actualCost = Math.min(item.cost, maxSingleCreatorCost);
      if (remainingBudget >= actualCost) {
        const scale = item.cost > 0 ? actualCost / item.cost : 1;
        selectedAllocations.push({
          creator_id: item.creator_id,
          name: item.name,
          avatar_url: item.avatar_url,
          followers: item.followers,
          engagementRate: item.engagementRate,
          allocated_amount: Math.round(actualCost),
          expected_impressions: Math.round(item.expectedImpressions * scale),
          expected_engagements: Math.round(item.expectedEngagements * scale),
          is_locked: false,
          matchScore: item.matchScore,
          isDiscovered: item.isDiscovered,
        });
        remainingBudget -= actualCost;
      }
    }

    // Compute aggregated outcomes
    const allocatedBudget = effectiveBudget - remainingBudget;
    const totalReach = selectedAllocations.reduce((sum, item) => sum + item.expected_impressions, 0);
    const totalEngagements = selectedAllocations.reduce((sum, item) => sum + item.expected_engagements, 0);
    
    // Weighted average engagement rate
    const avgEng = selectedAllocations.length > 0 
      ? Number((selectedAllocations.reduce((sum, item) => sum + item.engagementRate, 0) / selectedAllocations.length).toFixed(2))
      : 0;

    // Conversion estimation: 1.5% of impressions
    const conversions = Math.round(totalReach * 0.015);
    const predictedRoi = allocatedBudget > 0 
      ? Number(((conversions * 1500) / allocatedBudget * 100).toFixed(1))
      : 0;

    return {
      total_budget: effectiveBudget,
      allocated_budget: Number(allocatedBudget.toFixed(2)),
      remaining_budget: Number(remainingBudget.toFixed(2)),
      predicted_reach: totalReach,
      predicted_engagement: avgEng,
      predicted_roi: predictedRoi,
      conversions,
      allocations: selectedAllocations,
    };
  }

  async recalculateAllocationStats(
    campaignId: string,
    allocations: Array<{ creator_id: string; allocated_amount: number; is_locked: boolean }>,
  ): Promise<any> {
    const campaign = await this.campaignsRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const socialAccounts = await this.socialAccountsRepository.find({
      where: { is_connected: true },
    });

    const socialMap = new Map<string, SocialAccount[]>();
    for (const sa of socialAccounts) {
      let list = socialMap.get(sa.creator_id);
      if (!list) {
        list = [];
        socialMap.set(sa.creator_id, list);
      }
      list.push(sa);
    }

    const recalculatedAllocations: any[] = [];
    let allocatedBudget = 0;

    for (const alloc of allocations) {
      let creatorName = 'Creator';
      let avatarUrl: string | null = null;
      let followers = 25000;
      let engagementRate = 4.0;
      let matchScore = 75;
      let isDiscovered = false;

      const registered = await this.creatorsRepository.findOne({
        where: { id: alloc.creator_id },
        relations: ['user'],
      });

      if (registered) {
        followers = this.getTotalFollowers(registered, socialMap);
        engagementRate = this.getAverageEngagementRate(registered.id, socialMap);
        matchScore = this.analyzeMatch(registered, campaign, socialMap).score;
        creatorName = `${registered.user?.first_name || ''} ${registered.user?.last_name || ''}`.trim() || 'Creator';
        avatarUrl = registered.avatar_url;
      } else {
        const discovered = await this.discoveredCreatorsRepository.findOne({
          where: { id: alloc.creator_id },
        });
        if (discovered) {
          followers = discovered.followers_count || 50000;
          engagementRate = Number(discovered.engagement_rate) || 4.5;
          matchScore = Number(discovered.match_score) || 75;
          creatorName = discovered.name;
          avatarUrl = discovered.avatar_url;
          isDiscovered = true;
        } else {
          continue;
        }
      }

      // Adjust expectations based on custom input budget
      const baseCost = this.estimateBudgetCost(followers, campaign.platform, engagementRate);
      const scaleFactor = baseCost > 0 ? Number(alloc.allocated_amount) / baseCost : 1;

      const expectedImpressions = Math.round(followers * 0.85 * Math.min(2, scaleFactor));
      const expectedEngagements = Math.round(expectedImpressions * (engagementRate / 100));

      recalculatedAllocations.push({
        creator_id: alloc.creator_id,
        name: creatorName,
        avatar_url: avatarUrl,
        followers,
        engagementRate,
        allocated_amount: Number(alloc.allocated_amount),
        expected_impressions: expectedImpressions,
        expected_engagements: expectedEngagements,
        is_locked: alloc.is_locked,
        matchScore,
        isDiscovered,
      });

      allocatedBudget += Number(alloc.allocated_amount);
    }

    const totalReach = recalculatedAllocations.reduce((sum, item) => sum + item.expected_impressions, 0);
    const totalEngagements = recalculatedAllocations.reduce((sum, item) => sum + item.expected_engagements, 0);
    
    const avgEng = recalculatedAllocations.length > 0 
      ? Number((recalculatedAllocations.reduce((sum, item) => sum + item.engagementRate, 0) / recalculatedAllocations.length).toFixed(2))
      : 0;

    const conversions = Math.round(totalReach * 0.015);
    const predictedRoi = allocatedBudget > 0 
      ? Number(((conversions * 1500) / allocatedBudget * 100).toFixed(1))
      : 0;

    return {
      allocated_budget: Number(allocatedBudget.toFixed(2)),
      predicted_reach: totalReach,
      predicted_engagement: avgEng,
      predicted_roi: predictedRoi,
      conversions,
      allocations: recalculatedAllocations,
    };
  }
}
