import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('support_messages')
export class SupportMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'ticket_id' })
  ticketId: string;

  @Index()
  @Column('uuid', { name: 'sender_id' })
  senderId: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb", name: 'attachment_urls' })
  attachmentUrls: string[];

  @Column({ type: 'boolean', default: false, name: 'is_internal' })
  isInternal: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
