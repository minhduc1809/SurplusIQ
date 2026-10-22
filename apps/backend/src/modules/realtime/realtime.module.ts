import { Module, Global } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';
import { OfferStockSubscriber } from './offer-stock.subscriber';

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService, OfferStockSubscriber],
  exports: [RealtimeService],
})
export class RealtimeModule {}
