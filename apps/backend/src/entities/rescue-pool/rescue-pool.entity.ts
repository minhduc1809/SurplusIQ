import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** Trạng thái đợt Rescue Pool theo BBRD phần 4. Chuyển trạng thái hợp lệ: xem POOL_TRANSITIONS trong RescuePoolService. */
export enum RescuePoolStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  AGGREGATING = 'AGGREGATING',
  PENDING_STORE = 'PENDING_STORE',
  OFFER_PUBLISHED = 'OFFER_PUBLISHED',
  ORDERING_OPEN = 'ORDERING_OPEN',
  COMPLETED = 'COMPLETED',
  INSUFFICIENT = 'INSUFFICIENT',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Rescue Pool (CM-B02): đợt gom nhu cầu của cửa hàng. Phần "đề nghị cung ứng" (linked_offer_id,
 * offered_quantity, proposed_price, offer_pickup_*, offer_version, offer_expiry_at) là ảnh chụp
 * điều kiện trọng yếu khách xác nhận; mỗi lần cửa hàng công bố lại thì offer_version tăng.
 */
@Entity('rescue_pools')
@Index(['storeId', 'poolStatus'])
export class RescuePoolEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 150, name: 'pool_title' })
  poolTitle: string;

  @Column({ type: 'varchar', length: 100, name: 'target_category' })
  targetCategory: string;

  @Column('uuid', { nullable: true, name: 'target_item_id' })
  targetItemId: string | null;

  @Column({ type: 'varchar', length: 150, name: 'service_area' })
  serviceArea: string;

  @Column({ type: 'timestamptz', name: 'registration_open_at' })
  registrationOpenAt: Date;

  @Column({ type: 'timestamptz', name: 'registration_close_at' })
  registrationCloseAt: Date;

  /** Hạn cửa hàng phải quyết định cung ứng (công bố trước - BR-B02-04). */
  @Column({ type: 'timestamptz', name: 'confirm_deadline_at' })
  confirmDeadlineAt: Date;

  /** Ngưỡng tối thiểu, tính theo tổng số suất khách quan tâm. */
  @Column({ type: 'int', name: 'minimum_demand' })
  minimumDemand: number;

  @Column({ type: 'int', name: 'maximum_supply' })
  maximumSupply: number;

  @Column({ type: 'int', nullable: true, name: 'target_budget_min' })
  targetBudgetMin: number | null;

  @Column({ type: 'int', nullable: true, name: 'target_budget_max' })
  targetBudgetMax: number | null;

  @Column({ type: 'timestamptz', name: 'pickup_window_start' })
  pickupWindowStart: Date;

  @Column({ type: 'timestamptz', name: 'pickup_window_end' })
  pickupWindowEnd: Date;

  @Column({ type: 'varchar', length: 255, name: 'end_condition' })
  endCondition: string;

  @Column('uuid', { nullable: true, name: 'linked_offer_id' })
  linkedOfferId: string | null;

  @Column({ type: 'int', nullable: true, name: 'offered_quantity' })
  offeredQuantity: number | null;

  @Column({ type: 'int', nullable: true, name: 'proposed_price' })
  proposedPrice: number | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'offer_pickup_start' })
  offerPickupStart: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'offer_pickup_end' })
  offerPickupEnd: Date | null;

  /** 0 = chưa có đề nghị cung ứng. */
  @Column({ type: 'int', default: 0, name: 'offer_version' })
  offerVersion: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'offer_expiry_at' })
  offerExpiryAt: Date | null;

  @Column({ type: 'varchar', length: 20, default: RescuePoolStatus.DRAFT, name: 'pool_status' })
  poolStatus: RescuePoolStatus;

  /** Số đăng ký đang hiệu lực (không tính đã rút). */
  @Column({ type: 'int', default: 0, name: 'registration_count' })
  registrationCount: number;

  @Column({ type: 'int', default: 0, name: 'confirmed_order_count' })
  confirmedOrderCount: number;

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  cancellationReason: string | null;

  @Column('uuid', { name: 'created_by' })
  createdBy: string;

  @Column('uuid', { nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
