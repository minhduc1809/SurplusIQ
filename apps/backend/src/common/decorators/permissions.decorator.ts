import { SetMetadata } from '@nestjs/common';
import { StorePermission } from '../../entities/stores/store-member.entity';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: StorePermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
