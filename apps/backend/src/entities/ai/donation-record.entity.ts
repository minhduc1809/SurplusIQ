import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('donation_records')
export class DonationRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'jsonb', name: 'recipient_info' })
  recipientInfo: Record<string, unknown>;

  @Index()
  @Column('uuid', { name: 'offer_id' })
  offerId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'timestamptz', name: 'donated_at' })
  donatedAt: Date;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
