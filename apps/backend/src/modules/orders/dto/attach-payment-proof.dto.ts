import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AttachPaymentProofDto {
  @ApiProperty({
    description: 'Đường dẫn hoặc URL ảnh chụp biên lai chuyển khoản (KX02)',
    example: 'https://storage.surplusiq.vn/receipts/proof-123456.jpg',
  })
  @IsNotEmpty({ message: 'Đường dẫn ảnh biên lai không được để trống' })
  @IsString({ message: 'Đường dẫn ảnh biên lai phải là chuỗi' })
  @MaxLength(500, { message: 'Đường dẫn ảnh biên lai tối đa 500 ký tự' })
  proofUrl: string;
}
