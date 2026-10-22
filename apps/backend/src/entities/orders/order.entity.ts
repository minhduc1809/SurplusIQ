import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PICKED_UP = 'PICKED_UP',
  HOLD_EXPIRED = 'HOLD_EXPIRED',
  PICKUP_EXPIRED = 'PICKUP_EXPIRED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum CancelledBy {
  CUSTOMER = 'CUSTOMER',
  STORE = 'STORE',
  SYSTEM = 'SYSTEM',
}

@Entity('orders')
@Check(`"quantity" >= 1 AND "quantity" <= 5`)
@Index(['status', 'holdExpiresAt'])
@Index(['status', 'offerId'])
@Index(['storeId', 'createdAt'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 12 })
  code: string;

  @Index()
  @Column('uuid', { name: 'customer_id' })
  customerId: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Index()
  @Column('uuid', { name: 'offer_id' })
  offerId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int', name: 'unit_price' })
  unitPrice: number;

  @Index()
  @Column('uuid', { nullable: true, name: 'promotion_id' })
  promotionId: string | null;

  @Column({ type: 'int', default: 0, name: 'discount_amount' })
  discountAmount: number;

  @Column({ type: 'int', name: 'total_amount' })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status: OrderStatus;

  @Column({ type: 'timestamptz', name: 'hold_expires_at' })
  holdExpiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'pickup_slot' })
  pickupSlot: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  /** Phần giảm giá do nền tảng bù (voucher đổi điểm); cửa hàng vẫn được tính đủ giá trị đơn gồm cả phần này. */
  /** KX05: suất gốc trước khi đổi, mỗi đơn chỉ đổi một lần. */
  @Column({ type: 'uuid', nullable: true, name: 'swapped_from_offer_id' })
  swappedFromOfferId: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'swapped_at' })
  swappedAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'platform_subsidy' })
  platformSubsidy: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'payment_proof_url' })
  paymentProofUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'payment_proof_uploaded_at' })
  paymentProofUploadedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'arriving_notified_at' })
  arrivingNotifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'picked_up_at' })
  pickedUpAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'picked_up_by' })
  pickedUpBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'cancel_reason' })
  cancelReason: string | null;

  @Column({
    type: 'enum',
    enum: CancelledBy,
    nullable: true,
    name: 'cancelled_by',
  })
  cancelledBy: CancelledBy | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
