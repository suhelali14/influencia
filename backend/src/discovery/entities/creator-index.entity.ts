import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

/**
 * Global Creator Index — stores one row per unique creator (platform + handle).
 * Reused across ALL campaigns via CampaignCreatorScore join table.
 * Never duplicates the same creator for different campaigns.
 *
 * The `embedding` column is a 384-dim float array (all-MiniLM-L6-v2).
 * pgvector extension required: CREATE EXTENSION IF NOT EXISTS vector;
 */
@Entity('creator_index')
@Index(['platform', 'handle'], { unique: true })
@Index(['platform', 'region'])
export class CreatorIndex {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  handle: string;

  @Column({ length: 30 })
  platform: string;

  @Column({ nullable: true, length: 300 })
  name: string;

  @Column({ nullable: true, type: 'text' })
  profile_url: string;

  @Column({ nullable: true, type: 'text' })
  avatar_url: string;

  @Column({ type: 'bigint', default: 0 })
  followers_count: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  engagement_rate: number;

  @Column({ nullable: true, length: 150 })
  region: string;

  @Column({ type: 'text', array: true, default: '{}' })
  categories: string[];

  /** Concatenated text used to generate the embedding — stored for re-embedding on refresh */
  @Column({ type: 'text', nullable: true })
  bio_text: string;

  /**
   * 384-dim semantic vector (all-MiniLM-L6-v2, local, free).
   * Stored as float array. pgvector queries happen via raw SQL:
   *   SELECT * FROM creator_index ORDER BY embedding <=> $1::vector LIMIT 75
   */
  @Column({ type: 'float', array: true, nullable: true })
  embedding: number[];

  /** Source of data: youtube_api | google_serp | twitter | reddit | seed_data */
  @Column({ default: 'unknown', length: 50 })
  source: string;

  /** When this creator's data was last fetched from the internet */
  @Column({ type: 'timestamp', default: () => 'NOW()' })
  data_freshness: Date;

  @Column({ type: 'jsonb', nullable: true })
  raw_data: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
