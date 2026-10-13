import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AiUserRole {
  CUSTOMER = 'CUSTOMER',
  STORE = 'STORE',
}

export enum AiConversationStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

@Entity('ai_conversations')
export class AiConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Index()
  @Column('uuid', { nullable: true, name: 'store_id' })
  storeId: string | null;

  @Column({
    type: 'enum',
    enum: AiUserRole,
  })
  role: AiUserRole;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({
    type: 'enum',
    enum: AiConversationStatus,
    default: AiConversationStatus.ACTIVE,
  })
  status: AiConversationStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
