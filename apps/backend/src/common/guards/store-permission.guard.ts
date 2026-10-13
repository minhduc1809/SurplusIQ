import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import {
  StoreMemberEntity,
  StoreMemberStatus,
  StorePermission,
} from '../../entities/stores/store-member.entity';

@Injectable()
export class StorePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(StoreMemberEntity)
    private readonly storeMemberRepo: Repository<StoreMemberEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<StorePermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_PERMISSION',
        message: 'Yêu cầu đăng nhập xác định danh tính trước khi kiểm tra quyền',
      });
    }

    // store_id LUÔN lấy từ token, không nhận từ body/param để chống IDOR và rò rỉ dữ liệu (12.27.2)
    const storeId = user.storeId;
    if (!storeId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_PERMISSION',
        message: 'Tài khoản không được liên kết với bất kỳ cửa hàng nào',
      });
    }

    const member = await this.storeMemberRepo.findOne({
      where: {
        storeId,
        userId: user.userId,
      },
    });

    if (!member) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_PERMISSION',
        message: 'Bạn không phải là thành viên thuộc cửa hàng này',
      });
    }

    if (member.status !== StoreMemberStatus.ACTIVE) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_PERMISSION',
        message: `Tài khoản thành viên cửa hàng đang ở trạng thái [${member.status}], không có quyền thao tác`,
      });
    }

    // Gắn thông tin member vào request để các service/controller phía sau tái sử dụng
    request.storeMember = member;

    // Chủ cửa hàng (OWNER) có toàn quyền tối cao trong cửa hàng
    if (member.permission === StorePermission.OWNER) {
      return true;
    }

    // Quản lý (MANAGER) có quyền của MANAGER và COUNTER
    if (member.permission === StorePermission.MANAGER) {
      if (
        requiredPermissions.includes(StorePermission.MANAGER) ||
        requiredPermissions.includes(StorePermission.COUNTER)
      ) {
        return true;
      }
    }

    // Nhân viên quầy (COUNTER) chỉ có quyền COUNTER
    if (member.permission === StorePermission.COUNTER) {
      if (requiredPermissions.includes(StorePermission.COUNTER)) {
        return true;
      }
    }

    throw new ForbiddenException({
      code: 'FORBIDDEN_PERMISSION',
      message: `Thao tác yêu cầu quyền [${requiredPermissions.join(', ')}], vai trò của bạn tại quán là [${member.permission}]`,
    });
  }
}
