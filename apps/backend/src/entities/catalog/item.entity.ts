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

// TrustPass (CM-B05/CM-C03): nguồn thông tin là khai báo của cửa hàng theo mặc định,
// chỉ chuyển VERIFIED khi có quy trình xác minh cụ thể (BR-B05-01, BR-B05-02).
export enum TrustpassInformationSource {
  STORE = 'STORE',
  PLATFORM_VERIFIED = 'PLATFORM_VERIFIED',
}

export enum TrustpassVerificationStatus {
  DECLARED = 'DECLARED',
  VERIFIED = 'VERIFIED',
}

export enum TrustpassReviewStatus {
  NONE = 'NONE',
  UNDER_REVIEW = 'UNDER_REVIEW',
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

  // --- TrustPass (CM-B05/CM-C03): hồ sơ minh bạch lô món, không phải chứng nhận an toàn ---

  @Column({ type: 'timestamptz', nullable: true, name: 'prepared_at' })
  preparedAt: Date | null;

  /** Hạn dùng thực phẩm - khác khung nhận hàng của suất, không thay thế nhau (BR-B05-05). */
  @Column({ type: 'timestamptz', nullable: true, name: 'expiry_at' })
  expiryAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'storage_instructions' })
  storageInstructions: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'information_source',
    default: TrustpassInformationSource.STORE,
  })
  informationSource: TrustpassInformationSource;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'verification_status',
    default: TrustpassVerificationStatus.DECLARED,
  })
  verificationStatus: TrustpassVerificationStatus;

  @Column({ type: 'int', name: 'trustpass_version', default: 1 })
  trustpassVersion: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'trustpass_published_at' })
  trustpassPublishedAt: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'trustpass_updated_by' })
  trustpassUpdatedBy: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'review_status',
    default: TrustpassReviewStatus.NONE,
  })
  reviewStatus: TrustpassReviewStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
