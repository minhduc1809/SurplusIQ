import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PickupsService } from './pickups.service';
import { StorePickupsController } from './store-pickups.controller';
import { CustomerPickupsController } from './customer-pickups.controller';
import { OrderEntity } from '../../entities/orders/order.entity';
import { PickupTokenEntity } from '../../entities/orders/pickup-token.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { UserEntity } from '../../entities/auth/user.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, PickupTokenEntity, OfferEntity, ItemEntity, UserEntity]),
    AuditModule,
  ],
  controllers: [StorePickupsController, CustomerPickupsController],
  providers: [PickupsService],
  exports: [PickupsService],
})
export class PickupsModule {}
