import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { CreatorIndex } from './creator-index.entity';

/**
 * Similarity Matrix Cell — one row per (campaign, creator) pair.
 * This IS the incremental similarity matrix.
 *
 * Update rules:
 *   NEW CREATOR indexed → insert rows for this creator vs all active campaigns
 *   NEW CAMPAIGN created → insert rows for this campaign vs all creators in index
 *   CREATOR REFRESHED    → update match_score for all rows with this creator_id
 *
 * Creator data lives in CreatorIndex — never duplicated here.
 */
@Entity('campaign_creator_scores')
@Unique(['campaign_id', 'creator_id'])
@Index(['campaign_id', 'rank'])
@Index(['campaign_id', 'match_score'])
export class CampaignCreatorScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ type: 'uuid' })
  creator_id: string;

  @ManyToOne(() => CreatorIndex, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'creator_id' })
  creator: CreatorIndex;

  /** Final weighted score combining semantic + heuristic (0–100) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  match_score: number;

  /** pgvector cosine similarity converted to 0–100 range */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  semantic_score: number;

  /** Rule-based score (followers tier, engagement, region) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  heuristic_score: number;

  /** Rank within this campaign (1 = best match) */
  @Column({ type: 'int', default: 0 })
  rank: number;

  @Column({ type: 'text', nullable: true })
  ai_summary: string;

  @Column({ type: 'text', array: true, default: '{}' })
  strengths: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  concerns: string[];

  @CreateDateColumn()
  created_at: Date;
}
