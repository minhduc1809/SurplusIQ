import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConsentType } from '../../../entities/auth/consent.entity';

/** Ghi nhận chấp thuận: validate đầu vào để body rỗng trả 400 thay vì 500 (BUG-015, R1-012). */
export class RecordConsentDto {
  @ApiProperty({ enum: ConsentType })
  @IsEnum(ConsentType, { message: 'Loại chấp thuận không hợp lệ.' })
  type: ConsentType;

  @ApiProperty()
  @IsBoolean({ message: 'granted phải là true/false.' })
  granted: boolean;

  @ApiPropertyOptional({ example: '1.0' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;
}
