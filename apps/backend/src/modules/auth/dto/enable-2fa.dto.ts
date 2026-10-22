import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2faDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enable?: boolean;

  @ApiProperty({
    example: 'MatKhau123',
    required: false,
    description: 'Mật khẩu hiện tại để xác nhận thay đổi',
  })
  @IsOptional()
  @IsString()
  password?: string;
}
