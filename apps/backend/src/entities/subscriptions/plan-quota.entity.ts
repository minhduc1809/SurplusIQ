import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { SubscriptionPlan } from './subscription.entity';

@Entity('plan_quotas')
@Unique(['plan', 'quotaKey'])
export class PlanQuotaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
  })
  plan: SubscriptionPlan;

  @Column({ type: 'varchar', length: 100, name: 'quota_key' })
  quotaKey: string;

  @Column({ type: 'int', name: 'quota_value' })
  quotaValue: number;

  @Column({ type: 'varchar', length: 50 })
  period: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
