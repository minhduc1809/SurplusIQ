import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { TrustpassInformationSource } from './item.entity';

/** Lịch sử thay đổi trường trọng yếu của TrustPass (BR-B05-06). */
@Entity('trustpass_history')
@Index(['itemId', 'createdAt'])
export class TrustpassHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'item_id' })
  itemId: string;

  @Column({ type: 'int', name: 'version_no' })
  versionNo: number;

  @Column('uuid', { name: 'changed_by' })
  changedBy: string;

  @Column({ type: 'varchar', length: 50, name: 'field_name' })
  fieldName: string;

  @Column({ type: 'jsonb', nullable: true, name: 'old_value' })
  oldValue: unknown;

  @Column({ type: 'jsonb', nullable: true, name: 'new_value' })
  newValue: unknown;

  @Column({
    type: 'varchar',
    length: 20,
    default: TrustpassInformationSource.STORE,
  })
  source: TrustpassInformationSource;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
