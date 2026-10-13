import { IsNotEmpty, IsString, Length, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OtpPurpose } from '../../../entities/auth/otp-code.entity';

export class VerifyOtpDto {
  @ApiProperty({ example: '0901234567' })
  @IsNotEmpty()
  @IsString()
  target: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  code: string;

  @ApiProperty({ enum: OtpPurpose, default: OtpPurpose.VERIFY })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
