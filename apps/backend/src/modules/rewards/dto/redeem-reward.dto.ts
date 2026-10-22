import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RedeemRewardDto {
  @ApiProperty({
    description: 'Mã ưu đãi trong danh mục đổi điểm (GET customer/rewards/catalog)',
    example: 'VOUCHER_10K',
  })
  @IsString()
  redemptionId: string;
}
