import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { IncidentType } from '../../entities/order-support/pickup-incident.entity';

export class CreateIncidentDto {
  @ApiProperty({ enum: IncidentType, description: 'Loại sự cố khi đến nhận hàng (KX03)' })
  @IsEnum(IncidentType, { message: 'Loại sự cố không hợp lệ.' })
  type: IncidentType;

  @ApiPropertyOptional({ description: 'Mô tả thêm, tối đa 500 ký tự' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Mô tả tối đa 500 ký tự.' })
  note?: string;
}

export class RespondIncidentDto {
  @ApiProperty({
    enum: ['ACKNOWLEDGE', 'FIXED', 'REFUND', 'REJECT'],
    description:
      'ACKNOWLEDGE: đã nhận thông tin; FIXED: đã khắc phục; REFUND: hoàn tiền; REJECT: không công nhận (cần lý do)',
  })
  @IsIn(['ACKNOWLEDGE', 'FIXED', 'REFUND', 'REJECT'], { message: 'Hành động không hợp lệ.' })
  action: 'ACKNOWLEDGE' | 'FIXED' | 'REFUND' | 'REJECT';

  @ApiPropertyOptional({ description: 'Lời nhắn gửi khách; bắt buộc khi từ chối' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SendOrderMessageDto {
  @ApiProperty({ description: 'Nội dung tin nhắn, 1 đến 500 ký tự' })
  @IsString()
  @Length(1, 500, { message: 'Tin nhắn từ 1 đến 500 ký tự.' })
  body: string;
}

export class CreateGiftDto {
  @ApiProperty({
    description: 'Số điện thoại hoặc email của người nhận (tài khoản khách đã đăng ký)',
  })
  @IsString()
  @Length(5, 100)
  recipient: string;

  @ApiPropertyOptional({ description: 'Lời nhắn, tối đa 200 ký tự' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}

export class SwapOrderDto {
  @ApiProperty({ description: 'Suất muốn đổi sang (cùng cửa hàng)' })
  @IsUUID()
  newOfferId: string;
}
