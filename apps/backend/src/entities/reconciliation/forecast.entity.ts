import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum ForecastConfidence {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ForecastMethod {
  DOW_AVG = 'DOW_AVG',
  YESTERDAY_FALLBACK = 'YESTERDAY_FALLBACK',
}

@Entity('forecasts')
@Unique(['storeId', 'itemId', 'targetDate'])
export class ForecastEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Index()
  @Column('uuid', { name: 'item_id' })
  itemId: string;

  @Column({ type: 'date', name: 'target_date' })
  targetDate: string;

  @Column({ type: 'int' })
  recommended: number;

  @Column({ type: 'int' })
  low: number;

  @Column({ type: 'int' })
  high: number;

  @Column({
    type: 'enum',
    enum: ForecastConfidence,
    default: ForecastConfidence.MEDIUM,
  })
  confidence: ForecastConfidence;

  @Column({
    type: 'enum',
    enum: ForecastMethod,
    default: ForecastMethod.DOW_AVG,
  })
  method: ForecastMethod;

  @Column({ type: 'jsonb' })
  components: Record<string, unknown>;

  @Column({ type: 'int', nullable: true, name: 'chosen_quantity' })
  chosenQuantity: number | null;

  @Column({ type: 'text', nullable: true, name: 'override_reason' })
  overrideReason: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
