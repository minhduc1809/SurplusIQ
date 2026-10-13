import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum ViolationStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
}

@Entity('violation_reports')
@Unique(['reporterId', 'targetType', 'targetId'])
export class ViolationReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'reporter_id' })
  reporterId: string;

  @Column({ type: 'varchar', length: 50, name: 'target_type' })
  targetType: string;

  @Index()
  @Column('uuid', { name: 'target_id' })
  targetId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: ViolationStatus,
    default: ViolationStatus.PENDING,
  })
  status: ViolationStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
