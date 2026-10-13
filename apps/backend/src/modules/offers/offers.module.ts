import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { OfferEventEntity } from '../../entities/catalog/offer-event.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OfferEntity,
      OfferEventEntity,
      ItemEntity,
      OrderEntity,
      StoreMemberEntity,
    ]),
    AuditModule,
    SubscriptionsModule,
  ],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
