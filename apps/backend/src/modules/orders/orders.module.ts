import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { CustomerOrdersController } from './customer-orders.controller';
import { StoreOrdersController } from './store-orders.controller';
import { OrderEntity } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OfferEntity,
      OrderLockEntity,
      NoshowRecordEntity,
      StoreMemberEntity,
    ]),
    AuditModule,
  ],
  controllers: [CustomerOrdersController, StoreOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
