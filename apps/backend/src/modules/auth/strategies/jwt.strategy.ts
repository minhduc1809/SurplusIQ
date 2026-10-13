import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_CONSTANTS } from '../auth.constants';

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
  constructor() {
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
    return {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
      phone: payload.phone,
      storeId: payload.storeId,
      deviceId: payload.deviceId,
    };
  }
}
