import { IsString, Length, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSavedPlaceDto {
  @ApiProperty({
    description: 'Tên nhãn địa điểm (ví dụ: Nhà riêng, Công ty) (1 đến 30 ký tự) (R1-015)',
    example: 'Nhà riêng',
  })
  @IsString()
  @Length(1, 30, { message: 'Tên nhãn địa điểm phải từ 1 đến 30 ký tự.' })
  label: string;

  @ApiProperty({
    description: 'Vĩ độ vị trí ghim (-90 đến 90)',
    example: 10.7769,
  })
  @IsNumber({}, { message: 'latitude phải là số thực.' })
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Kinh độ vị trí ghim (-180 đến 180)',
    example: 106.7009,
  })
  @IsNumber({}, { message: 'longitude phải là số thực.' })
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Bán kính riêng cho địa điểm này tính bằng km (0.5 đến 10 km)',
    example: 2.0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'radiusKm phải là số thực.' })
  @Min(0.5)
  @Max(10)
  radiusKm?: number;
}
