import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../../entities/orders/order.entity';

export class QueryOrdersDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Lọc theo trạng thái đơn hàng',
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ.' })
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo ngày cụ thể (YYYY-MM-DD)',
    example: '2026-10-13',
  })
  @IsOptional()
  @IsDateString({}, { message: 'date phải có định dạng YYYY-MM-DD hợp lệ.' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Từ ngày (YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'fromDate phải có định dạng YYYY-MM-DD hợp lệ.' })
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Đến ngày (YYYY-MM-DD)',
    example: '2026-10-13',
  })
  @IsOptional()
  @IsDateString({}, { message: 'toDate phải có định dạng YYYY-MM-DD hợp lệ.' })
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên.' })
  @Min(1, { message: 'page tối thiểu là 1.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng phần tử mỗi trang (tối đa 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên.' })
  @Min(1, { message: 'limit tối thiểu là 1.' })
  @Max(100, { message: 'limit tối đa là 100.' })
  limit?: number = 20;
}
