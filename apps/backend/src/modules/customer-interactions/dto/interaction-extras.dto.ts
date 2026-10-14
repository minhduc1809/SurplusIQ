import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto {
  @ApiProperty({
    description: 'Số sao đánh giá từ 1 đến 5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'Số sao đánh giá không được để trống.' })
  @IsInt({ message: 'Số sao đánh giá phải là số nguyên.' })
  @Min(1, { message: 'Đánh giá tối thiểu là 1 sao.' })
  @Max(5, { message: 'Đánh giá tối đa là 5 sao.' })
  rating: number;

  @ApiPropertyOptional({
    description: 'Nhận xét chi tiết (tối đa 300 ký tự)',
    example: 'Bánh rất ngon và còn ấm, đóng gói cẩn thận!',
  })
  @IsOptional()
  @IsString({ message: 'Nhận xét phải là chuỗi ký tự.' })
  @MaxLength(300, { message: 'Nhận xét không được vượt quá 300 ký tự (R1-064).' })
  comment?: string;
}

export class AddComplaintAttachmentsDto {
  @ApiProperty({
    description: 'Danh sách URL ảnh bằng chứng bổ sung (tối đa 3 ảnh)',
    example: ['https://storage.surplusiq.vn/complaints/extra1.jpg'],
  })
  @IsArray({ message: 'Danh sách ảnh phải là một mảng chuỗi URL.' })
  @ArrayMaxSize(3, { message: 'Tối đa 3 ảnh bổ sung mỗi lần (R1-068).' })
  photoUrls: string[];

  @ApiPropertyOptional({
    description: 'Mô tả bổ sung thêm thông tin',
    example: 'Ảnh chụp mặt đáy của bánh bị mốc',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export enum ViolationTargetType {
  STORE = 'STORE',
  DEAL = 'DEAL',
  REVIEW = 'REVIEW',
}

export class CreateViolationReportDto {
  @ApiProperty({
    description: 'Loại đối tượng bị báo cáo (STORE, DEAL, REVIEW)',
    enum: ViolationTargetType,
    example: ViolationTargetType.STORE,
  })
  @IsNotEmpty({ message: 'Loại đối tượng không được để trống.' })
  @IsEnum(ViolationTargetType, { message: 'Loại đối tượng phải là STORE, DEAL hoặc REVIEW.' })
  targetType: ViolationTargetType;

  @ApiProperty({
    description: 'ID của đối tượng bị báo cáo',
    example: '00000000-0000-0000-0000-000000000001',
  })
  @IsNotEmpty({ message: 'ID đối tượng không được để trống.' })
  @IsString()
  targetId: string;

  @ApiProperty({
    description: 'Lý do báo cáo vi phạm',
    example: 'Cửa hàng không đúng mô tả, bán đồ ôi thiu',
  })
  @IsNotEmpty({ message: 'Lý do báo cáo không được để trống.' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class CreateSupportTicketDto {
  @ApiProperty({
    description: 'Tiêu đề yêu cầu hỗ trợ (10-150 ký tự)',
    example: 'Cần hỗ trợ về hoàn tiền đơn hàng SQ261013ABCD',
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống.' })
  @IsString()
  @MaxLength(150)
  subject: string;

  @ApiProperty({
    description: 'Nội dung chi tiết yêu cầu hỗ trợ',
    example: 'Tôi đã chuyển khoản qua VietQR nhưng hệ thống chưa xác nhận sau 15 phút.',
  })
  @IsNotEmpty({ message: 'Nội dung không được để trống.' })
  @IsString()
  message: string;
}

export class SendSupportMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn gửi vào yêu cầu hỗ trợ',
    example: 'Tôi đã kiểm tra lại tài khoản ngân hàng và tiền đã bị trừ.',
  })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống.' })
  @IsString()
  message: string;
}

export class ResolveComplaintDto {
  @ApiPropertyOptional({
    description: 'Số tiền hoàn lại cho khách (VND). Nếu để trống sẽ hoàn 100% giá trị đơn hàng',
    example: 35000,
  })
  @IsOptional()
  @IsInt({ message: 'Số tiền hoàn phải là số nguyên.' })
  @Min(0, { message: 'Số tiền hoàn không được âm.' })
  refundAmount?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú giải quyết khiếu nại của cửa hàng',
    example: 'Quán xin lỗi khách và đồng ý hoàn 100% tiền đơn bánh.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class RejectComplaintDto {
  @ApiProperty({
    description: 'Lý do từ chối khiếu nại (bắt buộc theo BRD R2-056)',
    example: 'Khách hàng nhận đơn đúng giờ và bánh được bảo quản đạt chuẩn tại quầy.',
  })
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống.' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class ReplyReviewDto {
  @ApiProperty({
    description:
      'Phản hồi công khai của cửa hàng về đánh giá của khách (tối đa 500 ký tự) (R2-057)',
    example: 'Cảm ơn bạn đã ủng hộ tiệm bánh! Quán sẽ tiếp tục nâng cao chất lượng phục vụ.',
  })
  @IsNotEmpty({ message: 'Nội dung phản hồi không được để trống.' })
  @IsString()
  @MaxLength(500)
  reply: string;
}
