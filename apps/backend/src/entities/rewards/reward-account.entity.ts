import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/** Rescue Rewards (CM-C04): số dư điểm thưởng theo khách hàng. Số dư không bao giờ âm. */
@Entity('reward_accounts')
export class RewardAccountEntity {
  @PrimaryColumn('uuid', { name: 'customer_id' })
  customerId: string;

  @Column({ type: 'int', name: 'points_balance', default: 0 })
  pointsBalance: number;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
