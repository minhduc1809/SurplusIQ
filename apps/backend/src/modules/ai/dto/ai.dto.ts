import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  IsUUID,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiRating } from '../../../entities/ai/ai-feedback.entity';

export class StoreAiChatDto {
  @ApiPropertyOptional({
    description: 'ID cuộc trò chuyện (nếu tiếp tục cuộc hội thoại cũ)',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @ApiProperty({
    description: 'Câu hỏi hoặc yêu cầu tư vấn gửi cho trợ lý AI',
    example: 'Hôm nay trời mưa to, quán tôi nên giảm giá bao nhiêu % để giải phóng 15 ổ bánh mì?',
  })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống.' })
  @IsString()
  @MaxLength(1000)
  message: string;
}

export class DescribeItemDto {
  @ApiProperty({
    description: 'Tên sản phẩm bánh/thực phẩm',
    example: 'Bánh Mì Phô Mai Tan Chảy',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Danh mục sản phẩm',
    example: 'Bánh Mì Ngọt',
  })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiPropertyOptional({
    description: 'Nguyên liệu chính',
    example: 'Bột mì nguyên cám, phô mai Cheddar, sữa tươi, bơ lạt',
  })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiPropertyOptional({
    description: 'Đặc điểm nổi bật hoặc lưu ý khi thưởng thức',
    example: 'Bánh mới nướng sáng nay, vỏ giòn ruột mềm xốp',
  })
  @IsOptional()
  @IsString()
  specialFeatures?: string;
}

export class CustomerAiSearchDto {
  @ApiProperty({
    description: 'Câu tìm kiếm bằng ngôn ngữ tự nhiên',
    example: 'Tìm bánh mì ngọt hoặc bánh kem giảm giá dưới 30k gần tôi',
  })
  @IsNotEmpty({ message: 'Nội dung tìm kiếm không được để trống.' })
  @IsString()
  @MaxLength(300)
  query: string;

  @ApiPropertyOptional({
    description: 'Vĩ độ vị trí khách hàng',
    example: 10.7769,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ vị trí khách hàng',
    example: 106.7009,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class AiFeedbackDto {
  @ApiProperty({
    description: 'ID bản ghi log AI được đánh giá',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsNotEmpty()
  @IsUUID('4')
  logId: string;

  @ApiProperty({
    description: 'Mức độ hài lòng (HELPFUL hoặc UNHELPFUL)',
    enum: AiRating,
    example: AiRating.HELPFUL,
  })
  @IsNotEmpty()
  @IsEnum(AiRating)
  rating: AiRating;

  @ApiPropertyOptional({
    description: 'Lý do đánh giá',
    example: 'Gợi ý giá rất chính xác và bán hết bánh nhanh chóng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Góp ý chi tiết thêm',
    example: 'Nên hỗ trợ thêm gợi ý thời gian mở bán',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CustomerAllergyCheckDto {
  @ApiProperty({
    description: 'ID suất bán muốn kiểm tra dị ứng',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsNotEmpty()
  @IsUUID('4')
  dealId: string;

  @ApiProperty({
    description: 'Danh sách các chất gây dị ứng của người dùng',
    example: ['Hải sản', 'Đậu phộng', 'Gluten', 'Sữa'],
    type: [String],
  })
  @IsNotEmpty()
  userAllergies: string[];
}

export class CustomerAiChatDto {
  @ApiPropertyOptional({
    description: 'ID cuộc trò chuyện cũ (nếu muốn tiếp tục)',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @ApiProperty({
    description: 'Câu hỏi của khách hàng về món ăn, chính sách, nhận hàng...',
    example: 'Tôi có thể để bánh mì baguette qua đêm ăn sáng mai được không?',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  message: string;
}

export class DraftReviewReplyDto {
  @ApiProperty({
    description: 'ID đánh giá của khách hàng cần trả lời',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsNotEmpty()
  @IsUUID('4')
  reviewId: string;

  @ApiPropertyOptional({
    description: 'Văn phong phản hồi mong muốn (FRIENDLY, FORMAL, APOLOGETIC)',
    example: 'FRIENDLY',
    enum: ['FRIENDLY', 'FORMAL', 'APOLOGETIC'],
  })
  @IsOptional()
  @IsString()
  tone?: 'FRIENDLY' | 'FORMAL' | 'APOLOGETIC';
}

export class DraftMarketingCampaignDto {
  @ApiPropertyOptional({
    description: 'ID suất bán muốn tập trung quảng bá',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4')
  offerId?: string;

  @ApiPropertyOptional({
    description: 'Nhóm khách hàng mục tiêu (ALL, LOYAL, AT_RISK, FAVORITES)',
    example: 'LOYAL',
  })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({
    description: 'Mục tiêu chiến dịch (kích cầu cuối ngày, xả hàng nhanh, tri ân)',
    example: 'Xả gấp 10 suất bánh trước giờ đóng cửa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  goal?: string;
}

export class SentimentAnalysisDto {
  @ApiPropertyOptional({
    description: 'Số lượng đánh giá gần nhất cần phân tích',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class SuggestCombosDto {
  @ApiPropertyOptional({
    description: 'Mức giảm giá dự kiến (%) cho combo/túi bất ngờ',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  targetDiscountPercent?: number;
}
