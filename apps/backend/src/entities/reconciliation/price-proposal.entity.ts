import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProposalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  AUTO_APPLIED = 'AUTO_APPLIED',
}

@Entity('price_proposals')
export class PriceProposalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'offer_id' })
  offerId: string;

  @Column({ type: 'int', name: 'old_price' })
  oldPrice: number;

  @Column({ type: 'int', name: 'proposed_price' })
  proposedPrice: number;

  @Column({ type: 'jsonb' })
  components: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.PENDING,
  })
  status: ProposalStatus;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column('uuid', { nullable: true, name: 'decided_by' })
  decidedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'decided_at' })
  decidedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
