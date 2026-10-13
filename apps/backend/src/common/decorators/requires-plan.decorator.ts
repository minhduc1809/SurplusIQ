import { SetMetadata } from '@nestjs/common';
import { SubscriptionPlan } from '../../entities/subscriptions/subscription.entity';

export const REQUIRES_PLAN_KEY = 'requiresPlan';
export const RequiresPlan = (plan: SubscriptionPlan = SubscriptionPlan.PRO) =>
  SetMetadata(REQUIRES_PLAN_KEY, plan);
