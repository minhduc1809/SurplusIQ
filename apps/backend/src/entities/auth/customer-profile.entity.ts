import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('customer_profiles')
export class CustomerProfileEntity {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar', length: 150, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, default: 5.0, name: 'search_radius_km' })
  searchRadiusKm: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'last_lat' })
  lastLat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'last_lng' })
  lastLng: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
