import { IsString, Length, IsArray, IsUrl, IsOptional, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateComplaintDto {
  @ApiProperty({
    description: 'Phân loại khiếu nại (Hàng hỏng, Sai món, Thiếu hàng, Khác) (R1-061)',
    example: 'Hàng hỏng',
  })
  @IsString({ message: 'category phải là chuỗi ký tự.' })
  @Length(2, 50, { message: 'category phải từ 2 đến 50 ký tự.' })
  category: string;

  @ApiProperty({
    description: 'Nội dung mô tả chi tiết vấn đề (10 đến 500 ký tự) (R1-061)',
    example: 'Bánh bị móp méo và ôi thiu khi nhận hàng tại quầy.',
  })
  @IsString({ message: 'description phải là chuỗi ký tự.' })
  @Length(10, 500, { message: 'Mô tả khiếu nại phải từ 10 đến 500 ký tự (R1-061).' })
  description: string;

  @ApiPropertyOptional({
    description: 'Danh sách URL ảnh chụp bằng chứng (tối đa 3 ảnh) (R1-061)',
    example: ['https://example.com/evidence1.jpg'],
  })
  @IsOptional()
  @IsArray({ message: 'imageUrls phải là mảng chuỗi.' })
  @ArrayMaxSize(3, { message: 'Tối đa 3 ảnh bằng chứng cho mỗi khiếu nại (R1-061).' })
  @IsUrl({}, { each: true, message: 'Mỗi đường dẫn ảnh phải là định dạng URL hợp lệ.' })
  imageUrls?: string[];
}
