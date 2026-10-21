import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsStrongPassword } from './password-rule';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123@' })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPass456@', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @IsStrongPassword()
  newPassword: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Mã OTP gửi về email, bắt buộc với khách hàng đã có email',
  })
  @IsOptional()
  @IsString()
  otpCode?: string;
}
