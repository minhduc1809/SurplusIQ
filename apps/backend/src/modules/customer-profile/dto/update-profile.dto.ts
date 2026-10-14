import { IsOptional, IsString, Length, IsUrl, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({
    description: 'Họ và tên khách hàng (2 đến 60 ký tự) (R1-006)',
    example: 'Nguyễn Văn A',
  })
  @IsOptional()
  @IsString({ message: 'Họ tên phải là chuỗi ký tự.' })
  @Length(2, 60, { message: 'Họ tên phải từ 2 đến 60 ký tự.' })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Đường dẫn ảnh đại diện (URL)',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl phải là định dạng URL hợp lệ.' })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Bán kính tìm kiếm deal mặc định của khách hàng (0.5 đến 10 km) (R1-009)',
    example: 3.5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'searchRadiusKm phải là số thực.' })
  @Min(0.5, { message: 'Bán kính tối thiểu là 0.5 km.' })
  @Max(10, { message: 'Bán kính tối đa là 10 km.' })
  searchRadiusKm?: number;

  @ApiPropertyOptional({
    description: 'Vĩ độ vị trí hiện tại của khách hàng',
    example: 10.7769,
  })
  @IsOptional()
  @IsNumber({}, { message: 'lastLat phải là số thực.' })
  lastLat?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ vị trí hiện tại của khách hàng',
    example: 106.7009,
  })
  @IsOptional()
  @IsNumber({}, { message: 'lastLng phải là số thực.' })
  lastLng?: number;
}
