import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  offerId: string;

  @Column('uuid')
  storeId: string;

  @Column({ length: 100 })
  buyerId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int' })
  totalPrice: number;

  @Column({ default: 'PAID' })
  status: string; // PENDING, PAID, CLAIMED, CANCELLED

  @Column({ type: 'text' })
  qrToken: string;

  @Column({ type: 'timestamp' })
  qrTokenExpiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
