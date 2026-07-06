import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull';

import { Campaign } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { DISCOVERY_QUEUE, EMBED_CAMPAIGN_JOB, DISCOVER_JOB, DiscoveryQueueProcessor } from '../discovery/discovery.queue';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
    @InjectQueue(DISCOVERY_QUEUE)
    private discoveryQueue: Bull.Queue,
    private queueProcessor: DiscoveryQueueProcessor,
  ) {}

  async create(brandId: string, createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignsRepository.create({
      brand_id: brandId,
      ...createCampaignDto,
    });
    const saved = await this.campaignsRepository.save(campaign);

    // ── Dispatch background jobs (non-blocking) ──────────────────────
    const isRedisReady = this.discoveryQueue &&
                         this.discoveryQueue.client &&
                         this.discoveryQueue.client.status === 'ready';

    if (!isRedisReady) {
      this.logger.warn('[Campaigns] Redis is offline. Running campaign embedding and discovery inline asynchronously.');
      setImmediate(async () => {
        try {
          // Mock Bull.Jobs and execute inline
          await this.queueProcessor.handleEmbedCampaign({
            data: { campaignId: saved.id }
          } as any);
          
          await this.queueProcessor.handleDiscover({
            data: {
              campaignId: saved.id,
              triggeredBy: 'campaign_create',
              forceRefresh: false,
            },
            id: 'inline-discover-' + saved.id,
          } as any);
        } catch (err) {
          this.logger.error(`[Inline campaign processing failed]: ${err.message}`);
        }
      });
    } else {
      // Job 1: Embed the campaign text → store 384-dim vector in campaign_embeddings
      this.discoveryQueue.add(EMBED_CAMPAIGN_JOB, { campaignId: saved.id }, {
        delay: 2000,        // 2s delay so campaign is committed to DB first
        priority: 10,       // higher priority than discovery
        jobId: `embed-${saved.id}`,
        removeOnComplete: true,
      }).catch(err => this.logger.warn(`[Campaigns] Could not enqueue embed job: ${err.message}`));

      // Job 2: Full internet discovery — runs after embed job completes
      this.discoveryQueue.add(DISCOVER_JOB, {
        campaignId: saved.id,
        triggeredBy: 'campaign_create',
      }, {
        delay: 8000,        // 8s delay — after embed job finishes
        priority: 5,
        jobId: `discover-${saved.id}-initial`,
        removeOnComplete: true,
      }).catch(err => this.logger.warn(`[Campaigns] Could not enqueue discover job: ${err.message}`));
    }

    this.logger.log(`[Campaigns] Campaign ${saved.id} created — queued embed + discovery jobs`);
    return saved;
  }

  async findAll(pagination?: PaginationDto): Promise<PaginatedResponse<Campaign>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, totalCount] = await this.campaignsRepository.findAndCount({
      relations: ['brand', 'brand.user'],
      order: { created_at: 'DESC' },
      skip,
      take: pageSize,
    });

    return new PaginatedResponse(data, totalCount, page, pageSize);
  }

  async findByBrand(brandId: string): Promise<Campaign[]> {
    return this.campaignsRepository.find({
      where: { brand_id: brandId },
      relations: ['brand'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id },
      relations: ['brand', 'brand.user'],
    });
    if (!campaign) throw new NotFoundException(`Campaign with ID ${id} not found`);
    return campaign;
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id);
    Object.assign(campaign, updateCampaignDto);
    const saved = await this.campaignsRepository.save(campaign);

    // Re-embed if title/description/category changed (these affect matching)
    const semanticFields = ['title', 'description', 'category', 'platform', 'target_audience'];
    const hasSemanticChange = semanticFields.some(f => f in updateCampaignDto);
    if (hasSemanticChange) {
      const isRedisReady = this.discoveryQueue &&
                           this.discoveryQueue.client &&
                           this.discoveryQueue.client.status === 'ready';

      if (!isRedisReady) {
        this.logger.warn('[Campaigns] Redis is offline. Running update re-embedding inline asynchronously.');
        setImmediate(async () => {
          try {
            await this.queueProcessor.handleEmbedCampaign({
              data: { campaignId: id }
            } as any);
          } catch (err) {
            this.logger.error(`[Inline update re-embed failed]: ${err.message}`);
          }
        });
      } else {
        this.discoveryQueue.add(EMBED_CAMPAIGN_JOB, { campaignId: id }, {
          delay: 1000,
          jobId: `embed-${id}-update-${Date.now()}`,
          removeOnComplete: true,
        }).catch(() => {});
      }
      this.logger.log(`[Campaigns] Campaign ${id} updated — re-embedding triggered`);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    campaign.status = 'cancelled' as any;
    await this.campaignsRepository.save(campaign);
  }

  async findActive(pagination?: PaginationDto): Promise<PaginatedResponse<Campaign>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, totalCount] = await this.campaignsRepository.findAndCount({
      where: { status: 'active' as any },
      relations: ['brand'],
      order: { created_at: 'DESC' },
      skip,
      take: pageSize,
    });

    return new PaginatedResponse(data, totalCount, page, pageSize);
  }

  async search(query: string, pagination?: PaginationDto): Promise<PaginatedResponse<Campaign>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const qb = this.campaignsRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.brand', 'brand')
      .where('campaign.title ILIKE :query', { query: `%${query}%` })
      .orWhere('campaign.description ILIKE :query', { query: `%${query}%` })
      .orWhere('campaign.category ILIKE :query', { query: `%${query}%` })
      .orderBy('campaign.created_at', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [data, totalCount] = await qb.getManyAndCount();
    return new PaginatedResponse(data, totalCount, page, pageSize);
  }
}
