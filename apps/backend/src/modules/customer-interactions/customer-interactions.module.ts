import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerInteractionsService } from './customer-interactions.service';
import { CustomerInteractionsController } from './customer-interactions.controller';
import { ComplaintEntity } from '../../entities/complaints/complaint.entity';
import { ComplaintAttachmentEntity } from '../../entities/complaints/complaint-attachment.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplaintEntity,
      ComplaintAttachmentEntity,
      ReviewEntity,
      OrderEntity,
      OfferEntity,
      ItemEntity,
      StoreEntity,
    ]),
  ],
  controllers: [CustomerInteractionsController],
  providers: [CustomerInteractionsService],
  exports: [CustomerInteractionsService],
})
export class CustomerInteractionsModule {}
