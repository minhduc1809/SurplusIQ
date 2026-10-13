import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDietaryProfileDto {
  @ApiProperty({
    description:
      'Danh sách các chất/nhóm dị ứng (ví dụ: gluten, sữa, trứng, hạt, hải sản) (R1-016)',
    example: ['gluten', 'hải sản'],
  })
  @IsArray({ message: 'allergens phải là mảng chuỗi.' })
  @IsString({ each: true, message: 'Từng phần tử allergens phải là chuỗi.' })
  allergens: string[];

  @ApiProperty({
    description: 'Danh sách các món/thực phẩm không ăn (ví dụ: thịt bò, hành tây)',
    example: ['hành tây'],
  })
  @IsArray({ message: 'excludedItems phải là mảng chuỗi.' })
  @IsString({ each: true, message: 'Từng phần tử excludedItems phải là chuỗi.' })
  excludedItems: string[];
}
