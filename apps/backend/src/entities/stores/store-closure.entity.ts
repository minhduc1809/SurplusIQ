import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum StoreClosureType {
  CLOSED = 'CLOSED',
  SPECIAL_HOURS = 'SPECIAL_HOURS',
}

@Entity('store_closures')
@Unique(['storeId', 'date'])
export class StoreClosureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: StoreClosureType,
    default: StoreClosureType.CLOSED,
  })
  type: StoreClosureType;

  @Column({ type: 'jsonb', nullable: true, name: 'open_hours' })
  openHours: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
