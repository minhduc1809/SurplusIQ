import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RescueLabObjective } from '../../../entities/rescue-lab/rescue-lab-scenario.entity';

/** Tham số một phiên bản kịch bản (luồng chính bước 2). Dùng chung cho tạo mới và tạo phiên bản mới. */
export class RescueLabVersionParamsDto {
  @ApiProperty({ example: '2026-09-01', description: 'Ngày bắt đầu kỳ dữ liệu nền (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'dateRangeStart phải là ngày YYYY-MM-DD.' })
  dateRangeStart: string;

  @ApiProperty({
    example: '2026-09-30',
    description: 'Ngày kết thúc kỳ dữ liệu nền (tối đa 90 ngày, không ở tương lai)',
  })
  @IsDateString({}, { message: 'dateRangeEnd phải là ngày YYYY-MM-DD.' })
  dateRangeEnd: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Giới hạn theo món (UUID). Bỏ trống cùng categories = tất cả món.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true, message: 'itemIds phải là UUID.' })
  itemIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Bánh mì'],
    description: 'Giới hạn theo nhóm món',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  categories?: string[];

  @ApiProperty({
    example: 0.5,
    minimum: 0.05,
    maximum: 0.7,
    description: 'Mức giảm so với giá gốc giả định',
  })
  @IsNumber({}, { message: 'discountRatio phải là số.' })
  @Min(0.05)
  @Max(0.7)
  discountRatio: number;

  @ApiPropertyOptional({
    example: 1.5,
    minimum: 0,
    maximum: 5,
    description: 'Giả định độ co giãn cầu theo giá (mặc định 1.5)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  priceElasticity?: number;

  @ApiPropertyOptional({
    example: 0,
    minimum: -90,
    maximum: 200,
    description: 'Thay đổi số suất đưa lên cứu so với kỳ nền (%)',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(200)
  volumeChangePct?: number;

  @ApiPropertyOptional({ example: 'Giảm sâu sau 19h', description: 'Ghi chú giả định' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateRescueLabScenarioDto extends RescueLabVersionParamsDto {
  @ApiProperty({ example: 'Giảm tồn bánh mì tối' })
  @IsString()
  @IsNotEmpty({ message: 'Tên kịch bản không được để trống.' })
  @MaxLength(150)
  title: string;

  @ApiProperty({ enum: RescueLabObjective })
  @IsEnum(RescueLabObjective, { message: 'Mục tiêu không hợp lệ.' })
  objective: RescueLabObjective;
}

export class ApplyRescueLabVersionDto {
  @ApiProperty({
    example: '2026-10-20',
    description: 'Bắt đầu cửa sổ quan sát (sau kỳ dữ liệu nền)',
  })
  @IsDateString()
  observationWindowStart: string;

  @ApiProperty({ example: '2026-11-02', description: 'Kết thúc cửa sổ quan sát (tối đa 90 ngày)' })
  @IsDateString()
  observationWindowEnd: string;

  @ApiProperty({
    example: 'Đã giảm 50% bánh mì sau 19h qua đề xuất giá',
    description: 'Mô tả thay đổi thực tế đã làm',
  })
  @IsString()
  @IsNotEmpty({ message: 'Hãy mô tả thay đổi đã thực hiện ngoài thực tế.' })
  @MaxLength(500)
  scopeNote: string;
}

export class CompareRescueLabVersionsDto {
  @ApiProperty({ type: [String], description: '2-5 phiên bản kịch bản cần so sánh' })
  @IsArray()
  @ArrayMinSize(2, { message: 'Chọn ít nhất 2 phiên bản để so sánh.' })
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  versionIds: string[];
}
