import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PricingMode {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
}

@Entity('store_settings')
export class StoreSettingsEntity {
  @PrimaryColumn('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'time', name: 'default_pickup_start', default: '19:00:00' })
  defaultPickupStart: string;

  @Column({ type: 'time', name: 'default_pickup_end', default: '21:00:00' })
  defaultPickupEnd: string;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 0.4,
    name: 'floor_ratio',
  })
  floorRatio: number;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    nullable: true,
    name: 'cost_price_ratio',
  })
  costPriceRatio: number | null;

  @Column({
    type: 'enum',
    enum: PricingMode,
    default: PricingMode.MANUAL,
    name: 'pricing_mode',
  })
  pricingMode: PricingMode;

  @Column({ type: 'int', default: 15, name: 'late_grace_minutes' })
  lateGraceMinutes: number;

  @Column({ type: 'int', default: 5, name: 'max_qty_per_order' })
  maxQtyPerOrder: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'fixed_discount_schedule',
  })
  fixedDiscountSchedule: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
