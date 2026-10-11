import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('decisions')
export class DecisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  storeId: string;

  @Column({ length: 50 })
  decisionType: string; // FORECAST, DYNAMIC_PRICING, DONATION

  @Column({ type: 'jsonb' })
  inputSnapshot: Record<string, any>;

  @Column({ type: 'jsonb' })
  outputRecommendation: Record<string, any>;

  @Column({ type: 'text' })
  rationale: string;

  @Column({ default: false })
  wasAcceptedByStore: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
