import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('usage_logs')
@Index(['storeId', 'quotaKey', 'createdAt'])
export class UsageLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { nullable: true, name: 'store_id' })
  storeId: string | null;

  @Index()
  @Column('uuid', { nullable: true, name: 'user_id' })
  userId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'quota_key' })
  quotaKey: string;

  @Column({ type: 'int', default: 1 })
  units: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'ref_id' })
  refId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
