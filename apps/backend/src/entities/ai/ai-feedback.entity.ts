import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AiRating {
  HELPFUL = 'HELPFUL',
  UNHELPFUL = 'UNHELPFUL',
}

@Entity('ai_feedback')
export class AiFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'log_id' })
  logId: string;

  @Column({
    type: 'enum',
    enum: AiRating,
  })
  rating: AiRating;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
