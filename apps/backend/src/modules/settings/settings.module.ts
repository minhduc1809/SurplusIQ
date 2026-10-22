import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PlatformSettingEntity,
  StoreSettingsEntity,
  StoreSettingsHistoryEntity,
} from '../../entities';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { SubscriptionEntity } from '../../entities/subscriptions/subscription.entity';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { RedisProvider } from './redis.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformSettingEntity,
      StoreSettingsEntity,
      StoreSettingsHistoryEntity,
      StoreMemberEntity,
      SubscriptionEntity,
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService, RedisProvider, StorePermissionGuard],
  exports: [SettingsService, RedisProvider],
})
export class SettingsModule {}
