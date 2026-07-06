import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Campaign } from '../../campaigns/entities/campaign.entity';

export enum JobStatus {
  PENDING   = 'pending',
  RUNNING   = 'running',
  DONE      = 'done',
  FAILED    = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Discovery Job — tracks background creator discovery job status per campaign.
 *
 * Frontend polls GET /discovery/campaign/:id/job-status to render:
 *   - "⏳ Computing..."  when status = running
 *   - "✅ Ready (73)"   when status = done
 *   - "🔄 Sync Latest" button triggers a new job with triggered_by = 'user_sync'
 *
 * SSE endpoint (GET /discovery/campaign/:id/status-stream) streams progress events.
 */
@Entity('discovery_jobs')
@Index(['campaign_id', 'created_at'])
@Index(['status', 'created_at'])
export class DiscoveryJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  /** 0–100 progress percentage */
  @Column({ type: 'int', default: 0 })
  progress: number;

  /** How many creators were found and indexed */
  @Column({ type: 'int', default: 0 })
  total_found: number;

  /** Which data sources were used: ['youtube_api', 'google_serp', 'twitter', 'reddit'] */
  @Column({ type: 'text', array: true, default: '{}' })
  sources_used: string[];

  @Column({ type: 'text', nullable: true })
  error_msg: string;

  /** What triggered this job: 'campaign_create' | 'user_sync' | 'system_refresh' */
  @Column({ default: 'system', length: 30 })
  triggered_by: string;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
