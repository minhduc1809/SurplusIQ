import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RescueActionType } from '../../../entities/rescue-timeline/rescue-risk-snapshot.entity';

export class RescueLotActionDto {
  @ApiProperty({ enum: RescueActionType, example: RescueActionType.UPDATE_STOCK })
  @IsEnum(RescueActionType, { message: 'Loại hành động không hợp lệ.' })
  actionType: RescueActionType;

  @ApiProperty({
    description:
      'Số suất còn lại mà người dùng đang thấy. Backend so với tồn thực tế; lệch thì từ chối và trả trạng thái mới để tải lại.',
    example: 8,
  })
  @IsInt({ message: 'expectedQuantity phải là số nguyên.' })
  @Min(0, { message: 'expectedQuantity không được âm.' })
  expectedQuantity: number;

  @ApiPropertyOptional({
    description: 'Bắt buộc với UPDATE_STOCK: số suất thay đổi (+ tăng, - giảm, khác 0)',
    example: -2,
  })
  @ValidateIf((o) => o.actionType === RescueActionType.UPDATE_STOCK)
  @IsInt({ message: 'deltaQuantity phải là số nguyên.' })
  deltaQuantity?: number;

  @ApiPropertyOptional({
    description: 'Bắt buộc với UPDATE_STOCK: lý do (Làm thêm, Hỏng, Bán tại quầy, Khác)',
    example: 'Bán tại quầy',
  })
  @ValidateIf((o) => o.actionType === RescueActionType.UPDATE_STOCK)
  @IsNotEmpty({ message: 'Lý do điều chỉnh tồn không được để trống (R2-031).' })
  @IsString()
  @MaxLength(100)
  reason?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm (vd. nội dung chuyển yêu cầu cho quản lý)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
