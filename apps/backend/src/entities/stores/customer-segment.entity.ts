import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum SegmentType {
  NEW = 'NEW',
  LOYAL = 'LOYAL',
  AT_RISK = 'AT_RISK',
  FREQUENT_NOSHOW = 'FREQUENT_NOSHOW',
}

@Entity('customer_segments')
export class CustomerSegmentEntity {
  @PrimaryColumn('uuid', { name: 'store_id' })
  storeId: string;

  @PrimaryColumn('uuid', { name: 'customer_id' })
  customerId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: SegmentType,
    default: SegmentType.NEW,
  })
  segment: SegmentType;

  @Column({ type: 'timestamptz', name: 'computed_at' })
  computedAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
