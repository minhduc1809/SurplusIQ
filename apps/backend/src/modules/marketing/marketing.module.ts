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
    ]),
    SubscriptionsModule,
  ],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
