import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescueLabService } from './rescue-lab.service';
import { RescueLabController } from './rescue-lab.controller';
import { RescueLabScenarioEntity } from '../../entities/rescue-lab/rescue-lab-scenario.entity';
import { RescueLabScenarioVersionEntity } from '../../entities/rescue-lab/rescue-lab-scenario-version.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { DailyActualEntity } from '../../entities/reconciliation/daily-actual.entity';
import { PriceProposalEntity } from '../../entities/reconciliation/price-proposal.entity';
import { SpecialEventEntity } from '../../entities/reconciliation/special-event.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RescueLabScenarioEntity,
      RescueLabScenarioVersionEntity,
      ItemEntity,
      OfferEntity,
      OrderEntity,
      DailyActualEntity,
      PriceProposalEntity,
      SpecialEventEntity,
      StoreMemberEntity,
    ]),
    AuditModule,
  ],
  controllers: [RescueLabController],
  providers: [RescueLabService],
})
export class RescueLabModule {}
