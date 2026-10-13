import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('surprise_bag_items')
export class SurpriseBagItemEntity {
  @PrimaryColumn('uuid', { name: 'offer_id' })
  offerId: string;

  @PrimaryColumn('uuid', { name: 'item_id' })
  itemId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
