import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProxyPickupCodeStatus {
  UNUSED = 'UNUSED',
  USED = 'USED',
  REVOKED = 'REVOKED',
}

@Entity('proxy_pickup_codes')
export class ProxyPickupCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'order_id' })
  orderId: string;

  @Column({ type: 'varchar', length: 8 })
  code: string;

  @Column({
    type: 'enum',
    enum: ProxyPickupCodeStatus,
    default: ProxyPickupCodeStatus.UNUSED,
  })
  status: ProxyPickupCodeStatus;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
