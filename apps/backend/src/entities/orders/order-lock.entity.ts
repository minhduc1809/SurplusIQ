import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('order_locks')
export class OrderLockEntity {
  @PrimaryColumn('uuid', { name: 'customer_id' })
  customerId: string;

  @Column({ type: 'timestamptz', name: 'locked_until' })
  lockedUntil: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
