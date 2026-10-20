import {
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompareSimulationsDto {
  @ApiProperty({
    description: 'Danh sách ID các lần mô phỏng cần so sánh (tối thiểu 2 lần) (R2-105)',
    example: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
    isArray: true,
  })
  @IsArray({ message: 'simulationIds phải là một mảng.' })
  @IsNotEmpty({ message: 'Danh sách simulationIds không được để trống.' })
  simulationIds: string[];
}

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

export class CreateSpecialEventDto {
  @ApiProperty({
    description: 'Ngày diễn ra sự kiện (YYYY-MM-DD) (R2-040)',
    example: '2026-10-20',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Loại sự kiện (ví dụ: LỄ HỘI, NGÀY MƯA, KHUYẾN MÃI) (R2-040)',
    example: 'LỄ HỘI',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  type: string;

  @ApiProperty({
    description: 'Hệ số tác động dự báo (ví dụ 1.25 = tăng 25%, 0.8 = giảm 20%)',
    example: 1.25,
  })
  @IsNotEmpty()
  impactFactor: number;
}

export class SimulatePolicyDto {
  @ApiProperty({
    description: 'Khoảng thời gian mô phỏng dữ liệu quá khứ (14 đến 90 ngày) (R2-099, R2-104..105)',
    example: 30,
    minimum: 14,
    maximum: 90,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(14)
  days: number;

  @ApiPropertyOptional({
    description: 'Tỷ lệ giảm giá giả định (0.2 đến 0.7)',
    example: 0.5,
  })
  @IsOptional()
  discountRatio?: number;

  @ApiPropertyOptional({
    description: 'Bật định giá động tự động trong mô phỏng',
    example: true,
  })
  @IsOptional()
  dynamicPricing?: boolean;
}

export class QueryAnomalyDto {
  @ApiPropertyOptional({
    description: 'Độ nhạy phát hiện bất thường (LOW, MEDIUM, HIGH) (R2-112)',
    example: 'MEDIUM',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
  })
  @IsOptional()
  @IsString()
  sensitivity?: 'LOW' | 'MEDIUM' | 'HIGH';
}
