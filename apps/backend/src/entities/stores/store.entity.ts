import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum StoreStatus {
  PENDING_VERIFY = 'PENDING_VERIFY',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('stores')
export class StoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'owner_user_id' })
  ownerUserId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: string | object | null;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'logo_url' })
  logoUrl: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'open_hours' })
  openHours: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: StoreStatus,
    default: StoreStatus.PENDING_VERIFY,
  })
  status: StoreStatus;

  @Column({ type: 'boolean', default: false, name: 'trial_used' })
  trialUsed: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_demo' })
  isDemo: boolean;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0.0, name: 'rating_avg' })
  ratingAvg: number;

  @Column({ type: 'int', default: 0, name: 'rating_count' })
  ratingCount: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
