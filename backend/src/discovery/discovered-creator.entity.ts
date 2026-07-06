import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';

@Entity('discovered_creators')
@Index(['campaign_id', 'rank'])
export class DiscoveredCreator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column()
  name: string;

  @Column()
  handle: string;

  @Column({ type: 'enum', enum: ['instagram', 'youtube', 'tiktok', 'twitter'] })
  platform: string;

  @Column({ nullable: true })
  profile_url: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ type: 'int', default: 0 })
  followers_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  engagement_rate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  match_score: number;

  @Column({ nullable: true })
  content_style: string;

  @Column({ type: 'text', nullable: true })
  audience_summary: string;

  @Column({ type: 'jsonb', nullable: true })
  strengths: string[];

  @Column({ type: 'jsonb', nullable: true })
  concerns: string[];

  @Column({ type: 'text', nullable: true })
  ai_summary: string;

  @Column({ type: 'jsonb', nullable: true })
  recent_content: any;

  @Column({ nullable: true })
  region: string;

  @Column({ type: 'varchar', array: true, default: '{}' })
  categories: string[];

  @Column({ type: 'jsonb', nullable: true })
  raw_data: any;

  @Column({ type: 'int', default: 0 })
  rank: number;

  @CreateDateColumn()
  created_at: Date;
}
