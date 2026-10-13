import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum OfferEventType {
  CREATED = 'CREATED',
  OPENED = 'OPENED',
  EDITED = 'EDITED',
  STOCK_ADJUSTED = 'STOCK_ADJUSTED',
  PRICE_CHANGED = 'PRICE_CHANGED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  AUTO_CLOSED = 'AUTO_CLOSED',
}

@Entity('offer_events')
export class OfferEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'offer_id' })
  offerId: string;

  @Column('uuid', { nullable: true, name: 'actor_id' })
  actorId: string | null;

  @Column({
    type: 'enum',
    enum: OfferEventType,
  })
  type: OfferEventType;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
