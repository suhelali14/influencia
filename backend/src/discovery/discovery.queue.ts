import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as Bull from 'bull';
import axios from 'axios';

import { DiscoveryJob, JobStatus } from './entities/discovery-job.entity';
import { CreatorIndex } from './entities/creator-index.entity';
import { CampaignCreatorScore } from './entities/campaign-creator-score.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';

export const DISCOVERY_QUEUE  = 'discovery';
export const DISCOVER_JOB     = 'discover-creators';
export const EMBED_CAMPAIGN_JOB = 'embed-campaign';
export const SYNC_NEW_CREATOR_JOB = 'sync-new-creator'; // matrix update when one creator added

/**
 * Discovery Queue Processor
 * ==========================
 * Handles three job types:
 *
 * 1. discover-creators (campaignId, triggeredBy)
 *    ─ Full internet discovery for a campaign
 *    ─ Fetches from YouTube + Serper + Twitter + Reddit via Python AI service
 *    ─ Embeds each creator → upserts into creator_index
 *    ─ Runs vector similarity vs campaign embedding → inserts/updates matrix rows
 *
 * 2. embed-campaign (campaignId)
 *    ─ Generates 384-dim embedding for a campaign from its text fields
 *    ─ Stores in campaign_embeddings table
 *    ─ Then runs similarity vs ALL existing creators → seeds the matrix
 *
 * 3. sync-new-creator (creatorIndexId)
 *    ─ Called when a new creator is indexed from any source
 *    ─ Computes similarity vs ALL active campaign embeddings → updates matrix
 *    ─ This is the "incremental matrix update" — O(campaigns) not O(creators²)
 */
@Injectable()
@Processor(DISCOVERY_QUEUE)
export class DiscoveryQueueProcessor {
  private readonly logger = new Logger(DiscoveryQueueProcessor.name);
  private readonly AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5002';

