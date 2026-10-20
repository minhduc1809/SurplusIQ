import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from './password-rule';
import { ApiProperty } from '@nestjs/swagger';

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
}
