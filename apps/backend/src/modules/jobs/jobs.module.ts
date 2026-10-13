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
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OfferEntity,
      OfferEventEntity,
      NoshowRecordEntity,
      OrderLockEntity,
    ]),
    AuditModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, BullMqScheduler],
  exports: [JobsService],
})
export class JobsModule {}
