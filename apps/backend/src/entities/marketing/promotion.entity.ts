import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PromotionType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum PromotionTarget {
  ALL = 'ALL',
  FAVORITES = 'FAVORITES',
  LOYAL = 'LOYAL',
  AT_RISK = 'AT_RISK',
}

export enum PromotionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
}

@Entity('promotions')
export class PromotionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Rỗng với ưu đãi do nền tảng tài trợ (voucher đổi điểm), dùng được ở mọi cửa hàng. */
  @Index()
  @Column('uuid', { name: 'store_id', nullable: true })
  storeId: string | null;

  @Column({ type: 'varchar', length: 10, name: 'funded_by', default: 'STORE' })
  fundedBy: 'STORE' | 'PLATFORM';

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({
    type: 'enum',
    enum: PromotionType,
    default: PromotionType.PERCENT,
  })
  type: PromotionType;

  @Column({ type: 'int' })
  value: number;

  @Column({
    type: 'enum',
    enum: PromotionTarget,
    default: PromotionTarget.ALL,
  })
  target: PromotionTarget;

  @Column({ type: 'int', name: 'max_uses' })
  maxUses: number;

  @Column({ type: 'int', default: 0, name: 'used_count' })
  usedCount: number;

  @Column({ type: 'timestamptz', name: 'start_at' })
  startAt: Date;

  @Column({ type: 'timestamptz', name: 'end_at' })
  endAt: Date;

  @Column({ type: 'int', default: 0, name: 'min_order_amount' })
  minOrderAmount: number;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.DRAFT,
  })
  status: PromotionStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
