import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';

export enum OfferKind {
  REGULAR = 'REGULAR',
  SURPRISE_BAG = 'SURPRISE_BAG',
}

export enum OfferStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  SOLD_OUT = 'SOLD_OUT',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Entity('offers')
@Check(`"remaining_quantity" >= 0`)
@Check(`"floor_price" <= "current_price" AND "current_price" <= "original_price"`)
@Check(`"price_change_count" <= 3`)
@Index(['status', 'pickupEnd'])
@Index(['storeId', 'pickupStart'])
export class OfferEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Index()
  @Column('uuid', { nullable: true, name: 'item_id' })
  itemId: string | null;

  @Column({
    type: 'enum',
    enum: OfferKind,
    default: OfferKind.REGULAR,
  })
  kind: OfferKind;

  @Column({ type: 'int', name: 'total_quantity' })
  totalQuantity: number;

  @Column({ type: 'int', name: 'remaining_quantity' })
  remainingQuantity: number;

  @Column({ type: 'int', default: 0, name: 'sold_quantity' })
  soldQuantity: number;

  @Column({ type: 'int', name: 'original_price' })
  originalPrice: number;

  @Column({ type: 'int', name: 'current_price' })
  currentPrice: number;

  @Column({ type: 'int', name: 'floor_price' })
  floorPrice: number;

  @Column({ type: 'timestamptz', name: 'pickup_start' })
  pickupStart: Date;

  @Column({ type: 'timestamptz', name: 'pickup_end' })
  pickupEnd: Date;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.DRAFT,
  })
  status: OfferStatus;

  @Column({ type: 'smallint', default: 0, name: 'price_change_count' })
  priceChangeCount: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
