import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** Trạng thái Rescue Bridge theo BBRD phần 4. Chuyển hợp lệ: TRANSFER_TRANSITIONS trong RescueBridgeService. */
export enum RescueBridgeTransferStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  AWAITING_HANDOVER = 'AWAITING_HANDOVER',
  HANDED_OVER = 'HANDED_OVER',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/** BR-B03-10: trách nhiệm vận chuyển (và chi phí đi kèm) xác định ngay khi tạo đề nghị. */
export enum TransportResponsibility {
  RECIPIENT_PICKUP = 'RECIPIENT_PICKUP',
  STORE_DELIVERY = 'STORE_DELIVERY',
}

/**
 * Đề nghị bàn giao Rescue Bridge (CM-B03).
 *
 * Bất biến tồn kho (BR-B03-05/07): offers.remaining_quantity luôn đã bị trừ đúng bằng
 * reserved_quantity của đề nghị này. Mọi thay đổi reserved_quantity đi qua một chỗ duy nhất
 * (RescueBridgeService.setReserved) dưới khóa FOR UPDATE trên dòng offer - cùng khóa với
 * OrdersService.holdOrder - nên đơn khách và bàn giao không thể dùng trùng một suất.
 * Sau khi bàn giao xong, reserved_quantity = quantity_handed_over (đã tiêu thụ, không bao giờ tính là bán).
 */
@Entity('rescue_bridge_transfers')
@Index(['storeId', 'transferStatus'])
@Index(['transferStatus', 'handoverDeadline'])
export class RescueBridgeTransferEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Index()
  @Column('uuid', { nullable: true, name: 'recipient_org_id' })
  recipientOrgId: string | null;

  @Index()
  @Column('uuid', { name: 'offer_id' })
  offerId: string;

  @Column({ type: 'varchar', length: 100, name: 'food_category' })
  foodCategory: string;

  @Column({ type: 'int', name: 'quantity_proposed' })
  quantityProposed: number;

  @Column({ type: 'int', nullable: true, name: 'quantity_accepted' })
  quantityAccepted: number | null;

  @Column({ type: 'int', nullable: true, name: 'quantity_handed_over' })
  quantityHandedOver: number | null;

  /** Số suất đang bị trừ khỏi offers.remaining_quantity bởi đề nghị này. */
  @Column({ type: 'int', name: 'reserved_quantity' })
  reservedQuantity: number;

  @Column({ type: 'timestamptz', name: 'available_at' })
  availableAt: Date;

  @Column({ type: 'timestamptz', name: 'handover_deadline' })
  handoverDeadline: Date;

  @Column({ type: 'text', name: 'storage_notes' })
  storageNotes: string;

  @Column({ type: 'varchar', length: 20, name: 'transport_responsibility' })
  transportResponsibility: TransportResponsibility;

  @Column({
    type: 'varchar',
    length: 20,
    default: RescueBridgeTransferStatus.DRAFT,
    name: 'transfer_status',
  })
  transferStatus: RescueBridgeTransferStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'sent_at' })
  sentAt: Date | null;

  // ── Thống nhất thời gian & người chịu trách nhiệm (luồng chính bước 5-6) ──
  @Column({ type: 'timestamptz', nullable: true, name: 'agreed_pickup_at' })
  agreedPickupAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'recipient_responsible_name' })
  recipientResponsibleName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'store_responsible_name' })
  storeResponsibleName: string | null;

  @Column({ type: 'text', nullable: true, name: 'recipient_note' })
  recipientNote: string | null;

  // ── Xác nhận bàn giao hai phía (BR-B03-06) ──
  @Column('uuid', { nullable: true, name: 'sender_confirmed_by' })
  senderConfirmedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'sender_confirmed_at' })
  senderConfirmedAt: Date | null;

  @Column({ type: 'int', nullable: true, name: 'sender_confirmed_quantity' })
  senderConfirmedQuantity: number | null;

  /** Đơn vị tiếp nhận không có tài khoản: lưu họ tên người xác nhận tại đơn vị. */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'recipient_confirmed_by' })
  recipientConfirmedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'recipient_confirmed_at' })
  recipientConfirmedAt: Date | null;

  @Column({ type: 'int', nullable: true, name: 'recipient_confirmed_quantity' })
  recipientConfirmedQuantity: number | null;

  @Column({ type: 'text', nullable: true, name: 'evidence_reference' })
  evidenceReference: string | null;

  /** Tranh chấp: chuyển vận hành xử lý, hệ thống không tự kết luận (CM-B03 ngoại lệ). */
  @Column({ type: 'boolean', default: false, name: 'is_disputed' })
  isDisputed: boolean;

  @Column({ type: 'text', nullable: true, name: 'dispute_note' })
  disputeNote: string | null;

  /** Lý do từ chối / thất bại / hủy (BR-B03-08). */
  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason: string | null;

  /** sha256 của token link phản hồi gửi cho đơn vị tiếp nhận; token gốc không lưu. */
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    unique: true,
    name: 'response_token_hash',
  })
  responseTokenHash: string | null;

  @Column('uuid', { name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
