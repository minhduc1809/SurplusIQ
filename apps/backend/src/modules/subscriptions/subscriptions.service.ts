import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/subscriptions/subscription.entity';
import { QuotaService } from './quota.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
    private readonly quotaService: QuotaService,
  ) {}

  private async formatSubscription(sub: SubscriptionEntity) {
    const effectivePlan = await this.quotaService.getEffectivePlan(sub.storeId);
    const now = new Date();
    const periodEnd = sub.periodEnd ? new Date(sub.periodEnd) : null;
    const msRemaining = periodEnd ? Math.max(0, periodEnd.getTime() - now.getTime()) : 0;
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    return {
      storeId: sub.storeId,
      plan: sub.plan,
      effectivePlan,
      status: sub.status,
      periodStart: sub.periodStart,
      periodEnd: sub.periodEnd,
      daysRemaining,
      trialUsed: sub.trialUsed,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      downgradeAtPeriodEnd: sub.downgradeAtPeriodEnd,
      isTrial: sub.plan === SubscriptionPlan.TRIAL,
    };
  }

  /**
   * Lấy thông tin gói dịch vụ hiện tại và quyền lợi của cửa hàng (R2-011, VC-01..VC-06)
   */
  async getCurrentSubscription(storeId: string) {
    let sub = await this.subRepo.findOne({
      where: { storeId },
    });

    if (!sub) {
      // Khởi tạo mặc định gói Basic nếu chưa có
      sub = this.subRepo.create({
        storeId,
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1000), // Vô thời hạn
        trialUsed: false,
      });
      await this.subRepo.save(sub);
    }

    return this.formatSubscription(sub);
  }

  /**
   * Nâng cấp gói Pro (VC-02, kỳ 30 ngày tính từ thời điểm kích hoạt)
   */
  async upgradeToPro(storeId: string) {
    let sub = await this.subRepo.findOne({
      where: { storeId },
    });

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (!sub) {
      sub = this.subRepo.create({
        storeId,
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodStart: now,
        periodEnd,
        trialUsed: true,
      });
    } else {
      sub.plan = SubscriptionPlan.PRO;
      sub.status = SubscriptionStatus.ACTIVE;
      sub.periodStart = now;
      sub.periodEnd = periodEnd;
      sub.cancelAtPeriodEnd = false;
      sub.downgradeAtPeriodEnd = false;
    }

    const saved = await this.subRepo.save(sub);
    return this.formatSubscription(saved);
  }

  /**
   * Hủy gói Pro (VC-08: quyền lợi giữ nguyên đến hết kỳ đã thanh toán; nếu đang dùng thử thì dừng ngay)
   */
  async cancelPro(storeId: string) {
    const sub = await this.subRepo.findOne({
      where: { storeId },
    });

    if (!sub) {
      throw new NotFoundException('Không tìm thấy thông tin gói dịch vụ');
    }

    if (sub.plan === SubscriptionPlan.TRIAL) {
      // Hủy trong kỳ dùng thử: dừng ngay lập tức về Basic (VC-08)
      sub.plan = SubscriptionPlan.BASIC;
      sub.periodEnd = new Date();
      sub.cancelAtPeriodEnd = false;
    } else if (sub.plan === SubscriptionPlan.PRO) {
      // Gói trả phí: đánh dấu hủy vào cuối kỳ (VC-08)
      sub.cancelAtPeriodEnd = true;
    }

    const saved = await this.subRepo.save(sub);
    return this.formatSubscription(saved);
  }
}
