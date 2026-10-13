import { IsNotEmpty, IsString, Length, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSavedFilterDto {
  @ApiProperty({
    description: 'Tên bộ lọc tìm kiếm (1-30 ký tự, không trùng nhau) (R1-033)',
    example: 'Bánh ngọt gần nhà',
  })
  @IsNotEmpty({ message: 'Tên bộ lọc không được để trống.' })
  @IsString({ message: 'Tên bộ lọc phải là chuỗi ký tự.' })
  @Length(1, 30, { message: 'Tên bộ lọc phải từ 1 đến 30 ký tự.' })
  name: string;

  @ApiProperty({
    description: 'Tổ hợp giá trị bộ lọc tìm kiếm đã lưu',
    example: { category: 'BAKERY', minDiscount: 50, maxPrice: 60000 },
  })
  @IsNotEmpty({ message: 'Giá trị bộ lọc không được để trống.' })
  @IsObject({ message: 'Giá trị bộ lọc phải là đối tượng JSON.' })
  criteria: Record<string, unknown>;
}
