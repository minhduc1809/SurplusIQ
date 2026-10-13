import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AiMessageSender {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
}

@Entity('ai_messages')
export class AiMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'conversation_id' })
  conversationId: string;

  @Column({
    type: 'enum',
    enum: AiMessageSender,
  })
  sender: AiMessageSender;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true, name: 'tools_called' })
  toolsCalled: Record<string, unknown> | null;

  @Column({ type: 'int', default: 0, name: 'context_tokens' })
  contextTokens: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
