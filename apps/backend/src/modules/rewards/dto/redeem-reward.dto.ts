import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class RedeemRewardDto {
  @ApiProperty({ description: 'Số điểm muốn đổi', example: 500 })
  @IsInt()
  @Min(1)
  points: number;

  @ApiProperty({ description: 'Mã định danh ưu đãi/phần thưởng được đổi' })
  @IsString()
  redemptionId: string;
}
