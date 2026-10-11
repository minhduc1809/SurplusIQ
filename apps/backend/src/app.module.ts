import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StoreEntity } from './modules/stores/store.entity';
import { OfferEntity } from './modules/offers/offer.entity';
import { OrderEntity } from './modules/orders/order.entity';
import { DecisionEntity } from './modules/decisions/decision.entity';
import { OffersService } from './modules/offers/offers.service';
import { OrdersService } from './modules/orders/orders.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
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
        entities: [StoreEntity, OfferEntity, OrderEntity, DecisionEntity],
        synchronize: true, // Auto-schema sync in development
      }),
    }),
    TypeOrmModule.forFeature([StoreEntity, OfferEntity, OrderEntity, DecisionEntity]),
  ],
  providers: [OffersService, OrdersService],
})
export class AppModule {}
