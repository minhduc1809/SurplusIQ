import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum StorePermission {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  COUNTER = 'COUNTER',
}

export enum StoreMemberStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  REMOVED = 'REMOVED',
}

@Entity('store_members')
@Unique(['userId'])
export class StoreMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: StorePermission,
    default: StorePermission.COUNTER,
  })
  permission: StorePermission;

  @Column({
    type: 'enum',
    enum: StoreMemberStatus,
    default: StoreMemberStatus.INVITED,
  })
  status: StoreMemberStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_active_at' })
  lastActiveAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
