import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescuePoolEntity } from '../../entities/rescue-pool/rescue-pool.entity';
import { RescuePoolRegistrationEntity } from '../../entities/rescue-pool/rescue-pool-registration.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RescuePoolService } from './rescue-pool.service';
import { StoreRescuePoolController } from './store-rescue-pool.controller';
import { CustomerRescuePoolController } from './customer-rescue-pool.controller';

/** Rescue Pool: CM-B02 (cửa hàng) + CM-C02 (khách). */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RescuePoolEntity,
      RescuePoolRegistrationEntity,
      ItemEntity,
      StoreEntity,
      StoreMemberEntity,
    ]),
    OrdersModule,
    NotificationsModule,
  ],
  controllers: [StoreRescuePoolController, CustomerRescuePoolController],
  providers: [RescuePoolService],
  exports: [RescuePoolService],
})
export class RescuePoolModule {}
