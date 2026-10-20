import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiGatewayService } from './ai-gateway.service';
import { StoreAiController } from './store-ai.controller';
import { CustomerAiController } from './customer-ai.controller';
import { AiConversationEntity } from '../../entities/ai/ai-conversation.entity';
import { AiMessageEntity } from '../../entities/ai/ai-message.entity';
import { AiLogEntity } from '../../entities/ai/ai-log.entity';
import { AiFeedbackEntity } from '../../entities/ai/ai-feedback.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';
import { ComplaintEntity } from '../../entities/complaints/complaint.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiConversationEntity,
      AiMessageEntity,
      AiLogEntity,
      AiFeedbackEntity,
      OfferEntity,
      ItemEntity,
      OrderEntity,
      StoreMemberEntity,
      ReviewEntity,
      ComplaintEntity,
      StoreEntity,
      CustomerProfileEntity,
    ]),
    SubscriptionsModule,
  ],
  controllers: [StoreAiController, CustomerAiController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiModule {}
