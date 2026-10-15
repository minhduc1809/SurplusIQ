import { IsOptional, IsBoolean, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../../entities/notifications/notification.entity';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Nhận thông báo cập nhật trạng thái đơn hàng và thanh toán' })
  @IsOptional()
  @IsBoolean()
  transactionPush?: boolean;

  @ApiPropertyOptional({ description: 'Nhận thông báo khuyến mãi, ưu đãi từ quán yêu thích' })
  @IsOptional()
  @IsBoolean()
  promoPush?: boolean;

  @ApiPropertyOptional({ description: 'Nhận thông báo nhắc nhở trước giờ nhận hàng 15-30 phút' })
  @IsOptional()
  @IsBoolean()
  reminderPush?: boolean;
}

export class QueryNotificationsDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang (1-50)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái đã đọc' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ enum: NotificationType, description: 'Lọc theo loại thông báo' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
