import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_METADATA_KEY = 'idempotent';

export interface IdempotentOptions {
  scope?: string;
  required?: boolean;
}

export const Idempotent = (options: IdempotentOptions = { required: true }) =>
  SetMetadata(IDEMPOTENT_METADATA_KEY, options);
