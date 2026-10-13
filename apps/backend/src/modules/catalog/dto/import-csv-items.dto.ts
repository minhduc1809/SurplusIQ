import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateItemDto } from './create-item.dto';

export class ImportCsvItemsDto {
  @ApiProperty({
    type: [CreateItemDto],
    description:
      'Danh sách các món ăn cần nhập hàng loạt từ CSV (tối đa 100 dòng gói Cơ bản, 500 dòng gói Pro)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Tệp nhập ít nhất phải có 1 dòng dữ liệu' })
  @ValidateNested({ each: true })
  @Type(() => CreateItemDto)
  items: CreateItemDto[];
}
