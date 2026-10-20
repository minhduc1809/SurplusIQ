import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIsI...', description: 'Google ID token' })
  @IsNotEmpty({ message: 'idToken không được để trống' })
  @IsString()
  idToken: string;

  @ApiProperty({ example: 'device-uuid-1234' })
  @IsNotEmpty({ message: 'Mã định danh thiết bị không được để trống' })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({ example: 'Samsung Galaxy S23' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
