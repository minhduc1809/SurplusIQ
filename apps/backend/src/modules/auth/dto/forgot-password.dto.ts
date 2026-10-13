import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: '0901234567 hoặc email@example.com' })
  @IsNotEmpty()
  @IsString()
  target: string;
}
