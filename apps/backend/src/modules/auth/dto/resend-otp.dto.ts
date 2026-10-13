import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OtpPurpose } from '../../../entities/auth/otp-code.entity';

export class ResendOtpDto {
  @ApiProperty({ example: '0901234567' })
  @IsNotEmpty()
  @IsString()
  target: string;

  @ApiProperty({ enum: OtpPurpose, default: OtpPurpose.VERIFY })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
