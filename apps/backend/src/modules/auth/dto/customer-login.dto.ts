import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerLoginDto {
  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại hoặc Email' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'MatKhau123@' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'device-uuid-1234' })
  @IsNotEmpty({ message: 'Mã định danh thiết bị không được để trống' })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({ example: 'Samsung Galaxy S23' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
