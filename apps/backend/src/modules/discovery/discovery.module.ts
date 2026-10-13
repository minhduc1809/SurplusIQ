import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryService } from './discovery.service';
import { CustomerDealsController } from './customer-deals.controller';
import { CustomerStoresController } from './customer-stores.controller';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { SavedDealEntity } from '../../entities/auth/saved-deal.entity';
import { DealAlertEntity } from '../../entities/auth/deal-alert.entity';
import { SavedFilterEntity } from '../../entities/auth/saved-filter.entity';
import { ViewHistoryEntity } from '../../entities/auth/view-history.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OfferEntity,
      ItemEntity,
      StoreEntity,
      SavedDealEntity,
      DealAlertEntity,
      SavedFilterEntity,
      ViewHistoryEntity,
      ReviewEntity,
    ]),
  ],
  controllers: [CustomerDealsController, CustomerStoresController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
