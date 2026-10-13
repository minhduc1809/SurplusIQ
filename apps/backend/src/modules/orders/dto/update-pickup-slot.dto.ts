import { IsNotEmpty, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePickupSlotDto {
  @ApiProperty({
    description: 'Mốc giờ hẹn nhận hàng trong khung nhận (chuỗi ISO8601)',
    example: '2026-10-14T19:30:00.000Z',
  })
  @IsNotEmpty({ message: 'Giờ hẹn nhận không được để trống.' })
  @IsISO8601({}, { message: 'Giờ hẹn nhận phải đúng định dạng ngày giờ ISO8601.' })
  pickupSlot: string;
}
