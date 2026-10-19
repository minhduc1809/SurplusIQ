import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_CONSTANTS } from '../auth.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserStatus } from '../../../entities';

export interface JwtPayload {
  sub: string;
  role: string;
  email?: string;
  phone?: string;
  storeId?: string;
  deviceId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: AUTH_CONSTANTS.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub || !payload.role) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE || user.role !== payload.role) {
      throw new UnauthorizedException(
        'Tài khoản không còn hoạt động hoặc quyền truy cập đã thay đổi',
      );
    }
    return {
      userId: payload.sub,
      role: user.role,
      email: user.email,
      phone: user.phone,
      storeId: payload.storeId,
      deviceId: payload.deviceId,
    };
  }
}
