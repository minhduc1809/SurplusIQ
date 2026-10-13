import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SubscriptionPlan {
  BASIC = 'BASIC',
  TRIAL = 'TRIAL',
  PRO = 'PRO',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryColumn('uuid', { name: 'store_id' })
  storeId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.BASIC,
  })
  plan: SubscriptionPlan;

  @Column({ type: 'timestamptz', name: 'period_start' })
  periodStart: Date;

  @Column({ type: 'timestamptz', name: 'period_end' })
  periodEnd: Date;

  @Column({ type: 'boolean', default: false, name: 'cancel_at_period_end' })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'boolean', default: false, name: 'downgrade_at_period_end' })
  downgradeAtPeriodEnd: boolean;

  @Column({ type: 'boolean', default: false, name: 'trial_used' })
  trialUsed: boolean;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
