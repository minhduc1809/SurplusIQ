import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BasketSubstitutesQueryDto {
  @ApiProperty({ description: 'ID của cửa hàng' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ description: 'ID của món hiện tại cần tìm món thay thế' })
  @IsString()
  @IsNotEmpty()
  currentOfferId: string;

  @ApiPropertyOptional({ description: 'Ngân sách tối đa cho món thay thế' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPrice?: number;
}

export class BasketCheckoutItemDto {
  @ApiProperty({ description: 'ID suất cứu món' })
  @IsString()
  @IsNotEmpty()
  offerId: string;

  @ApiProperty({ description: 'Số lượng đặt', default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class BasketCheckoutDto {
  @ApiProperty({ description: 'ID của cửa hàng trong giỏ' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ description: 'Danh sách các món trong giỏ', type: [BasketCheckoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasketCheckoutItemDto)
  items: BasketCheckoutItemDto[];

  @ApiPropertyOptional({ description: 'Mã ưu đãi áp dụng nếu có' })
  @IsOptional()
  @IsString()
  promotionId?: string;

  @ApiPropertyOptional({ description: 'Phương thức thanh toán', default: 'COD' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
