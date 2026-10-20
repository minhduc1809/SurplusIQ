import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum RewardEntryType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  ADJUST = 'ADJUST',
  REVERSAL = 'REVERSAL',
}

/**
 * Rescue Rewards (CM-C04): bút toán ledger không thể xóa, chỉ điều chỉnh bằng
 * bút toán đối ứng (BR-C04-05). `sourceOrderId` + `entryType=EARN` có unique
 * index DB để đảm bảo mỗi đơn chỉ cộng điểm một lần (BR-C04-02).
 */
@Entity('reward_ledger_entries')
@Index(['customerId', 'createdAt'])
export class RewardLedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'customer_id' })
  customerId: string;

  @Column('uuid', { nullable: true, name: 'source_order_id' })
  sourceOrderId: string | null;

  @Column({ type: 'varchar', length: 20, name: 'entry_type' })
  entryType: RewardEntryType;

  /** Dương với EARN/ADJUST cộng; âm với REDEEM/REVERSAL trừ hoặc hoàn tác. */
  @Column({ type: 'int', name: 'points_delta' })
  pointsDelta: number;

  @Column({ type: 'varchar', length: 20, name: 'rule_version', default: 'v1' })
  ruleVersion: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'expiry_at' })
  expiryAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'redemption_id' })
  redemptionId: string | null;

  @Column('uuid', { nullable: true, name: 'reversal_of_entry_id' })
  reversalOfEntryId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
