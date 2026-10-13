import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PickupTokenStatus {
  UNUSED = 'UNUSED',
  USED = 'USED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

@Entity('pickup_tokens')
export class PickupTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'order_id' })
  orderId: string;

  @Column({ type: 'varchar', length: 6, name: 'backup_code' })
  backupCode: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: PickupTokenStatus,
    default: PickupTokenStatus.UNUSED,
  })
  status: PickupTokenStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
  usedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
