import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SubscriptionPlan } from '../../../entities/subscriptions/subscription.entity';
import { QuotaKey, QuotaPeriod } from '../../subscriptions/quota.constants';

export class ResolveAdminComplaintDto {
  @ApiProperty({ enum: ['ACCEPT', 'REJECT'] })
  @IsIn(['ACCEPT', 'REJECT'])
  decision: 'ACCEPT' | 'REJECT';

  @ApiPropertyOptional({ minimum: 0, description: 'VND; bỏ trống để hoàn toàn bộ phần chưa hoàn.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  refundAmount?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class UpdateAdminViolationDto {
  @ApiProperty({ enum: ['REVIEWED', 'DISMISSED'] })
  @IsIn(['REVIEWED', 'DISMISSED'])
  status: 'REVIEWED' | 'DISMISSED';
}

export class UpdateAdminReviewDto {
  @ApiProperty({ enum: ['VISIBLE', 'HIDDEN'] })
  @IsIn(['VISIBLE', 'HIDDEN'])
  status: 'VISIBLE' | 'HIDDEN';
}

export class CreateAdminQuotaDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({ enum: QuotaKey })
  @IsEnum(QuotaKey)
  quotaKey: QuotaKey;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  quotaValue: number;

  @ApiProperty({ enum: QuotaPeriod })
  @IsEnum(QuotaPeriod)
  period: QuotaPeriod;
}

export class UpdateAdminQuotaDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  quotaValue: number;
}

export class RejectPaymentProofDto {
  @ApiProperty({
    description: 'Lý do từ chối biên lai',
    example: 'Không thấy khoản tiền về tài khoản nhận',
  })
  @IsString()
  @MaxLength(255)
  reason: string;
}

export class MarkRefundPaidDto {
  @ApiProperty({
    description: 'Mã giao dịch ngân hàng của lần chuyển khoản hoàn tiền',
    example: 'FT26102100123',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(100)
  reference: string;
}
