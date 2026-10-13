import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InvoiceStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('subscription_invoices')
export class SubscriptionInvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'timestamptz', name: 'period_start' })
  periodStart: Date;

  @Column({ type: 'timestamptz', name: 'period_end' })
  periodEnd: Date;

  @Column({ type: 'int' })
  amount: number;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'payment_txn_id' })
  paymentTxnId: string | null;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
