import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorePermission, StoreMemberStatus } from '../../../entities/stores/store-member.entity';

export class UpdateStoreProfileDto {
  @ApiPropertyOptional({
    description: 'Tên cửa hàng (tối đa 150 ký tự)',
    example: 'Tiệm Bánh Mì Hoa Cúc Surplus',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ cửa hàng (tối đa 255 ký tự)',
    example: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ của quán',
    example: '0987654321',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'URL ảnh đại diện hoặc logo của cửa hàng',
    example: 'https://storage.surplusiq.vn/stores/logo1.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Khung giờ hoạt động các ngày trong tuần',
    example: { monday: { open: '07:00', close: '21:30' } },
  })
  @IsOptional()
  @IsObject()
  openHours?: Record<string, unknown>;
}

export class InviteStaffDto {
  @ApiProperty({
    description: 'Email nhân viên được mời tham gia quản lý quán',
    example: 'staff.counter@surplusiq.vn',
  })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ.' })
  email: string;

  @ApiProperty({
    description: 'Quyền hạn của nhân viên (MANAGER hoặc COUNTER) (R2-076)',
    enum: StorePermission,
    example: StorePermission.COUNTER,
  })
  @IsNotEmpty({ message: 'Quyền hạn không được để trống.' })
  @IsEnum(StorePermission, {
    message: 'Quyền hạn chỉ có thể là MANAGER hoặc COUNTER.',
  })
  permission: StorePermission;
}

export class UpdateStaffDto {
  @ApiProperty({
    description: 'Cập nhật quyền hạn nhân viên (MANAGER hoặc COUNTER)',
    enum: StorePermission,
    example: StorePermission.MANAGER,
  })
  @IsNotEmpty({ message: 'Quyền hạn không được để trống.' })
  @IsEnum(StorePermission, {
    message: 'Quyền hạn chỉ có thể là MANAGER hoặc COUNTER.',
  })
  permission: StorePermission;

  @ApiPropertyOptional({
    description: 'Cập nhật trạng thái nhân viên (ACTIVE hoặc LOCKED)',
    enum: StoreMemberStatus,
    example: StoreMemberStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StoreMemberStatus)
  status?: StoreMemberStatus;
}

export class AcceptStaffInviteDto {
  @ApiProperty({
    description: 'Token mã hóa từ thư mời tham gia cửa hàng',
    example: 'inv_abc123xyz789',
  })
  @IsNotEmpty({ message: 'Token không được để trống.' })
  @IsString()
  token: string;
}

export class StoreReportsQueryDto {
  @ApiPropertyOptional({
    description: 'Ngày bắt đầu thống kê (định dạng YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc thống kê (định dạng YYYY-MM-DD)',
    example: '2026-10-14',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CustomerNoteDto {
  @ApiProperty({
    description: 'Nội dung ghi chú nội bộ về khách hàng (tối đa 200 ký tự) (R2-085)',
    example: 'Khách hay đến lấy hàng đúng giờ, thích bánh ít ngọt.',
  })
  @IsNotEmpty({ message: 'Ghi chú không được để trống.' })
  @IsString()
  @MaxLength(200, { message: 'Ghi chú nội bộ tối đa 200 ký tự.' })
  note: string;
}

export class VirtualClockDto {
  @ApiProperty({
    description: 'Bật/tắt chế độ demo tua nhanh thời gian (R2-065)',
    example: true,
  })
  @IsNotEmpty()
  enabled: boolean;
}

export class ExportDataQueryDto {
  @ApiPropertyOptional({
    description: 'Từ ngày (định dạng YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Đến ngày (định dạng YYYY-MM-DD)',
    example: '2026-10-14',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
