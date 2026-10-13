import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ComplaintStatus {
  PENDING_STORE = 'PENDING_STORE',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

@Entity('complaints')
export class ComplaintEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'order_id' })
  orderId: string;

  @Index()
  @Column('uuid', { name: 'customer_id' })
  customerId: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.PENDING_STORE,
  })
  status: ComplaintStatus;

  @Column({ type: 'timestamptz', name: 'response_due_at' })
  responseDueAt: Date;

  @Column({ type: 'boolean', default: false })
  extended: boolean;

  @Column({ type: 'int', default: 0, name: 'refund_amount' })
  refundAmount: number;

  @Column({ type: 'text', nullable: true, name: 'reject_reason' })
  rejectReason: string | null;

  @Column({ type: 'boolean', default: false, name: 'auto_accepted' })
  autoAccepted: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
