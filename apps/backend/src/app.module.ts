import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StoreEntity as LegacyStoreEntity } from './modules/stores/store.entity';
import { DecisionEntity } from './modules/decisions/decision.entity';
import { ALL_ENTITIES } from './entities';
import { SettingsModule } from './modules/settings/settings.module';
import { AuthModule } from './modules/auth/auth.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AuditModule } from './modules/audit/audit.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OffersModule } from './modules/offers/offers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    SettingsModule,
    AuthModule,
    SubscriptionsModule,
    AuditModule,
    CatalogModule,
    OffersModule,
    OrdersModule,
    PaymentsModule,
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
        entities: [...ALL_ENTITIES, LegacyStoreEntity, DecisionEntity],
        synchronize: false, // Turn off auto-sync, enforce migrations per DoD TASK-M0-03
        migrations: [__dirname + '/migrations/*-*{.ts,.js}'],
        migrationsRun: config.get<string>('DB_MIGRATIONS_RUN') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([LegacyStoreEntity, DecisionEntity, ...ALL_ENTITIES]),
  ],
})
export class AppModule {}
