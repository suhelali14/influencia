import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  company_name: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  logo_url: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'int', default: 0 })
  total_campaigns: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_spent: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_verified: boolean;

  // ── Subscriptions & Limits (SaaS Monetization) ────────────────────
  @Column({ default: 'free', length: 50 })
  subscription_tier: string; // 'free' | 'starter' | 'growth' | 'pro' | 'enterprise'

  @Column({ default: 'active', length: 50 })
  subscription_status: string; // 'active' | 'inactive' | 'past_due' | 'trial'

  @Column({ type: 'timestamp', nullable: true })
  subscription_expires_at: Date | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  razorpay_customer_id: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  razorpay_subscription_id: string | null;

  @Column({ type: 'int', default: 0 })
  ai_discovery_limit_used: number;

  @Column({ type: 'int', default: 0 })
  campaign_limit_used: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
