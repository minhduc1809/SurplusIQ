import { IsNotEmpty, IsString, Length } from 'class-validator';
import { IsStrongPassword } from './password-rule';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: '0901234567 hoặc email@example.com' })
  @IsNotEmpty()
  @IsString()
  target: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otpCode: string;

  @ApiProperty({ example: 'NewPass456@', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @IsStrongPassword()
  newPassword: string;
}
