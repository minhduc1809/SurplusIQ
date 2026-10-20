import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { TrustpassInformationSource } from '../../../entities/catalog/item.entity';

/**
 * TrustPass (CM-B05): tái sử dụng ingredients/allergens hiện có trên ItemEntity,
 * chỉ bổ sung các trường minh bạch lô món. Trường không gửi lên = không thay đổi,
 * không suy ra là "không có" (BR-B05-04).
 */
export class UpdateTrustpassDto {
  @ApiPropertyOptional({ description: 'Thành phần khai báo (tái dùng trường items.ingredients)' })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiPropertyOptional({ description: 'Danh sách dị ứng khai báo (tái dùng items.allergens)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Thời điểm chuẩn bị món' })
  @IsOptional()
  @IsDateString()
  preparedAt?: string;

  @ApiPropertyOptional({
    description: 'Hạn dùng thực phẩm - khác khung nhận hàng của suất (BR-B05-05)',
  })
  @IsOptional()
  @IsDateString()
  expiryAt?: string;

  @ApiPropertyOptional({ description: 'Hướng dẫn bảo quản' })
  @IsOptional()
  @IsString()
  storageInstructions?: string;

  @ApiPropertyOptional({
    description: 'Nguồn thông tin - chỉ PLATFORM_VERIFIED khi có quy trình xác minh (BR-B05-02)',
    enum: TrustpassInformationSource,
  })
  @IsOptional()
  @IsIn(Object.values(TrustpassInformationSource))
  informationSource?: TrustpassInformationSource;
}
