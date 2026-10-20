import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** CM-B01 Rescue Timeline: mức nguy cơ của một lô/suất (lot = offer). */
export enum RescueRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/** BR-B01-02: thiếu/cũ dữ liệu là trạng thái riêng, không được diễn giải thành mức nguy cơ chắc chắn. */
export enum RescueDataQualityStatus {
  OK = 'OK',
  STALE = 'STALE',
  INSUFFICIENT = 'INSUFFICIENT',
}

/** Luồng chính bước 7: trạng thái lô khi bán hết, hết hạn, bàn giao hoặc đóng. */
export enum RescueLotStatus {
  ACTIVE = 'ACTIVE',
  SOLD_OUT = 'SOLD_OUT',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
  HANDED_OVER = 'HANDED_OVER',
}

export enum RescueActionType {
  UPDATE_STOCK = 'UPDATE_STOCK',
  VIEW_PRICE = 'VIEW_PRICE',
  ADJUST_PRICE = 'ADJUST_PRICE',
  CREATE_SURPRISE_BAG = 'CREATE_SURPRISE_BAG',
  OPEN_RESCUE_BRIDGE = 'OPEN_RESCUE_BRIDGE',
  REQUEST_MANAGER = 'REQUEST_MANAGER',
}

export enum RescueActionOutcome {
  /** Đã áp dụng trực tiếp tại Rescue Timeline (cập nhật tồn có khóa dòng). */
  APPLIED = 'APPLIED',
  /** Đã kiểm tra quyền/trạng thái, chuyển sang luồng có sẵn (giá, túi bất ngờ, quyên góp). */
  ROUTED = 'ROUTED',
  /** Nhân viên thiếu quyền chuyển yêu cầu cho quản lý. */
  FORWARDED = 'FORWARDED',
}

export interface RescueRiskFactor {
  code: string;
  label: string;
  value?: unknown;
  points: number;
}

export interface RescueRecommendedAction {
  type: RescueActionType;
  reason: string;
}

@Entity('rescue_risk_snapshots')
@Index(['storeId', 'lotStatus'])
export class RescueRiskSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** lot_id = offers.id (một suất bán là một lô cần cứu). */
  @Index({ unique: true })
  @Column('uuid', { name: 'lot_id' })
  lotId: string;

  @Column('uuid', { name: 'store_id' })
  storeId: string;

  @Column('uuid', { nullable: true, name: 'item_id' })
  itemId: string | null;

  @Column({ type: 'int', name: 'quantity_available' })
  quantityAvailable: number;

  @Column({ type: 'timestamptz', name: 'pickup_end_at' })
  pickupEndAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'expiry_at' })
  expiryAt: Date | null;

  @Column({ type: 'varchar', length: 20, name: 'lot_status', default: RescueLotStatus.ACTIVE })
  lotStatus: RescueLotStatus;

  /** NULL khi data_quality_status = INSUFFICIENT hoặc lô đã kết thúc. */
  @Column({ type: 'varchar', length: 10, nullable: true, name: 'risk_level' })
  riskLevel: RescueRiskLevel | null;

  @Column({ type: 'jsonb', name: 'risk_factors', default: () => "'[]'" })
  riskFactors: RescueRiskFactor[];

  @Column({ type: 'varchar', length: 20, name: 'data_quality_status' })
  dataQualityStatus: RescueDataQualityStatus;

  @Column({ type: 'jsonb', name: 'recommended_actions', default: () => "'[]'" })
  recommendedActions: RescueRecommendedAction[];

  @Column({ type: 'timestamptz', name: 'calculated_at' })
  calculatedAt: Date;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'action_taken' })
  actionTaken: RescueActionType | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  outcome: RescueActionOutcome | null;

  @Column('uuid', { nullable: true, name: 'action_taken_by' })
  actionTakenBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'action_taken_at' })
  actionTakenAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
