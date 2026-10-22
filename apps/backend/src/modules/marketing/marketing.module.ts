import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingService } from './marketing.service';
import { MarketingController } from './marketing.controller';
import { PromotionEntity } from '../../entities/marketing/promotion.entity';
import { CampaignEntity } from '../../entities/marketing/campaign.entity';
import { CustomerSegmentEntity } from '../../entities/stores/customer-segment.entity';
import { SurpriseBagItemEntity } from '../../entities/catalog/surprise-bag-item.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { CampaignDeliveryEntity } from '../../entities/marketing/campaign-delivery.entity';
import { FavoriteStoreEntity } from '../../entities/auth/favorite-store.entity';
import { ConsentEntity } from '../../entities/auth/consent.entity';
import { NotificationEntity } from '../../entities/notifications/notification.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromotionEntity,
      CampaignEntity,
      CustomerSegmentEntity,
      SurpriseBagItemEntity,
      OfferEntity,
      ItemEntity,
      OrderEntity,
      StoreMemberEntity,
      StoreSettingsEntity,
      CampaignDeliveryEntity,
      FavoriteStoreEntity,
      ConsentEntity,
      NotificationEntity,
    ]),
    SubscriptionsModule,
  ],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
