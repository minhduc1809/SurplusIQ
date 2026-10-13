import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ItemStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Entity('items')
export class ItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'int', name: 'original_price' })
  originalPrice: number;

  @Column({ type: 'int', nullable: true, name: 'cost_price' })
  costPrice: number | null;

  @Column({ type: 'int', name: 'standard_shelf_life_hours' })
  standardShelfLifeHours: number;

  @Column({ type: 'text', nullable: true })
  ingredients: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  allergens: string[];

  @Column({ type: 'int', nullable: true, name: 'weight_grams' })
  weightGrams: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
  imageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'nutrition_estimate' })
  nutritionEstimate: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.ACTIVE,
  })
  status: ItemStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
