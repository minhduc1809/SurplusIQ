import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Thông báo đơn hàng & giao dịch' })
  @IsOptional()
  @IsBoolean()
  transactionPush?: boolean;

  @ApiPropertyOptional({ description: 'Cảnh báo deal & khuyến mãi' })
  @IsOptional()
  @IsBoolean()
  promoPush?: boolean;

  @ApiPropertyOptional({ description: 'Nhắc nhở khung giờ nhận món' })
  @IsOptional()
  @IsBoolean()
  reminderPush?: boolean;

  @ApiPropertyOptional({ description: 'Cảnh báo deal quán yêu thích' })
  @IsOptional()
  @IsBoolean()
  dealAlerts?: boolean;

  @ApiPropertyOptional({ description: 'Cập nhật đơn hàng (alias)' })
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Khuyến mãi (alias)' })
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @ApiPropertyOptional({ description: 'Nhắc nhở (alias)' })
  @IsOptional()
  @IsBoolean()
  reminders?: boolean;
}
