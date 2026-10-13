import { SetMetadata } from '@nestjs/common';
import { StoreStatus } from '../../entities/stores/store.entity';

export const STORE_STATUS_KEY = 'storeStatus';
export const RequireStoreStatus = (status: StoreStatus = StoreStatus.ACTIVE) =>
  SetMetadata(STORE_STATUS_KEY, status);
