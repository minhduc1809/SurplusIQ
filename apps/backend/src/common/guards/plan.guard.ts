import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUIRES_PLAN_KEY } from '../decorators/requires-plan.decorator';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/subscriptions/subscription.entity';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<SubscriptionPlan>(REQUIRES_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan || requiredPlan === SubscriptionPlan.BASIC) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const storeId = request.user?.storeId;

    if (!storeId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_PLAN',
        message: 'Không tìm thấy thông tin cửa hàng để kiểm tra gói dịch vụ',
      });
    }

    const subscription = await this.subRepo.findOne({
      where: { storeId },
    });

    const now = new Date();
    let effectivePlan: SubscriptionPlan = SubscriptionPlan.BASIC;

    if (subscription) {
      const isWithinPeriod =
        subscription.periodEnd && new Date(subscription.periodEnd).getTime() >= now.getTime();

      // VC-01 & VC-02: Gói PRO và TRIAL (dùng thử 30 ngày) đều có đầy đủ quyền lợi Pro
      if (
        (subscription.plan === SubscriptionPlan.PRO ||
          subscription.plan === SubscriptionPlan.TRIAL) &&
        isWithinPeriod &&
        subscription.status !== SubscriptionStatus.EXPIRED
      ) {
        effectivePlan = SubscriptionPlan.PRO;
      }
    }

    request.subscription = subscription;
    request.effectivePlan = effectivePlan;

    if (requiredPlan === SubscriptionPlan.PRO && effectivePlan !== SubscriptionPlan.PRO) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_PLAN',
        message:
          'Tính năng này chỉ khả dụng cho tài khoản đang sử dụng Gói Pro hoặc trong thời gian dùng thử (VC-01..VC-06)',
      });
    }

    return true;
  }
}
