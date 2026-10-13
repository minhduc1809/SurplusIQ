import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
  MaxLength,
  Length,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({
    example: 'Bánh Mì Hoa Cúc Pháp',
    description: 'Tên món (2-80 ký tự, duy nhất trong cửa hàng)',
  })
  @IsString()
  @Length(2, 80, { message: 'Tên món phải từ 2 đến 80 ký tự' })
  name: string;

  @ApiProperty({
    example: 'Bánh ngọt',
    description: 'Danh mục món ăn',
  })
  @IsString()
  @IsNotEmpty({ message: 'Danh mục món không được để trống' })
  @MaxLength(100)
  category: string;

  @ApiProperty({
    example: 85000,
    description: 'Giá gốc niêm yết (VND, 1.000 - 5.000.000, bội số 500)',
  })
  @IsInt({ message: 'Giá gốc phải là số nguyên' })
  @Min(1000, { message: 'Giá gốc tối thiểu là 1.000 VND' })
  @Max(5000000, { message: 'Giá gốc tối đa là 5.000.000 VND' })
  originalPrice: number;

  @ApiPropertyOptional({
    example: 35000,
    description: 'Giá vốn ước tính (VND, dùng để đối chiếu giá sàn)',
  })
  @IsOptional()
  @IsInt({ message: 'Giá vốn phải là số nguyên' })
  @Min(0, { message: 'Giá vốn không được âm' })
  costPrice?: number;

  @ApiProperty({
    example: 24,
    description: 'Hạn dùng chuẩn kể từ khi ra lò (số giờ, 1 - 168)',
  })
  @IsInt({ message: 'Hạn dùng chuẩn phải là số giờ nguyên' })
  @Min(1, { message: 'Hạn dùng tối thiểu 1 giờ' })
  @Max(168, { message: 'Hạn dùng tối đa 168 giờ (7 ngày)' })
  standardShelfLifeHours: number;

  @ApiPropertyOptional({
    example: 'Bột mì nguyên cám, bơ Pháp, trứng gà tươi, đường mía',
    description: 'Thành phần nguyên liệu',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  ingredients?: string;

  @ApiPropertyOptional({
    example: ['Gluten', 'Trứng', 'Sữa (Lactose)'],
    description: 'Danh sách các chất gây dị ứng có trong món ăn',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({
    example: 300,
    description: 'Trọng lượng ước tính một suất (gram, 10 - 5.000g)',
  })
  @IsOptional()
  @IsInt()
  @Min(10, { message: 'Trọng lượng tối thiểu là 10 gram' })
  @Max(5000, { message: 'Trọng lượng tối đa là 5.000 gram' })
  weightGrams?: number;

  @ApiPropertyOptional({
    example: 'https://cdn.surplusiq.vn/items/banh-mi-hoa-cuc.jpg',
    description: 'Đường dẫn ảnh đại diện món ăn',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 'Bánh mềm xốp, thơm mùi bơ và hoa cúc truyền thống Pháp.',
    description: 'Mô tả chi tiết món ăn',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: { calories: 380, protein: '8g', carb: '52g', fat: '14g' },
    description: 'Thông tin dinh dưỡng ước tính (gắn nhãn Ước tính)',
  })
  @IsOptional()
  @IsObject()
  nutritionEstimate?: Record<string, unknown>;
}
