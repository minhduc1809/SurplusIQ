import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLogEntity } from '../../entities/stores/audit-log.entity';

export interface CreateAuditLogParams {
  storeId?: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface GetStoreAuditLogsQuery {
  action?: string;
  targetType?: string;
  actorId?: string;
  employeeId?: string;
  from?: string | Date;
  to?: string | Date;
  page?: number;
  limit?: number;
}

export const SYSTEM_ACTOR_UUID = '00000000-0000-0000-0000-000000000000';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  /**
   * Ghi vết kiểm toán nhạy cảm (Append-only, không sửa, không xóa - BR-080, R2-075)
   */
  /** `manager`: ghi audit trong CÙNG giao dịch đang mở (dùng cùng kết nối) để không chiếm thêm kết nối pool (BUG-001). */
  async log(params: CreateAuditLogParams, manager?: EntityManager): Promise<AuditLogEntity> {
    const repo = manager ? manager.getRepository(AuditLogEntity) : this.auditRepo;
    const normalizedActorId =
      params.actorId && UUID_REGEX.test(params.actorId) ? params.actorId : SYSTEM_ACTOR_UUID;
    const normalizedStoreId =
      params.storeId && UUID_REGEX.test(params.storeId) ? params.storeId : null;

    const audit = repo.create({
      storeId: normalizedStoreId,
      actorId: normalizedActorId,
      actorRole: params.actorRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId || null,
      oldValue: params.oldValue || null,
      newValue: params.newValue || null,
      ip: params.ip || null,
      userAgent: params.userAgent || null,
    });

    const saved = await repo.save(audit);
    this.logger.log(
      `[AUDIT_LOG] Action: ${params.action}, Target: ${params.targetType}#${params.targetId}, Actor: ${params.actorId}`,
    );
    return saved;
  }

  /**
   * Truy vấn nhật ký hoạt động cửa hàng (R2-075 - Giữ 12 tháng, chỉ đọc BR-080)
   */
  async getStoreAuditLogs(storeId: string, query: GetStoreAuditLogsQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // Quy tắc 7.4 & BR-080: Giới hạn tối đa 12 tháng lưu trữ (audit_months = 12)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const fromDate = query.from
      ? new Date(Math.max(new Date(query.from).getTime(), twelveMonthsAgo.getTime()))
      : twelveMonthsAgo;

    const toDate = query.to ? new Date(query.to) : new Date();

    const qb = this.auditRepo
      .createQueryBuilder('audit')
      .where('audit.store_id = :storeId', { storeId })
      .andWhere('audit.created_at >= :fromDate', { fromDate })
      .andWhere('audit.created_at <= :toDate', { toDate });

    if (query.action) {
      qb.andWhere('audit.action = :action', { action: query.action });
    }

    if (query.targetType) {
      qb.andWhere('audit.target_type = :targetType', { targetType: query.targetType });
    }

    const targetActorId = query.actorId || query.employeeId;
    if (targetActorId) {
      const normalizedActorId = UUID_REGEX.test(targetActorId) ? targetActorId : SYSTEM_ACTOR_UUID;
      qb.andWhere('audit.actor_id = :actorId', { actorId: normalizedActorId });
    }

    qb.orderBy('audit.created_at', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      retentionMonths: 12,
    };
  }
}
