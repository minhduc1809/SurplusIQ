import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum QueryItemStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  ALL = 'ALL',
}

export class QueryItemsDto {
  @ApiPropertyOptional({ default: 1, description: 'Số trang (bắt đầu từ 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Số lượng mục trên mỗi trang (mặc định 20)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên món (không phân biệt dấu/hoa thường)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo danh mục món ăn' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: QueryItemStatus,
    default: QueryItemStatus.ACTIVE,
    description: 'Lọc theo trạng thái (mặc định chỉ hiển thị ACTIVE, ẩn món ARCHIVED theo R2-017)',
  })
  @IsOptional()
  @IsEnum(QueryItemStatus)
  status?: QueryItemStatus = QueryItemStatus.ACTIVE;

  @ApiPropertyOptional({
    enum: ['name', 'createdAt', 'originalPrice'],
    default: 'createdAt',
    description: 'Trường sắp xếp',
  })
  @IsOptional()
  @IsIn(['name', 'createdAt', 'originalPrice'])
  sortBy?: 'name' | 'createdAt' | 'originalPrice' = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    description: 'Thứ tự sắp xếp',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
