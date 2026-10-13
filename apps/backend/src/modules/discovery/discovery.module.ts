import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryService } from './discovery.service';
import { CustomerDealsController } from './customer-deals.controller';
import { CustomerStoresController } from './customer-stores.controller';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { SavedDealEntity } from '../../entities/auth/saved-deal.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OfferEntity, ItemEntity, StoreEntity, SavedDealEntity, ReviewEntity]),
  ],
  controllers: [CustomerDealsController, CustomerStoresController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
