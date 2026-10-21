import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_DELETE_KEY = 'allowPendingDelete';
/** Cho phép phiên của tài khoản đang chờ xóa (PENDING_DELETE) gọi route này: xem trạng thái, hủy xóa (BUG-017). */
export const AllowPendingDelete = () => SetMetadata(ALLOW_PENDING_DELETE_KEY, true);
