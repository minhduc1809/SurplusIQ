import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ActionCardStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum ResultEvaluation {
  POSITIVE = 'POSITIVE',
  INCONCLUSIVE = 'INCONCLUSIVE',
  NEGATIVE = 'NEGATIVE',
}

@Entity('action_cards')
export class ActionCardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 100, name: 'action_type' })
  actionType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'text', name: 'reason_text' })
  reasonText: string;

  @Column({ type: 'text', name: 'expected_outcome' })
  expectedOutcome: string;

  @Column({
    type: 'enum',
    enum: ActionCardStatus,
    default: ActionCardStatus.PENDING,
  })
  status: ActionCardStatus;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: ResultEvaluation,
    nullable: true,
    name: 'result_evaluation',
  })
  resultEvaluation: ResultEvaluation | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
