import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Đơn vị tiếp nhận Rescue Bridge (CM-B03). Do vận hành nền tảng quản lý: chỉ đơn vị
 * is_active AND is_approved mới được ghép nối (BR-B03-02).
 * contact_* chỉ hiển thị cho cửa hàng khi đã gửi đề nghị cho đúng đơn vị đó (BR-B03-09).
 */
@Entity('recipient_organizations')
export class RecipientOrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 100, name: 'contact_name' })
  contactName: string;

  @Column({ type: 'varchar', length: 20, name: 'contact_phone' })
  contactPhone: string;

  /** Nhóm món nhận được, so khớp không phân biệt hoa thường với nhóm món của lô. */
  @Column({ type: 'text', array: true, default: '{}', name: 'accepted_food_categories' })
  acceptedFoodCategories: string[];

  /** Khu vực phục vụ (vd. "Bình Thạnh", "Quận 1"), so khớp với địa chỉ cửa hàng. */
  @Column({ type: 'text', array: true, default: '{}', name: 'service_areas' })
  serviceAreas: string[];

  /** Năng lực: số suất tối đa nhận trong một lần bàn giao (BR-B03-03). */
  @Column({ type: 'int', name: 'max_quantity_per_transfer' })
  maxQuantityPerTransfer: number;

  /** Khung giờ nhận hằng ngày (giờ VN). NULL = nhận bất kỳ giờ nào. */
  @Column({ type: 'time', nullable: true, name: 'receiving_window_start' })
  receivingWindowStart: string | null;

  @Column({ type: 'time', nullable: true, name: 'receiving_window_end' })
  receivingWindowEnd: string | null;

  /** Năng lực bảo quản/vận chuyển do đơn vị khai báo (vd. "Có tủ mát, xe máy"). */
  @Column({ type: 'text', nullable: true, name: 'capacity_note' })
  capacityNote: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_approved' })
  isApproved: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
