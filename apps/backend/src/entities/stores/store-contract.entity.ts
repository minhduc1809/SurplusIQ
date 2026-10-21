import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ContractStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEED_MORE_INFO = 'NEED_MORE_INFO',
}

/** Hợp đồng hợp tác đã ký và scan do chủ quán tải lên; tệp lưu riêng tư, chỉ chủ quán và admin xem được. */
@Entity('store_contracts')
export class StoreContractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.PENDING_REVIEW })
  status: ContractStatus;

  /** Đường dẫn tương đối trong thư mục lưu riêng tư, không bao giờ trả ra ngoài. */
  @Column({ type: 'varchar', length: 300, name: 'file_path' })
  filePath: string;

  @Column({ type: 'varchar', length: 200, name: 'file_name' })
  fileName: string;

  @Column({ type: 'varchar', length: 50, name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'int', name: 'size_bytes' })
  sizeBytes: number;

  @Column({ type: 'uuid', name: 'uploaded_by' })
  uploadedBy: string;

  @Column({ type: 'text', nullable: true, name: 'review_note' })
  reviewNote: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
