import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum GiftStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/** KX18: tặng suất đã thanh toán cho người dùng khác; quyền nhận chuyển cho người nhận khi họ chấp nhận. */
@Entity('order_gifts')
export class OrderGiftEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'order_id' })
  orderId: string;

  @Index()
  @Column('uuid', { name: 'from_user_id' })
  fromUserId: string;

  @Index()
  @Column('uuid', { name: 'to_user_id' })
  toUserId: string;

  @Column({ type: 'varchar', length: 20, default: GiftStatus.PENDING })
  status: GiftStatus;

  @Column({ type: 'varchar', length: 200, nullable: true })
  message: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'responded_at' })
  respondedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