  constructor(
    @InjectRepository(DiscoveryJob)
    private jobRepo: Repository<DiscoveryJob>,
    @InjectRepository(CreatorIndex)
    private creatorIndexRepo: Repository<CreatorIndex>,
    @InjectRepository(CampaignCreatorScore)
    private scoreRepo: Repository<CampaignCreatorScore>,
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    private dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // JOB 1: Full Creator Discovery for a Campaign
  // ─────────────────────────────────────────────────────────────
  @Process(DISCOVER_JOB)
  async handleDiscover(job: Bull.Job<{ campaignId: string; triggeredBy?: string; forceRefresh?: boolean }>) {
    let { campaignId, triggeredBy = 'system', forceRefresh = false } = job.data;
    triggeredBy = (triggeredBy || 'system').slice(0, 30);
    this.logger.log(`[Queue] Starting discovery job for campaign ${campaignId}`);

    // Create or reuse running job record
    let jobRecord = await this.jobRepo.findOne({
      where: { campaign_id: campaignId, status: JobStatus.RUNNING },
      order: { created_at: 'DESC' },
    });
    if (!jobRecord) {
      jobRecord = this.jobRepo.create({
        campaign_id: campaignId,
        status: JobStatus.RUNNING,
        triggered_by: triggeredBy,
        started_at: new Date(),
      });
      await this.jobRepo.save(jobRecord);
    }

    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) {
      await this.jobRepo.update(jobRecord.id, { status: JobStatus.FAILED, error_msg: 'Campaign not found', completed_at: new Date() });
      return;
    }

    try {
      // ── Step 1: Ensure campaign has an embedding (10%) ─────────────
      await this._updateJobProgress(jobRecord.id, 10);
      await this._ensureCampaignEmbedding(campaign);
      this.logger.log(`[Queue] Campaign embedding ready for ${campaignId}`);

      // ── Step 2: Internet discovery via Python AI service (30%) ─────
      await this._updateJobProgress(jobRecord.id, 20);
      const discoveredRaw = await this._callDiscoveryService(campaign, forceRefresh);
      this.logger.log(`[Queue] AI service returned ${discoveredRaw.length} creators`);
      await this._updateJobProgress(jobRecord.id, 40);

      // ── Step 3: Embed all discovered creators in batch (60%) ───────
      const embeddedCreators = await this._embedCreators(discoveredRaw);
      await this._updateJobProgress(jobRecord.id, 60);

      // ── Step 4: Upsert into creator_index (dedup) (70%) ───────────
      const indexedIds = await this._upsertCreatorIndex(embeddedCreators);
      this.logger.log(`[Queue] Upserted ${indexedIds.length} creators into creator_index`);
      await this._updateJobProgress(jobRecord.id, 70);

      // ── Step 5: Build/update similarity matrix for this campaign ───
      const matrixRows = await this._updateMatrixForCampaign(campaignId, discoveredRaw, indexedIds);
      this.logger.log(`[Queue] Matrix updated: ${matrixRows} score rows for campaign`);
      await this._updateJobProgress(jobRecord.id, 90);

      // ── Step 6: Rank and mark done (100%) ─────────────────────────
      await this._rankScoresForCampaign(campaignId);

      await this.jobRepo.update(jobRecord.id, {
        status: JobStatus.DONE,
        progress: 100,
        total_found: indexedIds.length,
        sources_used: [...new Set(embeddedCreators.map(c => c.source || 'unknown'))],
        completed_at: new Date(),
      });

      this.logger.log(`✅ [Queue] Discovery complete for campaign ${campaignId}: ${indexedIds.length} creators`);
    } catch (err) {
      this.logger.error(`❌ [Queue] Discovery failed for campaign ${campaignId}: ${err.message}`);
      await this.jobRepo.update(jobRecord.id, {
        status: JobStatus.FAILED,
        error_msg: err.message,
        completed_at: new Date(),
      });
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // JOB 2: Embed a Campaign (called when campaign first created)
  // ─────────────────────────────────────────────────────────────
  @Process(EMBED_CAMPAIGN_JOB)
  async handleEmbedCampaign(job: Bull.Job<{ campaignId: string }>) {
    const { campaignId } = job.data;
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) return;
    await this._ensureCampaignEmbedding(campaign);
    this.logger.log(`[Queue] Campaign embedding created for ${campaignId}`);
  }

  // ─────────────────────────────────────────────────────────────
  // JOB 3: Incremental Matrix Update — New Creator Indexed
  // ─────────────────────────────────────────────────────────────
  @Process(SYNC_NEW_CREATOR_JOB)
  async handleSyncNewCreator(job: Bull.Job<{ creatorIndexId: string }>) {
    const { creatorIndexId } = job.data;
    const creator = await this.creatorIndexRepo.findOne({ where: { id: creatorIndexId } });
    if (!creator || !creator.embedding) return;

    this.logger.log(`[Queue] Syncing new creator ${creator.handle} vs all active campaigns`);

    // Get ALL active campaign embeddings
    const campaignEmbeddings = await this.dataSource.query<{ campaign_id: string; embedding: number[] }[]>(
      `SELECT campaign_id, embedding FROM campaign_embeddings`
    );

    if (!campaignEmbeddings.length) return;

    // Compute similarity for each campaign using in-process dot product
    const rows: Partial<CampaignCreatorScore>[] = [];
    for (const ce of campaignEmbeddings) {
      const similarity = this._dotProduct(creator.embedding, ce.embedding);
      const semanticScore = Math.round(similarity * 100 * 100) / 100;

      // Also get campaign for heuristic scoring
      const campaign = await this.campaignRepo.findOne({ where: { id: ce.campaign_id } });
      const heuristicScore = campaign ? this._heuristicScore(creator, campaign) : 0;
      const matchScore = Math.round((semanticScore * 0.5 + heuristicScore * 0.5) * 100) / 100;

      rows.push({
        campaign_id: ce.campaign_id,
        creator_id: creatorIndexId,
        match_score: matchScore,
        semantic_score: semanticScore,
        heuristic_score: heuristicScore,
        rank: 9999, // Will be re-ranked
        strengths: [],
        concerns: [],
      });
    }

    // Upsert all matrix rows for this creator
    if (rows.length > 0) {
      await this.dataSource.query(
        `INSERT INTO campaign_creator_scores
           (campaign_id, creator_id, match_score, semantic_score, heuristic_score, rank)
         SELECT unnest($1::uuid[]), $2::uuid, unnest($3::decimal[]), unnest($4::decimal[]), unnest($5::decimal[]), 9999
         ON CONFLICT (campaign_id, creator_id)
         DO UPDATE SET
           match_score = EXCLUDED.match_score,
           semantic_score = EXCLUDED.semantic_score,
           heuristic_score = EXCLUDED.heuristic_score`,
        [
          rows.map(r => r.campaign_id),
          creatorIndexId,
          rows.map(r => r.match_score),
          rows.map(r => r.semantic_score),
          rows.map(r => r.heuristic_score),
        ]
      );

      // Re-rank all affected campaigns
      const affectedCampaigns = [...new Set(rows.map(r => r.campaign_id).filter(Boolean) as string[])];
      for (const cid of affectedCampaigns) {
        await this._rankScoresForCampaign(cid);
      }
    }

    this.logger.log(`[Queue] Synced creator ${creator.handle} into ${rows.length} campaign matrices`);
  }

  // ─────────────────────────────────────────────────────────────
  // Error / Complete Handlers
  // ─────────────────────────────────────────────────────────────
  @OnQueueFailed()
  onFailed(job: Bull.Job, err: Error) {
    this.logger.error(`[Queue] Job ${job.id} (${job.name}) failed: ${err.message}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Bull.Job) {
    this.logger.log(`[Queue] Job ${job.id} (${job.name}) completed`);
  }

  // ─────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────

  private async _updateJobProgress(jobId: string, progress: number) {
    await this.jobRepo.update(jobId, { progress });
  }

  private async _ensureCampaignEmbedding(campaign: Campaign): Promise<void> {
    const existing = await this.dataSource.query(
      'SELECT campaign_id FROM campaign_embeddings WHERE campaign_id = $1',
      [campaign.id]
    );
    if (existing.length > 0) return; // Already embedded

    const embedText = this._buildCampaignText(campaign);
    const embedding = await this._embedTextViaService(embedText);
    if (!embedding) return;

    await this.dataSource.query(
      `INSERT INTO campaign_embeddings (campaign_id, embedding, embed_text)
       VALUES ($1, $2::vector, $3)
       ON CONFLICT (campaign_id) DO UPDATE SET embedding = EXCLUDED.embedding, embed_text = EXCLUDED.embed_text`,
      [campaign.id, JSON.stringify(embedding), embedText]
    );
  }

  private async _callDiscoveryService(campaign: Campaign, forceRefresh: boolean): Promise<any[]> {
    try {
      const response = await axios.post(
        `${this.AI_SERVICE_URL}/api/discover-creators`,
        {
          campaign: {
            id: campaign.id,
            title: campaign.title,
            category: campaign.category,
            platform: campaign.platform,
            budget: Number(campaign.budget),
            target_audience: campaign.target_audience || {},
            description: campaign.description,
          },
          region: (campaign.target_audience as any)?.location || 'India',
          count: 100,
          forceRefresh,
          _env: {
            YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
            SERPER_API_KEY:  process.env.SERPER_API_KEY  || '',
            GEMINI_API_KEY:  process.env.GEMINI_API_KEY  || '',
          },
        },
        { timeout: 120_000 }
      );
      return response.data?.creators || [];
    } catch (err) {
      this.logger.warn(`[Queue] AI discovery service error: ${err.message}. Returning empty array.`);
      return [];
    }
  }

  private async _embedCreators(creators: any[]): Promise<any[]> {
    if (!creators.length) return [];
    try {
      const response = await axios.post(
        `${this.AI_SERVICE_URL}/api/embed-creators`,
        { creators },
        { timeout: 60_000 }
      );
      return response.data?.creators || creators;
    } catch {
      this.logger.warn('[Queue] Embedding service unavailable — creators stored without vectors');
      return creators;
    }
  }

  private async _upsertCreatorIndex(creators: any[]): Promise<string[]> {
    const ids: string[] = [];
    for (const c of creators) {
      if (!c.handle || !c.platform) continue;
      try {
        const embeddingParam = c.embedding ? JSON.stringify(c.embedding) : null;

        const result = await this.dataSource.query(
          `INSERT INTO creator_index
             (handle, platform, name, profile_url, avatar_url, followers_count,
              engagement_rate, region, categories, bio_text, embedding, source, data_freshness, raw_data)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                   ${embeddingParam ? '$11::vector' : 'NULL'},
                   $12, NOW(), $13)
           ON CONFLICT (platform, handle) DO UPDATE SET
             name            = EXCLUDED.name,
             profile_url     = COALESCE(EXCLUDED.profile_url, creator_index.profile_url),
             avatar_url      = COALESCE(EXCLUDED.avatar_url, creator_index.avatar_url),
             followers_count = GREATEST(EXCLUDED.followers_count, creator_index.followers_count),
             engagement_rate = EXCLUDED.engagement_rate,
             region          = COALESCE(EXCLUDED.region, creator_index.region),
             categories      = EXCLUDED.categories,
             bio_text        = EXCLUDED.bio_text,
             ${embeddingParam ? 'embedding = EXCLUDED.embedding,' : ''}
             source          = EXCLUDED.source,
             data_freshness  = NOW(),
             raw_data        = EXCLUDED.raw_data
           RETURNING id`,
          embeddingParam
            ? [c.handle, c.platform, c.name, c.profile_url, c.avatar_url, c.followers_count,
               c.engagement_rate, c.region, c.categories || [], c.bio_text || '',
               embeddingParam, c.source || 'unknown', c.raw_data || null]
            : [c.handle, c.platform, c.name, c.profile_url, c.avatar_url, c.followers_count,
               c.engagement_rate, c.region, c.categories || [], c.bio_text || '',
               c.source || 'unknown', c.raw_data || null]
        );
        if (result[0]?.id) ids.push(result[0].id);
      } catch (err) {
        this.logger.debug(`[Queue] upsert error for @${c.handle}: ${err.message}`);
      }
    }
    return ids;
  }

  private async _updateMatrixForCampaign(campaignId: string, rawCreators: any[], creatorIds: string[]): Promise<number> {
    if (!creatorIds.length) return 0;

    // Clear old scores for this campaign to prevent mixing old dummy/seed discoveries with fresh results
    await this.scoreRepo.delete({ campaign_id: campaignId });

    // Get this campaign's embedding
    const [campEmbed] = await this.dataSource.query<{ embedding: number[] }[]>(
      'SELECT embedding FROM campaign_embeddings WHERE campaign_id = $1',
      [campaignId]
    );
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    const rawMap: Record<string, any> = {};
    rawCreators.forEach(c => { rawMap[`${c.platform}:${c.handle}`] = c; });

    let count = 0;
    const CHUNK = 50;
    for (let i = 0; i < creatorIds.length; i += CHUNK) {
      const chunk = creatorIds.slice(i, i + CHUNK);
      const creators = await this.creatorIndexRepo.findByIds(chunk);

      for (const creator of creators) {
        // Semantic score via dot product (both vectors are pre-normalized)
        const semanticScore = campEmbed && creator.embedding
          ? Math.round(this._dotProduct(campEmbed.embedding, creator.embedding) * 100 * 100) / 100
          : 0;

        // Heuristic score from raw data
        const raw = rawMap[`${creator.platform}:${creator.handle}`] || {};
        const heuristicScore = campaign
          ? Math.round((raw.match_score || this._heuristicScore(creator, campaign)) * 100) / 100
          : 0;

        const matchScore = Math.round(
          (semanticScore * 0.5 + heuristicScore * 0.5) * 100
        ) / 100;

        await this.dataSource.query(
          `INSERT INTO campaign_creator_scores
             (campaign_id, creator_id, match_score, semantic_score, heuristic_score, rank, ai_summary, strengths, concerns)
           VALUES ($1,$2,$3,$4,$5,9999,$6,$7,$8)
           ON CONFLICT (campaign_id, creator_id) DO UPDATE SET
             match_score     = EXCLUDED.match_score,
             semantic_score  = EXCLUDED.semantic_score,
             heuristic_score = EXCLUDED.heuristic_score,
             ai_summary      = COALESCE(EXCLUDED.ai_summary, campaign_creator_scores.ai_summary),
             strengths       = EXCLUDED.strengths,
             concerns        = EXCLUDED.concerns`,
          [
            campaignId, creator.id, matchScore, semanticScore, heuristicScore,
            raw.ai_summary || '', raw.strengths || [], raw.concerns || [],
          ]
        );
        count++;
      }
    }
    return count;
  }

  private async _rankScoresForCampaign(campaignId: string): Promise<void> {
    // Efficient single-query rank update
    await this.dataSource.query(
      `UPDATE campaign_creator_scores SET rank = sub.row_num
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY match_score DESC) as row_num
         FROM campaign_creator_scores
         WHERE campaign_id = $1
       ) sub
       WHERE campaign_creator_scores.id = sub.id`,
      [campaignId]
    );
  }

  private async _embedTextViaService(text: string): Promise<number[] | null> {
    try {
      const response = await axios.post(
        `${this.AI_SERVICE_URL}/api/embed-text`,
        { text },
        { timeout: 15_000 }
      );
      return response.data?.embedding || null;
    } catch {
      return null;
    }
  }

  private _buildCampaignText(campaign: Campaign): string {
    const parts = [campaign.title, `category: ${campaign.category}`, `platform: ${campaign.platform}`];
    if (campaign.description) parts.push(campaign.description.slice(0, 300));
    const ta = campaign.target_audience as any;
    if (ta?.interests?.length) parts.push('interests: ' + ta.interests.join(', '));
    if (ta?.location) parts.push(`target: ${ta.location}`);
    return parts.join(' | ');
  }

  private _parseVector(v: any): number[] {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        const cleaned = v.replace(/[\[\]]/g, '');
        return cleaned.split(',').map(Number);
      } catch {
        return [];
      }
    }
    return [];
  }

  /** Dot product of two normalized vectors — equivalent to cosine similarity */
  private _dotProduct(a: any, b: any): number {
    const vecA = this._parseVector(a);
    const vecB = this._parseVector(b);
    if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
    let sum = 0;
    for (let i = 0; i < vecA.length; i++) sum += vecA[i] * vecB[i];
    return Math.max(0, Math.min(1, sum));
  }

  /** Rule-based heuristic score (0-100) — run locally, no API calls */
  private _heuristicScore(creator: CreatorIndex, campaign: Campaign): number {
    let score = 0;
    const budget = Number(campaign.budget);
    const followers = Number(creator.followers_count);

    // Category match (35 pts)
    const cats = creator.categories || [];
    const catText = cats.join(' ').toLowerCase();
    if (catText.includes(campaign.category?.toLowerCase())) score += 30;
    else if (cats.length > 0) score += 5;

    // Platform match (15 pts)
    if (creator.platform?.toLowerCase() === campaign.platform?.toLowerCase()) score += 15;

    // Follower tier fit (25 pts)
    if (budget > 500_000 && followers > 1_000_000) score += 25;
    else if (budget > 100_000 && followers > 500_000) score += 25;
    else if (budget > 20_000 && followers > 50_000) score += 20;
    else if (budget > 5_000 && followers > 10_000) score += 15;
    else score += 10;

    // Engagement (20 pts)
    const eng = Number(creator.engagement_rate);
    if (eng >= 6) score += 20;
    else if (eng >= 3) score += 15;
    else if (eng >= 1) score += 10;
    else score += 5;

    // Region (5 pts)
    const ta = campaign.target_audience as any;
    const loc = (ta?.location || ta?.locations?.[0] || '').toLowerCase();
    if (loc && creator.region?.toLowerCase().includes(loc)) score += 5;
    else if (creator.region?.toLowerCase().includes('india')) score += 2;

    return Math.min(100, score);
  }
}
