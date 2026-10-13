import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('ai_logs')
export class AiLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { nullable: true, name: 'user_id' })
  userId: string | null;

  @Index()
  @Column('uuid', { nullable: true, name: 'store_id' })
  storeId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'feature_code' })
  featureCode: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ type: 'int', name: 'latency_ms' })
  latencyMs: number;

  @Column({ type: 'text', name: 'input_summary' })
  inputSummary: string;

  @Column({ type: 'text', name: 'output_summary' })
  outputSummary: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'error_code' })
  errorCode: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
