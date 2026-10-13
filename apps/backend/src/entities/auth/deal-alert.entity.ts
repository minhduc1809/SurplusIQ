import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('deal_alerts')
@Index(['userId'])
export class DealAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column({ type: 'jsonb' })
  criteria: Record<string, unknown>;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, name: 'triggered_count' })
  triggeredCount: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_triggered_at' })
  lastTriggeredAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
