import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index(['storeId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { nullable: true, name: 'store_id' })
  storeId: string | null;

  @Index()
  @Column('uuid', { name: 'actor_id' })
  actorId: string;

  @Column({ type: 'varchar', length: 50, name: 'actor_role' })
  actorRole: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 50, name: 'target_type' })
  targetType: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'target_id' })
  targetId: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'old_value' })
  oldValue: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'new_value' })
  newValue: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_agent' })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
