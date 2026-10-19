import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { BullMqScheduler } from './bullmq.scheduler';
import { OrderEntity } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { OfferEventEntity } from '../../entities/catalog/offer-event.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { ComplaintEntity } from '../../entities/complaints/complaint.entity';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';
import { WeeklyStatementEntity } from '../../entities/reconciliation/weekly-statement.entity';
import { StatementLineEntity } from '../../entities/reconciliation/statement-line.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { SubscriptionEntity } from '../../entities/subscriptions/subscription.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { ForecastEntity } from '../../entities/reconciliation/forecast.entity';
import { PriceProposalEntity } from '../../entities/reconciliation/price-proposal.entity';
import { DailyActualEntity } from '../../entities/reconciliation/daily-actual.entity';
import { UserEntity } from '../../entities/auth/user.entity';
import { DietaryProfileEntity } from '../../entities/auth/dietary-profile.entity';
import { SavedPlaceEntity } from '../../entities/auth/saved-place.entity';
import { FcmTokenEntity } from '../../entities/auth/fcm-token.entity';
import { AiLogEntity } from '../../entities/ai/ai-log.entity';
import { ViewHistoryEntity } from '../../entities/auth/view-history.entity';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OfferEntity,
      OfferEventEntity,
      NoshowRecordEntity,
      OrderLockEntity,
      ComplaintEntity,
      PaymentTransactionEntity,
      WeeklyStatementEntity,
      StatementLineEntity,
      StoreEntity,
      StoreSettingsEntity,
      StoreMemberEntity,
      SubscriptionEntity,
      ItemEntity,
      ForecastEntity,
      PriceProposalEntity,
      DailyActualEntity,
      UserEntity,
      DietaryProfileEntity,
      SavedPlaceEntity,
      FcmTokenEntity,
      AiLogEntity,
      ViewHistoryEntity,
    ]),
    AuditModule,
    SettingsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, BullMqScheduler],
  exports: [JobsService],
})
export class JobsModule {}
