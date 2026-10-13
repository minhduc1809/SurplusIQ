import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PlatformSettingEntity,
  StoreSettingsEntity,
  StoreSettingsHistoryEntity,
} from '../../entities';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { RedisProvider } from './redis.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformSettingEntity,
      StoreSettingsEntity,
      StoreSettingsHistoryEntity,
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService, RedisProvider],
  exports: [SettingsService, RedisProvider],
})
export class SettingsModule {}
