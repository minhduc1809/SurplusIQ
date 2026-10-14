import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionEntity } from '../../entities/subscriptions/subscription.entity';
import { PlanQuotaEntity } from '../../entities/subscriptions/plan-quota.entity';
import { UsageLogEntity } from '../../entities/subscriptions/usage-log.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { PromotionEntity } from '../../entities/marketing/promotion.entity';
import { SubscriptionInvoiceEntity } from '../../entities/subscriptions/subscription-invoice.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { QuotaService } from './quota.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';
import { StoreStatusGuard } from '../../common/guards/store-status.guard';
import { PlanGuard } from '../../common/guards/plan.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionEntity,
      SubscriptionInvoiceEntity,
      StoreSettingsEntity,
      PlanQuotaEntity,
      UsageLogEntity,
      StoreMemberEntity,
      PromotionEntity,
      StoreEntity,
    ]),
  ],
  controllers: [SubscriptionsController],
  providers: [
    QuotaService,
    SubscriptionsService,
    StorePermissionGuard,
    StoreStatusGuard,
    PlanGuard,
    RolesGuard,
    ChannelGuard,
  ],
  exports: [QuotaService, SubscriptionsService, TypeOrmModule],
})
export class SubscriptionsModule {}
