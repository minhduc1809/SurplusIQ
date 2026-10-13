import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHANNEL_KEY, ChannelType } from '../decorators/channel.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@Injectable()
export class ChannelGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const channel = this.reflector.getAllAndOverride<ChannelType | string>(CHANNEL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!channel) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException({
        code: 'AUTH_WRONG_CHANNEL',
        message: 'Kênh truy cập không xác định danh tính',
      });
    }

    if (channel === ChannelType.CUSTOMER || channel === 'CUSTOMER') {
      if (user.role === UserRole.STORE_USER) {
        throw new ForbiddenException({
          code: 'AUTH_WRONG_CHANNEL',
          message: 'Tài khoản đối tác cửa hàng không được truy cập kênh khách hàng (Quy tắc 9.1)',
        });
      }
      if (user.role !== UserRole.CUSTOMER && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException({
          code: 'AUTH_WRONG_CHANNEL',
          message: 'Kênh này chỉ dành riêng cho ứng dụng khách hàng',
        });
      }
    }

    if (channel === ChannelType.STORE || channel === 'STORE') {
      if (user.role === UserRole.CUSTOMER) {
        throw new ForbiddenException({
          code: 'AUTH_WRONG_CHANNEL',
          message:
            'Tài khoản khách hàng không được phép truy cập cổng quản trị đối tác cửa hàng (Quy tắc 9.1)',
        });
      }
      if (user.role !== UserRole.STORE_USER && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException({
          code: 'AUTH_WRONG_CHANNEL',
          message: 'Kênh này chỉ dành riêng cho cổng quản trị đối tác cửa hàng',
        });
      }
    }

    return true;
  }
}
