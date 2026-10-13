import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('special_events')
@Unique(['storeId', 'date', 'type'])
export class SpecialEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 1.0,
    name: 'impact_factor',
  })
  impactFactor: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
