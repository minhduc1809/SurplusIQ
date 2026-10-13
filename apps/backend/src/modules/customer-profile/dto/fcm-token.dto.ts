import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'Định danh duy nhất của thiết bị di động (deviceId)',
    example: 'pixel-7-device-xyz-123',
  })
  @IsNotEmpty({ message: 'Device ID không được để trống.' })
  @IsString({ message: 'Device ID phải là chuỗi ký tự.' })
  deviceId: string;

  @ApiProperty({
    description: 'FCM Device Token do Firebase SDK cung cấp',
    example: 'fcm_token_sample_abc123...',
  })
  @IsNotEmpty({ message: 'FCM Token không được để trống.' })
  @IsString({ message: 'FCM Token phải là chuỗi ký tự.' })
  token: string;

  @ApiPropertyOptional({
    description: 'Bật nhận thông báo đẩy trên thiết bị này',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
