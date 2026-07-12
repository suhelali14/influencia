import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { BudgetPlan } from './budget-plan.entity';
import { Creator } from '../../creators/entities/creator.entity';

@Entity('budget_plan_allocations')
export class BudgetPlanAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  plan_id: string;

  @Column({ type: 'uuid' })
  creator_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  allocated_amount: number;

  @Column({ type: 'bigint' })
  expected_impressions: number;

  @Column({ type: 'bigint' })
  expected_engagements: number;

  @Column({ type: 'boolean', default: false })
  is_locked: boolean;

  @ManyToOne(() => BudgetPlan, (plan) => plan.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: BudgetPlan;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  @CreateDateColumn()
  created_at: Date;
}
