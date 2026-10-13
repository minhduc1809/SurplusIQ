import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('view_history')
@Index(['userId', 'viewedAt'])
export class ViewHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column('uuid', { name: 'offer_id' })
  offerId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'viewed_at' })
  viewedAt: Date;
}
