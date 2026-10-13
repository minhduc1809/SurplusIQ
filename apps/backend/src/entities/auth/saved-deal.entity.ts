import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('saved_deals')
@Index(['userId', 'offerId'], { unique: true })
export class SavedDealEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column('uuid', { name: 'offer_id' })
  offerId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'saved_at' })
  savedAt: Date;
}
