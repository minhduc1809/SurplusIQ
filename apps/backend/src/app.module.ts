import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StoreEntity as LegacyStoreEntity } from './modules/stores/store.entity';
import { OfferEntity as LegacyOfferEntity } from './modules/offers/offer.entity';
import { OrderEntity as LegacyOrderEntity } from './modules/orders/order.entity';
import { DecisionEntity } from './modules/decisions/decision.entity';
import { OffersService } from './modules/offers/offers.service';
import { OrdersService } from './modules/orders/orders.service';
import { ALL_ENTITIES } from './entities';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    SettingsModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'surplus_admin'),
        password: config.get<string>('POSTGRES_PASSWORD', 'surplus_secret_pass'),
        database: config.get<string>('POSTGRES_DB', 'surplusiq_db'),
        entities: [
          ...ALL_ENTITIES,
          LegacyStoreEntity,
          LegacyOfferEntity,
          LegacyOrderEntity,
          DecisionEntity,
        ],
        synchronize: false, // Turn off auto-sync, enforce migrations per DoD TASK-M0-03
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: config.get<string>('DB_MIGRATIONS_RUN') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([
      LegacyStoreEntity,
      LegacyOfferEntity,
      LegacyOrderEntity,
      DecisionEntity,
      ...ALL_ENTITIES,
    ]),
  ],
  providers: [OffersService, OrdersService],
})
export class AppModule {}
