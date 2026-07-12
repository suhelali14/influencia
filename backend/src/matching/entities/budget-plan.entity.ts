import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { BudgetPlanAllocation } from './budget-plan-allocation.entity';

@Entity('budget_plans')
export class BudgetPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  brand_id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_budget: number;

  @Column({ length: 50, default: 'reach' })
  target_metric: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  allocated_budget: number;

  @Column({ type: 'bigint' })
  predicted_reach: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  predicted_engagement: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  predicted_roi: number;

  @OneToMany(() => BudgetPlanAllocation, (allocation) => allocation.plan, { cascade: true, eager: true })
  allocations: BudgetPlanAllocation[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
