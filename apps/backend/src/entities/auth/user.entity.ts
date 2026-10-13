import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STORE_USER = 'STORE_USER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING_VERIFY = 'PENDING_VERIFY',
  ACTIVE = 'ACTIVE',
  PENDING_DELETE = 'PENDING_DELETE',
  ANONYMIZED = 'ANONYMIZED',
  LOCKED = 'LOCKED',
}

@Entity('users')
@Check(`"email" IS NOT NULL OR "phone" IS NOT NULL`)
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Index({ unique: true, where: '"phone" IS NOT NULL' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFY,
  })
  status: UserStatus;

  @Column({ type: 'int', default: 0, name: 'failed_login_count' })
  failedLoginCount: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'locked_until' })
  lockedUntil: Date | null;

  @Column({ type: 'boolean', default: false, name: 'two_factor_enabled' })
  twoFactorEnabled: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'delete_requested_at' })
  deleteRequestedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
