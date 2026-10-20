import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** CM-B04 Rescue Lab - mục tiêu của kịch bản (luồng chính bước 1). */
export enum RescueLabObjective {
  REDUCE_SURPLUS = 'REDUCE_SURPLUS',
  INCREASE_RECOVERY_REVENUE = 'INCREASE_RECOVERY_REVENUE',
  INCREASE_SELLTHROUGH = 'INCREASE_SELLTHROUGH',
  COMPARE_STRATEGIES = 'COMPARE_STRATEGIES',
}

/** Trạng thái chung BRD mục 4: Nháp → Đang chạy → Hoàn tất/Thất bại (BR-B04-09). */
export enum RescueLabSimulationStatus {
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface RescueLabDataWarning {
  code: string;
  /** BLOCKING: không chạy, giữ Nháp. RESTRICTED: chạy chế độ hạn chế kèm cảnh báo. */
  severity: 'BLOCKING' | 'RESTRICTED';
  message: string;
}

/** Nhóm kịch bản; mỗi lần sửa tham số tạo một dòng rescue_lab_scenario_versions mới. */
@Entity('rescue_lab_scenarios')
@Index(['storeId', 'updatedAt'])
export class RescueLabScenarioEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 40 })
  objective: RescueLabObjective;

  /** Luôn trỏ tới version_no mới nhất. */
  @Column({ type: 'int', name: 'current_version', default: 1 })
  currentVersion: number;

  @Column('uuid', { name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
