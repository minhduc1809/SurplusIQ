import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Số sao đánh giá (1 đến 5 sao) (R1-064)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt({ message: 'Số sao phải là số nguyên từ 1 đến 5.' })
  @Min(1, { message: 'Đánh giá tối thiểu là 1 sao.' })
  @Max(5, { message: 'Đánh giá tối đa là 5 sao.' })
  rating: number;

  @ApiPropertyOptional({
    description: 'Nội dung nhận xét đánh giá (tối đa 300 ký tự) (R1-064)',
    example: 'Bánh rất ngon và còn nóng hổi, quán phục vụ chu đáo!',
  })
  @IsOptional()
  @IsString({ message: 'Nhận xét phải là chuỗi ký tự.' })
  @MaxLength(300, { message: 'Nhận xét không được vượt quá 300 ký tự (R1-064).' })
  comment?: string;
}
