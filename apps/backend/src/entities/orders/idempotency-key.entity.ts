import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('idempotency_keys')
export class IdempotencyKeyEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  scope: string;

  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 64, name: 'request_hash' })
  requestHash: string;

  @Column({ type: 'jsonb' })
  response: Record<string, unknown>;

  @Column({ type: 'int', name: 'status_code' })
  statusCode: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
