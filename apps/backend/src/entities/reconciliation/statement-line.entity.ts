import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('statement_lines')
export class StatementLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'statement_id' })
  statementId: string;

  @Index()
  @Column('uuid', { nullable: true, name: 'order_id' })
  orderId: string | null;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'int', default: 0 })
  commission: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
