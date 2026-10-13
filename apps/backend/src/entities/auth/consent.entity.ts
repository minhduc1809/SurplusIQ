import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ConsentType {
  TERMS = 'TERMS',
  LOCATION = 'LOCATION',
  PROMOTION = 'PROMOTION',
  PERSONALIZATION = 'PERSONALIZATION',
  AI_MEMORY = 'AI_MEMORY',
}

@Entity('consents')
@Index(['userId', 'type'])
export class ConsentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ConsentType,
  })
  type: ConsentType;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'boolean' })
  granted: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'granted_at' })
  grantedAt: Date;
}
