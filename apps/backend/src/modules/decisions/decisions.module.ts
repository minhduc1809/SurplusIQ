import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecisionsService } from './decisions.service';
import { DecisionsController } from './decisions.controller';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { DailyActualEntity } from '../../entities/reconciliation/daily-actual.entity';
import { ForecastEntity } from '../../entities/reconciliation/forecast.entity';
import { PriceProposalEntity } from '../../entities/reconciliation/price-proposal.entity';
import { DecisionEntity } from './decision.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ItemEntity,
      OfferEntity,
      DailyActualEntity,
      ForecastEntity,
      PriceProposalEntity,
      DecisionEntity,
      StoreSettingsEntity,
    ]),
  ],
  controllers: [DecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}
