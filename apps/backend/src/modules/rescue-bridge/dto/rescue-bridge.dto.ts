import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  RescueBridgeTransferStatus,
  TransportResponsibility,
} from '../../../entities/rescue-bridge/rescue-bridge-transfer.entity';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// ───────────────────────── Store side ─────────────────────────

export class CreateTransferDto {
  @ApiProperty({ description: 'Suất/lô còn lại cần bàn giao (batch/slot)' })
  @IsUUID('4', { message: 'offerId phải là UUID hợp lệ.' })
  offerId: string;

  @ApiProperty({
    example: 8,
    description:
      'Số lượng thực tế cửa hàng xác nhận có thể bàn giao - giữ ngay khỏi tồn bán (BR-B03-05)',
  })
  @IsInt()
  @Min(1, { message: 'Số lượng bàn giao phải từ 1 suất.' })
  quantity: number;

  @ApiProperty({ example: '2026-10-20T13:00:00.000Z', description: 'Thời điểm sẵn sàng bàn giao' })
  @IsDateString({}, { message: 'availableAt phải là ISO 8601.' })
  availableAt: string;

  @ApiProperty({
    example: '2026-10-20T14:30:00.000Z',
    description: 'Hạn nhận - không được sau hạn dùng của lô',
  })
  @IsDateString({}, { message: 'handoverDeadline phải là ISO 8601.' })
  handoverDeadline: string;

  @ApiProperty({
    example: 'Bảo quản mát 4-8°C, dùng trong 4 giờ',
    description:
      'Điều kiện bảo quản do cửa hàng khai báo (hệ thống không xác nhận an toàn - BR-B03-04)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Điều kiện bảo quản là bắt buộc.' })
  @MaxLength(1000)
  storageNotes: string;

  @ApiProperty({
    enum: TransportResponsibility,
    description: 'Bên chịu trách nhiệm vận chuyển và chi phí (BR-B03-10)',
  })
  @IsEnum(TransportResponsibility, { message: 'Phải xác định trách nhiệm vận chuyển (BR-B03-10).' })
  transportResponsibility: TransportResponsibility;

  @ApiPropertyOptional({
    example: 'Bánh mì',
    description:
      'Nhóm món; mặc định lấy từ món của suất. Bắt buộc nếu suất không gắn món (túi bất ngờ).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  foodCategory?: string;
}

export class SendTransferDto {
  @ApiProperty({ description: 'Đơn vị tiếp nhận chọn từ danh sách ghép nối hợp lệ (BR-B03-02)' })
  @IsUUID('4', { message: 'recipientOrgId phải là UUID hợp lệ.' })
  recipientOrgId: string;
}

export class TransferReasonDto {
  @ApiProperty({ example: 'Đơn vị không đến nhận đúng hẹn' })
  @IsString()
  @IsNotEmpty({ message: 'Lý do là bắt buộc (BR-B03-08).' })
  @MaxLength(500)
  reason: string;
}

export class ConfirmAgreementDto {
  @ApiProperty({
    example: 'Nguyễn Văn A (quản lý ca tối)',
    description: 'Người chịu trách nhiệm phía cửa hàng',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  storeResponsibleName: string;
}

export class StoreConfirmHandoverDto {
  @ApiProperty({ example: 8, description: 'Số lượng thực tế đã giao' })
  @IsInt()
  @Min(1, { message: 'Không giao được suất nào thì báo thất bại thay vì xác nhận.' })
  quantityHandedOver: number;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/handover/abc.jpg hoặc số biên bản BB-0012',
    description:
      'Bằng chứng bàn giao - bắt buộc khi chính sách rescue_bridge.evidence_required bật',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  evidenceReference?: string;
}

export class QueryTransfersDto {
  @ApiPropertyOptional({ enum: RescueBridgeTransferStatus })
  @IsOptional()
  @IsEnum(RescueBridgeTransferStatus)
  status?: RescueBridgeTransferStatus;
}

export class QueryReportDto {
  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

// ───────────────────────── Recipient side (token link) ─────────────────────────

export class RecipientAcceptDto {
  @ApiProperty({
    example: 6,
    description: 'Số lượng nhận - có thể ít hơn đề nghị (đề xuất thay đổi)',
  })
  @IsInt()
  @Min(1)
  quantityAccepted: number;

  @ApiProperty({
    example: '2026-10-20T13:30:00.000Z',
    description: 'Thời điểm đến nhận, trong khung sẵn sàng → hạn nhận',
  })
  @IsDateString({}, { message: 'pickupAt phải là ISO 8601.' })
  pickupAt: string;

  @ApiProperty({
    example: 'Trần Thị B',
    description: 'Người chịu trách nhiệm phía đơn vị tiếp nhận',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  responsibleName: string;

  @ApiPropertyOptional({ example: 'Chỉ nhận được 6 suất do tủ mát đầy' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RecipientConfirmHandoverDto {
  @ApiProperty({ example: 6, description: 'Số lượng thực nhận' })
  @IsInt()
  @Min(1)
  quantityReceived: number;

  @ApiProperty({ example: 'Trần Thị B', description: 'Họ tên người xác nhận tại đơn vị' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  confirmedByName: string;
}

// ───────────────────────── Platform ops (ADMIN) ─────────────────────────

export class CreateRecipientOrgDto {
  @ApiProperty({ example: 'Bếp cơm Thiện Tâm' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'Chị Lan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @Matches(/^[0-9+ ]{8,20}$/, { message: 'Số điện thoại không hợp lệ.' })
  contactPhone: string;

  @ApiProperty({ example: ['Bánh mì', 'Cơm hộp'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  acceptedFoodCategories: string[];

  @ApiProperty({ example: ['Quận 1', 'Bình Thạnh'], description: 'So khớp với địa chỉ cửa hàng' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  serviceAreas: string[];

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  maxQuantityPerTransfer: number;

  @ApiPropertyOptional({ example: '10:00', description: 'Giờ VN, HH:mm; bỏ trống = nhận mọi giờ' })
  @IsOptional()
  @Matches(HHMM, { message: 'receivingWindowStart phải dạng HH:mm.' })
  receivingWindowStart?: string;

  @ApiPropertyOptional({ example: '21:00' })
  @IsOptional()
  @Matches(HHMM, { message: 'receivingWindowEnd phải dạng HH:mm.' })
  receivingWindowEnd?: string;

  @ApiPropertyOptional({ example: 'Có tủ mát 200L, xe máy' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  capacityNote?: string;
}

export class UpdateRecipientOrgDto extends PartialType(CreateRecipientOrgDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Duyệt hồ sơ hợp lệ (BR-B03-02)' })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}

export class ResolveDisputeDto {
  @ApiProperty({
    example: 5,
    description: 'Số lượng bàn giao do vận hành xác định sau xử lý; 0 = thất bại',
  })
  @IsInt()
  @Min(0)
  quantityHandedOver: number;

  @ApiProperty({ example: 'Đối chiếu ảnh và gọi hai bên, thống nhất 5 suất' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  resolutionNote: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  evidenceReference?: string;
}
