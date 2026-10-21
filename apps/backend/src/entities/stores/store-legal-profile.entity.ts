import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BusinessType {
  INDIVIDUAL = 'INDIVIDUAL',
  HOUSEHOLD = 'HOUSEHOLD',
  COMPANY = 'COMPANY',
}

/** Hồ sơ kinh doanh (pháp lý) của cửa hàng: thông tin dùng để lập hợp đồng và đối soát. */
@Entity('store_legal_profiles')
export class StoreLegalProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 150, name: 'legal_name' })
  legalName: string;

  @Column({ type: 'enum', enum: BusinessType, name: 'business_type' })
  businessType: BusinessType;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'tax_code' })
  taxCode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'business_license_no' })
  businessLicenseNo: string | null;

  @Column({ type: 'varchar', length: 100, name: 'representative_name' })
  representativeName: string;

  @Column({ type: 'varchar', length: 20, name: 'representative_phone' })
  representativePhone: string;

  @Column({ type: 'varchar', length: 255, name: 'legal_address' })
  legalAddress: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
