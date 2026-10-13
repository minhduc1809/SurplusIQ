import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentKind {
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  ORDER_REFUND = 'ORDER_REFUND',
  SUBSCRIPTION_PAYMENT = 'SUBSCRIPTION_PAYMENT',
  SUBSCRIPTION_REFUND = 'SUBSCRIPTION_REFUND',
}

export enum PaymentMethod {
  VIETQR = 'VIETQR',
  SIMULATED = 'SIMULATED',
}

export enum PaymentStatus {
  PENDING_CONFIRM = 'PENDING_CONFIRM',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

@Entity('payment_transactions')
export class PaymentTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { nullable: true, name: 'order_id' })
  orderId: string | null;

  @Index()
  @Column('uuid', { nullable: true, name: 'store_id' })
  storeId: string | null;

  @Column({
    type: 'enum',
    enum: PaymentKind,
  })
  kind: PaymentKind;

  @Column({ type: 'int' })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.VIETQR,
  })
  method: PaymentMethod;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, name: 'gateway_txn_id' })
  gatewayTxnId: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'parent_txn_id' })
  parentTxnId: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING_CONFIRM,
  })
  status: PaymentStatus;

  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_checked_at' })
  lastCheckedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
