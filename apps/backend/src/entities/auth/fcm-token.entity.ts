import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('fcm_tokens')
@Index(['userId', 'deviceId'], { unique: true })
export class FcmTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'device_id' })
  deviceId: string;

  @Column({ type: 'varchar', length: 500 })
  token: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
