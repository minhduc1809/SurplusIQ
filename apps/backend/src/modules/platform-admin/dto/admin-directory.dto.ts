import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { StoreStatus, UserRole, UserStatus } from '../../../entities';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateAdminUserDto {
  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(UserRole)
  role?: UserRole;

  @ValidateIf((_, value) => value !== undefined)
  @IsIn([UserStatus.ACTIVE, UserStatus.LOCKED])
  status?: UserStatus.ACTIVE | UserStatus.LOCKED;
}

export class CreateAdminUserDto extends UpdateAdminUserDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ValidateIf(() => true)
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateAdminStoreDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  logoUrl?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(StoreStatus)
  status?: StoreStatus;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;
}

export class CreateAdminStoreDto extends UpdateAdminStoreDto {
  @IsUUID()
  ownerUserId: string;

  @ValidateIf(() => true)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ValidateIf(() => true)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ValidateIf(() => true)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;
}
