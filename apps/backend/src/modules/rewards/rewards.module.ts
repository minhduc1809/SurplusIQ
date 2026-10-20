import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardAccountEntity } from '../../entities/rewards/reward-account.entity';
import { RewardLedgerEntryEntity } from '../../entities/rewards/reward-ledger-entry.entity';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([RewardAccountEntity, RewardLedgerEntryEntity]), AuditModule],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
