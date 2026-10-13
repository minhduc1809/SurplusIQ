import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('campaign_deliveries')
export class CampaignDeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'campaign_id' })
  campaignId: string;

  @Index()
  @Column('uuid', { name: 'customer_id' })
  customerId: string;

  @Column({ type: 'timestamptz', name: 'sent_at' })
  sentAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'opened_at' })
  openedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'clicked_at' })
  clickedAt: Date | null;

  @Index()
  @Column('uuid', { nullable: true, name: 'converted_order_id' })
  convertedOrderId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
