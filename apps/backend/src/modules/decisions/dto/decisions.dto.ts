import {
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OverrideForecastDto {
  @ApiProperty({
    description: 'Số lượng thực tế chủ quán quyết định sản xuất/nhập hàng',
    example: 35,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Số lượng điều chỉnh không được để trống.' })
  @IsInt({ message: 'Số lượng điều chỉnh phải là số nguyên.' })
  @Min(1, { message: 'Số lượng điều chỉnh tối thiểu là 1.' })
  chosenQuantity: number;

  @ApiPropertyOptional({
    description: 'Lý do điều chỉnh (sự kiện, thời tiết, tiệc công ty...)',
    example: 'Có đoàn khách 20 người đặt trước bữa sáng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  overrideReason?: string;
}

export class LogDailyActualDto {
  @ApiProperty({
    description: 'ID của sản phẩm trong danh mục',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsNotEmpty({ message: 'itemId không được để trống.' })
  @IsUUID('4', { message: 'itemId phải là định dạng UUID hợp lệ.' })
  itemId: string;

  @ApiProperty({
    description: 'Ngày ghi nhận số liệu thực tế (định dạng YYYY-MM-DD)',
    example: '2026-10-14',
  })
  @IsNotEmpty({ message: 'Ngày ghi nhận không được để trống.' })
  @IsDateString({}, { message: 'Định dạng ngày phải là YYYY-MM-DD.' })
  date: string;

  @ApiProperty({
    description: 'Số lượng sản xuất hoặc nhập vào đầu ngày',
    example: 50,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  produced: number;

  @ApiProperty({
    description: 'Số lượng bán trực tiếp tại quầy offline',
    example: 38,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  soldOffline: number;

  @ApiProperty({
    description: 'Số lượng bán qua ứng dụng SurplusIQ',
    example: 10,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  soldApp: number;

  @ApiPropertyOptional({
    description: 'Thời điểm hết hàng sớm (nếu có)',
    example: '2026-10-14T17:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  stockoutAt?: string;
}

export class QueryForecastDto {
  @ApiPropertyOptional({
    description: 'Ngày dự báo kế hoạch sản xuất (mặc định là ngày mai)',
    example: '2026-10-15',
  })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
