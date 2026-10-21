import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_PENDING_DELETE_KEY } from '../decorators/allow-pending-delete.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info?: any, context?: ExecutionContext) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          code: 'AUTH_UNAUTHORIZED',
          message: 'Vui lòng đăng nhập để tiếp tục',
        })
      );
    }
    // Phiên của tài khoản chờ xóa chỉ được dùng các route đánh dấu @AllowPendingDelete (BUG-017, R1-019).
    if (
      user.accountStatus === 'PENDING_DELETE' &&
      !(
        context &&
        this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_DELETE_KEY, [
          context.getHandler(),
          context.getClass(),
        ])
      )
    ) {
      throw new ForbiddenException({
        code: 'ACCOUNT_PENDING_DELETE',
        message: 'Tài khoản đang chờ xóa. Hãy hủy yêu cầu xóa để tiếp tục sử dụng.',
      });
    }
    return user;
  }
}
