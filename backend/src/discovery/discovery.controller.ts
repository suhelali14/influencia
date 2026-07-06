import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, Request, Res, Sse, MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Observable, interval, from, switchMap, map } from 'rxjs';
import { Response } from 'express';
import { DiscoveryService } from './discovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanLimitsGuard } from '../common/guards/plan-limits.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('discovery')
@Controller('discovery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  /**
   * Trigger creator discovery (background job).
   * Returns immediately with jobId — frontend polls /job-status.
   */
  @Post('campaign/:campaignId/search')
  @UseGuards(PlanLimitsGuard)
  @ApiOperation({ summary: 'Trigger background creator discovery for a campaign' })
  async searchCreators(
    @Param('campaignId') campaignId: string,
    @Body() body: { region?: string; forceRefresh?: boolean },
    @Request() req: any,
  ) {
    return this.discoveryService.discoverCreators(
      campaignId,
      body,
      req.headers['x-request-id'] || 'user_sync',
    );
  }

  /**
   * Get paginated discovered creators from the similarity matrix.
   */
  @Get('campaign/:campaignId/creators')
  @ApiOperation({ summary: 'Get creators from the similarity matrix for a campaign' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getDiscoveredCreators(
    @Param('campaignId') campaignId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = new PaginationDto();
    if (page) pagination.page = parseInt(page, 10) || 1;
    if (pageSize) pagination.pageSize = Math.min(parseInt(pageSize, 10) || 12, 50);
    return this.discoveryService.getDiscoveredCreators(campaignId, pagination);
  }

  /**
   * Get detail of a single discovered creator (score + creator data).
   */
  @Get('campaign/:campaignId/creator/:scoreId')
  @ApiOperation({ summary: 'Get detail of a single discovered creator' })
  async getCreatorDetail(@Param('scoreId') scoreId: string) {
    return this.discoveryService.getDiscoveredCreatorDetail(scoreId);
  }

  /**
   * Compare internet-discovered vs platform creators.
   */
  @Get('campaign/:campaignId/compare')
  @UseGuards(PlanLimitsGuard)
  @ApiOperation({ summary: 'Compare discovered vs platform creators' })
  async compareCreators(@Param('campaignId') campaignId: string) {
    return this.discoveryService.compareWithPlatformCreators(campaignId);
  }

  /**
   * Get the latest job status for a campaign.
   * Frontend polls this to render sync button state.
   *
   * Response shape:
   * { status: 'running'|'done'|'failed'|'pending', progress: 0-100,
   *   total_found: 73, triggered_by: 'campaign_create', created_at: '...' }
   */
  @Get('campaign/:campaignId/job-status')
  @ApiOperation({ summary: 'Get latest discovery job status for a campaign' })
  async getJobStatus(@Param('campaignId') campaignId: string) {
    const job = await this.discoveryService.getLatestJob(campaignId);
    if (!job) {
      return { status: 'none', message: 'No discovery job has been run for this campaign yet.' };
    }
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      total_found: job.total_found,
      sources_used: job.sources_used,
      triggered_by: job.triggered_by,
      error_msg: job.error_msg,
      started_at: job.started_at,
      completed_at: job.completed_at,
      created_at: job.created_at,
    };
  }

  /**
   * SSE stream — pushes job progress events to the frontend in real-time.
   * Frontend subscribes once and gets updates pushed; no polling needed.
   *
   * Usage: EventSource('/discovery/campaign/:id/status-stream')
   * Events: { data: { status, progress, total_found } }
   */
  @Sse('campaign/:campaignId/status-stream')
  @ApiOperation({ summary: 'SSE stream for discovery job progress' })
  statusStream(@Param('campaignId') campaignId: string): Observable<MessageEvent> {
    return interval(3000).pipe(
      switchMap(() => from(this.discoveryService.getLatestJob(campaignId))),
      map(job => ({
        data: job
          ? {
              status: job.status,
              progress: job.progress,
              total_found: job.total_found,
              triggered_by: job.triggered_by,
              completed_at: job.completed_at,
            }
          : { status: 'none', progress: 0, total_found: 0 },
      } as MessageEvent)),
    );
  }

  /**
   * Get global creator index stats (admin).
   */
  @Get('index/stats')
  @ApiOperation({ summary: 'Get creator index statistics' })
  getIndexStats() {
    return this.discoveryService.getIndexStats();
  }
}
