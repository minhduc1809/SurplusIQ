import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VerifyPickupDto {
  @ApiPropertyOptional({
    description: 'Chuỗi Base64URL mã QR token HMAC-SHA256 ký số (không chứa PII) (R1-057, BR-022)',
    example: 'eyJqdGkiOiJ0b2tlbi0xMjMiLCJvcmRlcklkIjoib3JkZXItNDU2In0...',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    description: 'Mã PIN dự phòng 6 ký tự không gây nhầm lẫn (BR-022, R1-057, R2-052)',
    example: '2H7K9P',
  })
  @IsOptional()
  @IsString()
  backupCode?: string;
}
