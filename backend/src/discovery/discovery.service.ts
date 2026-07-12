import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull';

import { CampaignCreatorScore } from './entities/campaign-creator-score.entity';
import { DiscoveryJob, JobStatus } from './entities/discovery-job.entity';
import { CreatorIndex } from './entities/creator-index.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Creator } from '../creators/entities/creator.entity';
import { Brand } from '../brands/entities/brand.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { DISCOVERY_QUEUE, DISCOVER_JOB, DiscoveryQueueProcessor } from './discovery.queue';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @InjectRepository(CampaignCreatorScore)
    private scoreRepo: Repository<CampaignCreatorScore>,
    @InjectRepository(DiscoveryJob)
    private jobRepo: Repository<DiscoveryJob>,
    @InjectRepository(CreatorIndex)
    private creatorIndexRepo: Repository<CreatorIndex>,
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    @InjectRepository(Creator)
    private creatorRepo: Repository<Creator>,
    @InjectRepository(Brand)
    private brandRepo: Repository<Brand>,
    @InjectQueue(DISCOVERY_QUEUE)
    private discoveryQueue: Bull.Queue,
    private dataSource: DataSource,
    private queueProcessor: DiscoveryQueueProcessor,
  ) {}

  /**
   * Trigger a discovery job. Returns immediately — job runs in background.
   * Frontend polls getLatestJob() for status.
   */
  async discoverCreators(
    campaignId: string,
    options?: { region?: string; forceRefresh?: boolean },
    triggeredBy = 'user_sync',
  ): Promise<{ jobId: string; message: string; status: string }> {
    const trigger = (triggeredBy || 'user_sync').slice(0, 30);
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    // Check if a job is already running
    const running = await this.jobRepo.findOne({
      where: { campaign_id: campaignId, status: JobStatus.RUNNING },
    });
    if (running) {
      return { jobId: running.id, message: 'Discovery already in progress', status: 'running' };
    }

    // If not forceRefresh, check for recent successful job
    if (!options?.forceRefresh) {
      const recent = await this.jobRepo.findOne({
        where: { campaign_id: campaignId, status: JobStatus.DONE },
        order: { completed_at: 'DESC' },
      });
      if (recent && recent.total_found > 0) {
        const ageHours = (Date.now() - new Date(recent.completed_at).getTime()) / 3_600_000;
        if (ageHours < 24) {
          return {
            jobId: recent.id,
            message: `Using cached results (${ageHours.toFixed(1)}h old). Pass forceRefresh to re-run.`,
            status: 'done',
          };
        }
      }
    }

    // Increment limit used counter
    const brand = await this.brandRepo.findOne({ where: { id: campaign.brand_id } });
    if (brand) {
      brand.ai_discovery_limit_used += 1;
      await this.brandRepo.save(brand);
    }

    // Check if Redis connection is ready
    const isRedisReady = this.discoveryQueue &&
                         this.discoveryQueue.client &&
                         this.discoveryQueue.client.status === 'ready';

    if (!isRedisReady) {
      this.logger.warn(`Redis is offline. Processing discovery job inline asynchronously.`);

      // Create running job record
      const jobRecord = this.jobRepo.create({
        campaign_id: campaignId,
        status: JobStatus.RUNNING,
        triggered_by: trigger,
        started_at: new Date(),
        progress: 0,
      });
      await this.jobRepo.save(jobRecord);

      // Run processor in background (non-blocking)
      setImmediate(() => {
        this.queueProcessor.handleDiscover({
          data: {
            campaignId,
            triggeredBy: trigger,
            forceRefresh: options?.forceRefresh ?? false,
          },
          id: 'inline-' + jobRecord.id,
        } as any).catch(err => {
          this.logger.error(`Inline discovery failed: ${err.message}`);
        });
      });

      return {
        jobId: jobRecord.id,
        message: 'Redis offline. Running inline discovery in background.',
        status: 'queued',
      };
    }

    const bullJob = await this.discoveryQueue.add(DISCOVER_JOB, {
      campaignId,
      triggeredBy: trigger,
      forceRefresh: options?.forceRefresh ?? false,
    });

    return {
      jobId: String(bullJob.id),
      message: 'Discovery job queued. Poll /job-status for progress.',
      status: 'queued',
    };
  }

  /**
   * Get the latest discovery job status for a campaign.
   * Frontend uses this to render the sync button state.
   */
  async getLatestJob(campaignId: string): Promise<DiscoveryJob | null> {
    return this.jobRepo.findOne({
      where: { campaign_id: campaignId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get top N creators from the similarity matrix for a campaign.
   * Ordered by match_score DESC (already ranked by queue processor).
   */
  async getDiscoveredCreators(
    campaignId: string,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 12;

    const [scores, total] = await this.scoreRepo.findAndCount({
      where: { campaign_id: campaignId },
      relations: ['creator'],
      order: { rank: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Map to the DiscoveredCreator-like shape the frontend expects
    const data = scores.map(s => ({
      id: s.id,
      campaign_id: campaignId,
      name: s.creator.name,
      handle: s.creator.handle,
      platform: s.creator.platform,
      profile_url: s.creator.profile_url,
      avatar_url: s.creator.avatar_url,
      followers_count: s.creator.followers_count,
      engagement_rate: s.creator.engagement_rate,
      match_score: s.match_score,
      semantic_score: s.semantic_score,
      heuristic_score: s.heuristic_score,
      content_style: s.creator.bio_text,
      audience_summary: null,
      strengths: s.strengths,
      concerns: s.concerns,
      ai_summary: s.ai_summary,
      region: s.creator.region,
      categories: s.creator.categories,
      rank: s.rank,
      source: s.creator.source,
      created_at: s.created_at,
    }));

    return new PaginatedResponse(data, total, page, pageSize);
  }

  /**
   * Get a single discovered creator's detail.
   */
  async getDiscoveredCreatorDetail(scoreId: string): Promise<any> {
    const score = await this.scoreRepo.findOne({
      where: { id: scoreId },
      relations: ['creator'],
    });
    if (!score) throw new NotFoundException('Creator not found in discovery results');
    return {
      ...score,
      name: score.creator.name,
      handle: score.creator.handle,
      platform: score.creator.platform,
      profile_url: score.creator.profile_url,
      avatar_url: score.creator.avatar_url,
      followers_count: score.creator.followers_count,
      engagement_rate: score.creator.engagement_rate,
      region: score.creator.region,
      categories: score.creator.categories,
      source: score.creator.source,
      data_freshness: score.creator.data_freshness,
    };
  }

  /**
   * Compare internet-discovered creators vs platform creators for a campaign.
   */
  async compareWithPlatformCreators(campaignId: string): Promise<any> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const discovered = await this.scoreRepo.find({
      where: { campaign_id: campaignId },
      relations: ['creator'],
      order: { rank: 'ASC' },
      take: 10,
    });

    const platformCreators = await this.creatorRepo.find({
      where: { is_active: true, is_verified: true },
      relations: ['user'],
      take: 10,
    });

    return {
      campaign: { id: campaign.id, title: campaign.title, category: campaign.category, platform: campaign.platform },
      discovered: discovered.map(s => ({
        id: s.id,
        name: s.creator.name,
        handle: s.creator.handle,
        platform: s.creator.platform,
        followers_count: s.creator.followers_count,
        engagement_rate: s.creator.engagement_rate,
        match_score: s.match_score,
        source: 'internet_research',
        profile_url: s.creator.profile_url,
        region: s.creator.region,
      })),
      platform: platformCreators.map(c => ({
        id: c.id,
        name: c.user?.first_name ? `${c.user.first_name} ${c.user.last_name || ''}`.trim() : 'Platform Creator',
        handle: (c.social_links as any)?.instagram || (c.social_links as any)?.youtube || '',
        platform: Object.keys(c.social_links || {})[0] || 'instagram',
        followers_count: c.total_campaigns * 10000 + 5000,
        engagement_rate: 5.0,
        match_score: c.categories?.includes(campaign.category) ? 80 : 50,
        source: 'platform',
        profile_url: null,
        region: c.location || '',
      })),
      summary: {
        total_discovered: discovered.length,
        total_platform: platformCreators.length,
        avg_discovered_score: discovered.length
          ? Math.round(discovered.reduce((s, d) => s + Number(d.match_score), 0) / discovered.length)
          : 0,
        avg_platform_score: platformCreators.length
          ? Math.round(platformCreators.reduce((s, c) => s + (c.categories?.includes(campaign.category) ? 80 : 50), 0) / platformCreators.length)
          : 0,
      },
    };
  }

  /**
   * Get creator_index stats — for admin/debugging.
   */
  async getIndexStats(): Promise<any> {
    const [total, byPlatform] = await Promise.all([
      this.creatorIndexRepo.count(),
      this.dataSource.query(
        `SELECT platform, COUNT(*) as count FROM creator_index GROUP BY platform ORDER BY count DESC`
      ),
    ]);
    return { total_creators_indexed: total, by_platform: byPlatform };
  }
}
