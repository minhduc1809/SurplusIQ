import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum IncidentType {
  STORE_CLOSED = 'STORE_CLOSED',
  NOT_READY = 'NOT_READY',
  WRONG_ITEM = 'WRONG_ITEM',
  LONG_WAIT = 'LONG_WAIT',
  OTHER = 'OTHER',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

/** KX03: sự cố khách gặp khi đến nhận hàng. Loại ảnh hưởng lỗi của cửa hàng (đóng cửa, chưa sẵn sàng) chặn tính không đến nhận. */
@Entity('pickup_incidents')
export class PickupIncidentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'order_id' })
  orderId: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column('uuid', { name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 20 })
  type: IncidentType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 20, default: IncidentStatus.OPEN })
  status: IncidentStatus;

  /** FIXED: cửa hàng khắc phục, khách nhận bình thường. REFUNDED: hoàn tiền. REJECTED: không công nhận. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  outcome: 'FIXED' | 'REFUNDED' | 'AUTO_REFUNDED' | 'REJECTED' | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'store_response' })
  storeResponse: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'responded_by' })
  respondedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
