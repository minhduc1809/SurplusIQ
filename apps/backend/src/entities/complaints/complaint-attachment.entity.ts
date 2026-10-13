import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('complaint_attachments')
export class ComplaintAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'complaint_id' })
  complaintId: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'smallint', default: 0, name: 'added_round' })
  addedRound: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
