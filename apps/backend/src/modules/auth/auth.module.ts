import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import {
  UserEntity,
  CustomerProfileEntity,
  StoreEntity,
  StoreMemberEntity,
  SubscriptionEntity,
  StoreSettingsEntity,
  OtpCodeEntity,
  RefreshTokenEntity,
  TrustedDeviceEntity,
  ConsentEntity,
} from '../../entities';
import { AUTH_CONSTANTS } from './auth.constants';
import { getJwtSecret } from '../../common/config/jwt-secret';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: { expiresIn: AUTH_CONSTANTS.JWT_ACCESS_EXPIRES_IN },
      }),
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      CustomerProfileEntity,
      StoreEntity,
      StoreMemberEntity,
      SubscriptionEntity,
      StoreSettingsEntity,
      OtpCodeEntity,
      RefreshTokenEntity,
      TrustedDeviceEntity,
      ConsentEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
