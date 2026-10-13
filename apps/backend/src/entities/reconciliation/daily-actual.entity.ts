import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('daily_actuals')
@Unique(['storeId', 'itemId', 'date'])
export class DailyActualEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Index()
  @Column('uuid', { name: 'item_id' })
  itemId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int' })
  produced: number;

  @Column({ type: 'int', name: 'sold_offline' })
  soldOffline: number;

  @Column({ type: 'int', name: 'sold_app' })
  soldApp: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'stockout_at' })
  stockoutAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'locked_at' })
  lockedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
