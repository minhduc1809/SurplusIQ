import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';
import { RescueLabDataWarning, RescueLabSimulationStatus } from './rescue-lab-scenario.entity';

/** Phạm vi món. Cả hai rỗng = tất cả món của cửa hàng (gồm túi bất ngờ). */
export interface RescueLabItemScope {
  itemIds?: string[];
  categories?: string[];
}

export interface RescueLabAssumptions {
  /** Mức giảm so với giá gốc giả định (0.05-0.7). */
  discountRatio: number;
  /** Độ co giãn của cầu theo giá - là GIẢ ĐỊNH người dùng nhập, không phải số đo được. */
  priceElasticity: number;
  /** Thay đổi số suất đưa lên cứu so với kỳ nền (%). */
  volumeChangePct: number;
  note?: string;
}

/**
 * BR-B04-03: `kind` nằm ngay trong dữ liệu để mọi nơi đọc đều phân biệt được
 * SIMULATED (mô phỏng) / ACTUAL (quan sát thực tế) / ACTUAL_BASELINE (thực tế kỳ nền).
 */
export interface RescueLabMetrics {
  kind: 'SIMULATED' | 'ACTUAL' | 'ACTUAL_BASELINE';
  periodDays: number;
  offeredUnits: number;
  soldUnits: number;
  surplusUnits: number;
  sellThroughRate: number;
  recoveryRevenue: number;
  avgRealizedPrice: number;
  avgOriginalPrice: number;
  realizedDiscountRatio: number;
}

/**
 * Một lần chạy kịch bản. Tham số (khoảng thời gian, phạm vi, giả định) KHÔNG BAO GIỜ bị sửa sau khi tạo;
 * kết quả không đổi sau khi Hoàn tất/Thất bại; bản ghi áp dụng không đổi sau khi ghi.
 * Bảo đảm bằng service (chỉ insert phiên bản mới) VÀ trigger DB `trg_rescue_lab_versions_guard`.
 */
@Entity('rescue_lab_scenario_versions')
@Unique(['scenarioId', 'versionNo'])
@Index(['storeId', 'simulationStatus'])
export class RescueLabScenarioVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid', { name: 'scenario_id' })
  scenarioId: string;

  /** Phi chuẩn hóa từ scenario để mọi truy vấn lọc thẳng theo cửa hàng (BR-B04-07). */
  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column({ type: 'int', name: 'version_no' })
  versionNo: number;

  @Column({ type: 'date', name: 'date_range_start' })
  dateRangeStart: string;

  @Column({ type: 'date', name: 'date_range_end' })
  dateRangeEnd: string;

  @Column({ type: 'jsonb', name: 'item_scope' })
  itemScope: RescueLabItemScope;

  @Column({ type: 'jsonb' })
  assumptions: RescueLabAssumptions;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'simulation_status',
    default: RescueLabSimulationStatus.DRAFT,
  })
  simulationStatus: RescueLabSimulationStatus;

  /** Ảnh chụp dữ liệu nguồn thực dùng để tính - truy lại được kể cả khi dữ liệu sống đã đổi. */
  @Column({ type: 'jsonb', nullable: true, name: 'input_snapshot' })
  inputSnapshot: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'input_snapshot_hash' })
  inputSnapshotHash: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'engine_version' })
  engineVersion: string | null;

  /** NULL trừ khi COMPLETED (CHECK trong DB) - không lưu kết quả dở dang như hoàn tất. */
  @Column({ type: 'jsonb', nullable: true, name: 'simulated_metrics' })
  simulatedMetrics: { simulated: RescueLabMetrics; baseline: RescueLabMetrics } | null;

  @Column({ type: 'jsonb', name: 'data_quality_warnings', default: () => "'[]'" })
  dataQualityWarnings: RescueLabDataWarning[];

  @Column({ type: 'text', nullable: true, name: 'failed_reason' })
  failedReason: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'run_started_at' })
  runStartedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'run_completed_at' })
  runCompletedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'applied_at' })
  appliedAt: Date | null;

  @Column('uuid', { nullable: true, name: 'applied_by' })
  appliedBy: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'applied_scope' })
  appliedScope: Record<string, unknown> | null;

  @Column({ type: 'date', nullable: true, name: 'observation_window_start' })
  observationWindowStart: string | null;

  @Column({ type: 'date', nullable: true, name: 'observation_window_end' })
  observationWindowEnd: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'actual_metrics' })
  actualMetrics: RescueLabMetrics | null;

  @Column({ type: 'jsonb', nullable: true, name: 'comparison_result' })
  comparisonResult: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true, name: 'limitation_notes' })
  limitationNotes: string | null;

  @Column('uuid', { name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
