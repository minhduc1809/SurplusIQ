import { SetMetadata } from '@nestjs/common';

export enum ChannelType {
  CUSTOMER = 'CUSTOMER',
  STORE = 'STORE',
}

export const CHANNEL_KEY = 'channel';
export const Channel = (channel: ChannelType | 'CUSTOMER' | 'STORE') =>
  SetMetadata(CHANNEL_KEY, channel);
