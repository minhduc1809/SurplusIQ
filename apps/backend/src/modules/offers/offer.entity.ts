import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('offers')
export class OfferEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  storeId: string;

  @Column({ length: 150 })
  productName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  originalPrice: number;

  @Column({ type: 'int' })
  discountPrice: number;

  @Column({ type: 'int' })
  discountPercentage: number;

  @Column({ type: 'int' })
  initialQuantity: number;

  @Column({ type: 'int' })
  remainingQuantity: number;

  @Column({ type: 'timestamp' })
  pickupStartTime: Date;

  @Column({ type: 'timestamp' })
  pickupEndTime: Date;

  @Column({ default: 'ACTIVE' })
  status: string; // ACTIVE, SOLD_OUT, EXPIRED, DONATED

  @Column({ type: 'text', nullable: true })
  pricingRationale: string;

  @Column({ nullable: true })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
