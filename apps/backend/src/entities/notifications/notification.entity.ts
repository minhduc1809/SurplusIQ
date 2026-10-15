import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  ORDER = 'ORDER',
  PICKUP_REMINDER = 'PICKUP_REMINDER',
  PROMOTION = 'PROMOTION',
  COMPLAINT = 'COMPLAINT',
  REVIEW = 'REVIEW',
  SUBSCRIPTION = 'SUBSCRIPTION',
  PRICE_PROPOSAL = 'PRICE_PROPOSAL',
  SYSTEM = 'SYSTEM',
}

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'user_id', nullable: true })
  userId: string | null;

  @Index()
  @Column('uuid', { name: 'store_id', nullable: true })
  storeId: string | null;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
