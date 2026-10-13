import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AnomalyStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

@Entity('anomalies')
export class AnomalyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 100 })
  metric: string;

  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'expected_value',
  })
  expectedValue: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'actual_value',
  })
  actualValue: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'mad_score',
  })
  madScore: number;

  @Column({
    type: 'enum',
    enum: AnomalyStatus,
    default: AnomalyStatus.OPEN,
  })
  status: AnomalyStatus;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
