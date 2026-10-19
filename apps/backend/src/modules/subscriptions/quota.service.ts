import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, Between } from 'typeorm';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/subscriptions/subscription.entity';
import { PlanQuotaEntity } from '../../entities/subscriptions/plan-quota.entity';
import { UsageLogEntity } from '../../entities/subscriptions/usage-log.entity';
import { StoreMemberEntity, StoreMemberStatus } from '../../entities/stores/store-member.entity';
import { PromotionEntity, PromotionStatus } from '../../entities/marketing/promotion.entity';
import { QuotaKey, QuotaPeriod, PLAN_QUOTAS_MAP, QuotaDefinition } from './quota.constants';

export interface QuotaCheckResult {
  quotaKey: QuotaKey;
  name: string;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: Date | null;
  isExceeded: boolean;
  period: QuotaPeriod;
}

export interface ConsumeQuotaParams {
  storeId?: string;
  userId?: string;
  quotaKey: QuotaKey;
  units?: number;
  refId?: string;
}

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
    @InjectRepository(PlanQuotaEntity)
    private readonly planQuotaRepo: Repository<PlanQuotaEntity>,
    @InjectRepository(UsageLogEntity)
    private readonly usageLogRepo: Repository<UsageLogEntity>,
    @InjectRepository(StoreMemberEntity)
    private readonly storeMemberRepo: Repository<StoreMemberEntity>,
    @InjectRepository(PromotionEntity)
    private readonly promotionRepo: Repository<PromotionEntity>,
  ) {}

  /**
   * Xác định gói dịch vụ có hiệu lực thực tế của cửa hàng (VC-01..VC-06)
   * Nếu hết hạn kỳ trả phí/dùng thử -> tự động hạ về BASIC lúc 00:00 (VC-06)
   */
  async getEffectivePlan(storeId: string, manager?: EntityManager): Promise<SubscriptionPlan> {
    if (!storeId) {
      return SubscriptionPlan.BASIC;
    }

    const subRepo = manager ? manager.getRepository(SubscriptionEntity) : this.subRepo;
    const sub = await subRepo.findOne({
      where: { storeId },
    });

    if (!sub) {
      return SubscriptionPlan.BASIC;
    }

    const now = new Date();
    const isWithinPeriod = sub.periodEnd && new Date(sub.periodEnd).getTime() >= now.getTime();

    // VC-01 & VC-02: Gói TRIAL (30 ngày dùng thử) và PRO đều có quyền lợi gói Pro
    if (
      (sub.plan === SubscriptionPlan.PRO || sub.plan === SubscriptionPlan.TRIAL) &&
      isWithinPeriod &&
      sub.status !== SubscriptionStatus.EXPIRED
    ) {
      return sub.plan;
    }

    // VC-06: Hết hạn -> tự động về Basic
    return SubscriptionPlan.BASIC;
  }

  /**
   * Lấy hạn mức định mức của tính năng dựa trên gói hiệu lực
   */
  async getQuotaLimit(storeId: string | null, quotaKey: QuotaKey): Promise<number> {
    const quotaDef = PLAN_QUOTAS_MAP[quotaKey];
    if (!quotaDef) {
      return 0;
    }

    const plan = storeId ? await this.getEffectivePlan(storeId) : SubscriptionPlan.BASIC;

    // Ưu tiên đọc cấu hình trong bảng plan_quotas nếu có
    const customQuota = await this.planQuotaRepo.findOne({
      where: {
        plan: plan === SubscriptionPlan.TRIAL ? SubscriptionPlan.PRO : plan,
        quotaKey,
      },
    });

    if (customQuota) {
      return customQuota.quotaValue;
    }

    // Fallback sang cấu hình mặc định trong PLAN_QUOTAS_MAP
    return quotaDef.limits[plan] ?? quotaDef.limits[SubscriptionPlan.BASIC];
  }

  /**
   * Tính toán khung thời gian chu kỳ (hôm nay, tháng này)
   */
  getPeriodWindow(period: QuotaPeriod): { start: Date; end: Date } {
    const now = new Date();

    if (period === QuotaPeriod.DAILY) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }

    if (period === QuotaPeriod.MONTHLY) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }

    return { start: now, end: now };
  }

  /**
   * Đếm mức sử dụng hiện tại của quota (qua usage_logs hoặc thực thể đang active)
   */
  async getCurrentUsage(params: {
    storeId?: string;
    userId?: string;
    quotaKey: QuotaKey;
  }): Promise<{ used: number; resetsAt: Date | null }> {
    const quotaDef = PLAN_QUOTAS_MAP[params.quotaKey];
    if (!quotaDef) {
      return { used: 0, resetsAt: null };
    }

    // 1. Hạn mức kiểu tồn tại (EXISTENCE): Đếm số lượng thực thể đang ACTIVE (mục 6, 8.4)
    if (quotaDef.period === QuotaPeriod.EXISTENCE) {
      if (params.quotaKey === QuotaKey.ACTIVE_STAFF && params.storeId) {
        const count = await this.storeMemberRepo.count({
          where: {
            storeId: params.storeId,
            status: StoreMemberStatus.ACTIVE,
          },
        });
        return { used: count, resetsAt: null };
      }

      if (params.quotaKey === QuotaKey.ACTIVE_PROMOTIONS && params.storeId) {
        const count = await this.promotionRepo.count({
          where: {
            storeId: params.storeId,
            status: PromotionStatus.ACTIVE,
          },
        });
        return { used: count, resetsAt: null };
      }

      return { used: 0, resetsAt: null };
    }

    // 2. Hạn mức mỗi lần yêu cầu (PER_REQUEST)
    if (quotaDef.period === QuotaPeriod.PER_REQUEST) {
      return { used: 0, resetsAt: null };
    }

    // 3. Hạn mức chu kỳ (DAILY hoặc MONTHLY): Tính tổng units trong bảng usage_logs
    const { start, end } = this.getPeriodWindow(quotaDef.period);

    const qb = this.usageLogRepo
      .createQueryBuilder('log')
      .select('COALESCE(SUM(log.units), 0)', 'total')
      .where('log.quota_key = :quotaKey', { quotaKey: params.quotaKey })
      .andWhere('log.created_at BETWEEN :start AND :end', { start, end });

    if (params.storeId) {
      qb.andWhere('log.store_id = :storeId', { storeId: params.storeId });
    }

    if (params.userId) {
      qb.andWhere('log.user_id = :userId', { userId: params.userId });
    }

    const raw = await qb.getRawOne();
    const used = Number(raw?.total || 0);

    // Thời điểm đặt lại chu kỳ: 00:00 của ngày tiếp theo hoặc tháng tiếp theo
    const resetsAt = new Date(end.getTime() + 1);

    return { used, resetsAt };
  }

  /**
   * Kiểm tra hạn mức mà không tiêu thụ (phục vụ hiển thị UI và kiểm tra trước khi gọi AI)
   */
  async checkQuota(params: {
    storeId?: string;
    userId?: string;
    quotaKey: QuotaKey;
  }): Promise<QuotaCheckResult> {
    const quotaDef = PLAN_QUOTAS_MAP[params.quotaKey];
    if (!quotaDef) {
      throw new HttpException(
        {
          code: 'INVALID_QUOTA_KEY',
          message: `Mã hạn mức [${params.quotaKey}] không tồn tại trong hệ thống`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const limit = await this.getQuotaLimit(params.storeId || null, params.quotaKey);
    const { used, resetsAt } = await this.getCurrentUsage(params);
    const remaining = Math.max(0, limit - used);

    return {
      quotaKey: params.quotaKey,
      name: quotaDef.name,
      limit,
      used,
      remaining,
      resetsAt,
      isExceeded: used >= limit,
      period: quotaDef.period,
    };
  }

  /**
   * Tiêu thụ hạn mức và ghi log vào usage_logs (8.3.1, 8.4, BR-050)
   * Ném lỗi 403 / 429 nếu vượt trần hạn mức kèm remaining và resetsAt
   */
  async consume(params: ConsumeQuotaParams): Promise<QuotaCheckResult> {
    const units = params.units ?? 1;
    const quotaDef = PLAN_QUOTAS_MAP[params.quotaKey];
    if (!quotaDef) {
      throw new HttpException(
        {
          code: 'INVALID_QUOTA_KEY',
          message: `Mã hạn mức [${params.quotaKey}] không hợp lệ`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const limit = await this.getQuotaLimit(params.storeId || null, params.quotaKey);
    const { used, resetsAt } = await this.getCurrentUsage(params);

    // Kiểm tra nếu vượt trần hạn mức (8.3.1, 5.5)
    if (used + units > limit) {
      this.logger.warn(
        `[QUOTA_EXCEEDED] Key: ${params.quotaKey}, Store: ${params.storeId}, Limit: ${limit}, Used: ${used}, Requested: ${units}`,
      );

      throw new HttpException(
        {
          code: 'QUOTA_EXCEEDED',
          message: `Bạn đã đạt trần hạn mức cho tính năng [${quotaDef.name}]. Vui lòng nâng cấp gói Pro để tăng hạn mức.`,
          details: {
            quotaKey: params.quotaKey,
            name: quotaDef.name,
            limit,
            used,
            remaining: 0,
            resetsAt: resetsAt ? resetsAt.toISOString() : null,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Nếu không phải là hạn mức kiểu tồn tại (EXISTENCE), ghi bản ghi usage_logs
    if (quotaDef.period !== QuotaPeriod.EXISTENCE) {
      const usageLog = this.usageLogRepo.create({
        storeId: params.storeId || null,
        userId: params.userId || null,
        quotaKey: params.quotaKey,
        units,
        refId: params.refId || null,
      });
      await this.usageLogRepo.save(usageLog);
    }

    const newUsed = used + units;
    const remaining = Math.max(0, limit - newUsed);

    return {
      quotaKey: params.quotaKey,
      name: quotaDef.name,
      limit,
      used: newUsed,
      remaining,
      resetsAt,
      isExceeded: false,
      period: quotaDef.period,
    };
  }

  /**
   * Báo cáo tổng hợp toàn bộ hạn mức thời gian thực của cửa hàng (R2-016)
   */
  async getStoreQuotaSummary(storeId: string): Promise<Record<string, QuotaCheckResult>> {
    const summary: Record<string, QuotaCheckResult> = {};

    const storeQuotaKeys = [
      QuotaKey.DAILY_OFFERS,
      QuotaKey.CSV_IMPORT_LINES,
      QuotaKey.AI_IMAGE_SCAN,
      QuotaKey.AI_CHAT_QUERY,
      QuotaKey.AI_CONTENT_GEN,
      QuotaKey.ACTIVE_STAFF,
      QuotaKey.ACTIVE_PROMOTIONS,
      QuotaKey.CAMPAIGNS_PER_MONTH,
      QuotaKey.EXPORT_REPORTS,
      QuotaKey.EXPORT_ORDERS,
    ];

    for (const key of storeQuotaKeys) {
      summary[key] = await this.checkQuota({ storeId, quotaKey: key });
    }

    return summary;
  }
}
