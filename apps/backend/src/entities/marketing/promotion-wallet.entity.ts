import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('promotion_wallet')
export class PromotionWalletEntity {
  @PrimaryColumn('uuid', { name: 'customer_id' })
  customerId: string;

  @PrimaryColumn('uuid', { name: 'promotion_id' })
  promotionId: string;

  @Column({ type: 'timestamptz', name: 'claimed_at' })
  claimedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
  usedAt: Date | null;

  @Index()
  @Column('uuid', { nullable: true, name: 'order_id' })
  orderId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
