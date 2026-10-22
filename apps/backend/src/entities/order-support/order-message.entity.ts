import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** KX11: tin nhắn giữa khách và cửa hàng trong phạm vi một đơn. */
@Entity('order_messages')
@Index(['orderId', 'createdAt'])
export class OrderMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'order_id' })
  orderId: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 10, name: 'sender_role' })
  senderRole: 'CUSTOMER' | 'STORE';

  @Column('uuid', { name: 'sender_id' })
  senderId: string;

  @Column({ type: 'varchar', length: 500 })
  body: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
