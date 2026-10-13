import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum StatementStatus {
  DRAFT = 'DRAFT',
  LOCKED = 'LOCKED',
}

@Entity('weekly_statements')
@Unique(['storeId', 'weekStart'])
export class WeeklyStatementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'date', name: 'week_start' })
  weekStart: string;

  @Column({ type: 'date', name: 'week_end' })
  weekEnd: string;

  @Column({ type: 'int' })
  gross: number;

  @Column({ type: 'int' })
  commission: number;

  @Column({ type: 'int' })
  refunds: number;

  @Column({ type: 'int', name: 'subscription_fee' })
  subscriptionFee: number;

  @Column({ type: 'int', default: 0 })
  adjustments: number;

  @Column({ type: 'int', name: 'net_payable' })
  netPayable: number;

  @Column({
    type: 'enum',
    enum: StatementStatus,
    default: StatementStatus.DRAFT,
  })
  status: StatementStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;

  @Column({ type: 'jsonb', nullable: true })
  flags: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
