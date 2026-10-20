import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

export enum RescuePoolRegistrationStatus {
  /** Đã đăng ký nhu cầu - KHÔNG phải đơn hàng (BR-C02-03). */
  ACTIVE = 'ACTIVE',
  WITHDRAWN = 'WITHDRAWN',
  /** Khách đã chủ động xác nhận đề nghị và có đơn thật qua luồng đặt hàng hiện tại. */
  ORDERED = 'ORDERED',
  /** Đợt kết thúc (hết hạn/không đủ điều kiện/hủy/hết suất) mà đăng ký chưa thành đơn. */
  CLOSED = 'CLOSED',
}

/**
 * Đăng ký nhu cầu Rescue Pool (CM-C02). Không giữ tồn, không thu tiền (BR-B02-01/10, BR-C02-01).
 * Unique index một phần UQ_rescue_pool_reg_active_choice (migration 1700000003000) chặn trùng đăng ký
 * hiệu lực cho cùng lựa chọn (BR-B02-02, BR-C02-07).
 */
@Entity('rescue_pool_registrations')
@Index(['poolId', 'registrationStatus'])
export class RescuePoolRegistrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'pool_id' })
  poolId: string;

  @Index()
  @Column('uuid', { name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 100, name: 'selected_category' })
  selectedCategory: string;

  @Column('uuid', { nullable: true, name: 'selected_item_id' })
  selectedItemId: string | null;

  @Column({ type: 'int', name: 'requested_quantity' })
  requestedQuantity: number;

  @Column({ type: 'int', nullable: true, name: 'budget_min' })
  budgetMin: number | null;

  @Column({ type: 'int', nullable: true, name: 'budget_max' })
  budgetMax: number | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'preferred_pickup_start' })
  preferredPickupStart: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'preferred_pickup_end' })
  preferredPickupEnd: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: RescuePoolRegistrationStatus.ACTIVE,
    name: 'registration_status',
  })
  registrationStatus: RescuePoolRegistrationStatus;

  @Column({ type: 'timestamptz', name: 'registered_at', default: () => 'now()' })
  registeredAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  /** Phiên bản đề nghị cung ứng mà khách đã xác nhận gần nhất. */
  @Column({ type: 'int', nullable: true, name: 'offer_version_acknowledged' })
  offerVersionAcknowledged: number | null;

  @Column('uuid', { nullable: true, unique: true, name: 'linked_order_id' })
  linkedOrderId: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'withdrawn_at' })
  withdrawnAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'withdrawal_reason' })
  withdrawalReason: string | null;
}
