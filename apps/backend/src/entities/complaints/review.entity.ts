import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';

export enum ReviewStatus {
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
  REPORTED = 'REPORTED',
}

@Entity('reviews')
@Check(`"rating" >= 1 AND "rating" <= 5`)
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('uuid', { name: 'order_id' })
  orderId: string;

  @Index()
  @Column('uuid', { name: 'customer_id' })
  customerId: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.VISIBLE,
  })
  status: ReviewStatus;

  @Column({ type: 'text', nullable: true, name: 'store_reply' })
  storeReply: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'store_reply_at' })
  storeReplyAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
