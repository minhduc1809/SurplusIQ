import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsOptional,
  MaxLength,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PromotionType,
  PromotionTarget,
  PromotionStatus,
} from '../../../entities/marketing/promotion.entity';
import { CampaignStatus } from '../../../entities/marketing/campaign.entity';

export class CreatePromotionDto {
  @ApiProperty({
    description: 'Tên chương trình ưu đãi',
    example: 'Giảm 20% khung giờ vàng cho khách thân thiết',
  })
  @IsNotEmpty({ message: 'Tên ưu đãi không được để trống.' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Loại ưu đãi (PERCENT hoặc FIXED)',
    enum: PromotionType,
    example: PromotionType.PERCENT,
  })
  @IsNotEmpty()
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({
    description: 'Giá trị ưu đãi (% hoặc số tiền VND)',
    example: 20,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  value: number;

  @ApiPropertyOptional({
    description: 'Đối tượng áp dụng (ALL, FAVORITES, LOYAL, AT_RISK)',
    enum: PromotionTarget,
    example: PromotionTarget.LOYAL,
  })
  @IsOptional()
  @IsEnum(PromotionTarget)
  target?: PromotionTarget;

  @ApiProperty({
    description: 'Số lượt sử dụng tối đa',
    example: 50,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  maxUses: number;

  @ApiProperty({
    description: 'Thời điểm bắt đầu áp dụng (ISO Date)',
    example: '2026-10-15T00:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startAt: string;

  @ApiProperty({
    description: 'Thời điểm kết thúc ưu đãi (ISO Date)',
    example: '2026-10-31T23:59:59Z',
  })
  @IsNotEmpty()
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({
    description: 'Giá trị đơn hàng tối thiểu để áp dụng (VND)',
    example: 50000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;
}

export class UpdatePromotionStatusDto {
  @ApiProperty({
    description: 'Trạng thái ưu đãi mới (ACTIVE, PAUSED, ENDED)',
    enum: PromotionStatus,
    example: PromotionStatus.ACTIVE,
  })
  @IsNotEmpty()
  @IsEnum(PromotionStatus)
  status: PromotionStatus;
}

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Tiêu đề chiến dịch thông báo push (tối đa 150 ký tự)',
    example: 'Bánh tươi hôm nay giảm sâu - Đặt ngay kẻo lỡ!',
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống.' })
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: 'Nội dung thông báo (tối đa 500 ký tự)',
    example: 'Tiệm vừa mở bán thêm 10 phần bánh Croissant và Baguette tươi ngon với giá chỉ 25k.',
  })
  @IsNotEmpty({ message: 'Nội dung không được để trống.' })
  @IsString()
  @MaxLength(500)
  content: string;

  @ApiProperty({
    description: 'Phân khúc khách hàng mục tiêu',
    example: 'LOYAL',
  })
  @IsNotEmpty()
  @IsString()
  target: string;

  @ApiProperty({
    description:
      'Thời gian lên lịch gửi thông báo (tuân thủ giới nghiêm 22:00 - 07:00 theo BR-086)',
    example: '2026-10-15T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;
}

export class SurpriseBagItemDto {
  @ApiProperty({
    description: 'ID của sản phẩm trong túi bất ngờ',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsNotEmpty()
  @IsUUID('4')
  itemId: string;

  @ApiProperty({
    description: 'Số lượng sản phẩm trong mỗi túi',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateSurpriseBagDto {
  @ApiProperty({
    description: 'Tên túi bất ngờ (Surprise Bag)',
    example: 'Túi Bất Ngờ Ngọt Ngào - 3 Món Bánh Nướng Ngẫu Nhiên',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết và lưu ý bảo quản',
    example: 'Gồm các loại bánh ngọt ngẫu nhiên nướng trong ngày.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Tổng giá trị gốc của các món bánh trong túi (VND)',
    example: 100000,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1000)
  originalPrice: number;

  @ApiProperty({
    description: 'Giá bán ưu đãi của túi bất ngờ (VND, giảm ít nhất 50%)',
    example: 45000,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1000)
  currentPrice: number;

  @ApiPropertyOptional({
    description: 'Giá sàn tối thiểu cho phép giảm',
    example: 35000,
  })
  @IsOptional()
  @IsInt()
  floorPrice?: number;

  @ApiProperty({
    description: 'Tổng số túi mở bán hôm nay',
    example: 10,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  totalQuantity: number;

  @ApiProperty({
    description: 'Thời điểm bắt đầu nhận túi (ISO Date)',
    example: '2026-10-15T18:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  pickupStart: string;

  @ApiProperty({
    description: 'Thời điểm kết thúc nhận túi (ISO Date)',
    example: '2026-10-15T21:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  pickupEnd: string;

  @ApiProperty({
    description: 'Danh sách các món bên trong kèm thông tin thành phần dị ứng (BR-085)',
    type: [SurpriseBagItemDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Túi bất ngờ phải chứa ít nhất 1 sản phẩm.' })
  @ValidateNested({ each: true })
  @Type(() => SurpriseBagItemDto)
  items: SurpriseBagItemDto[];
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề thông báo push mới',
    example: 'Giờ vàng cứu bánh mì 50%!',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Nội dung thông báo mới',
    example: 'Chỉ còn 3 suất bánh mì baguette tươi mới nướng, giảm ngay 50%!',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm lên lịch gửi mới (ISO Date, cách thời điểm hiện tại ít nhất 15 phút)',
    example: '2026-10-15T19:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái chiến dịch (SCHEDULED hoặc CANCELLED)',
    enum: CampaignStatus,
    example: CampaignStatus.CANCELLED,
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
