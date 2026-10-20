import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRefundBankAccountDto {
  @ApiProperty({
    description: 'Mã định danh ngân hàng (BIN code)',
    example: '970422',
  })
  @IsNotEmpty({ message: 'Mã định danh ngân hàng không được để trống' })
  @IsString()
  bankBin: string;

  @ApiProperty({
    description: 'Tên viết tắt hoặc tên giao dịch của ngân hàng',
    example: 'MB Bank',
  })
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  @IsString()
  bankName: string;

  @ApiProperty({
    description: 'Số tài khoản ngân hàng nhận tiền hoàn',
    example: '0388123456',
  })
  @IsNotEmpty({ message: 'Số tài khoản không được để trống' })
  @IsString()
  @Length(6, 30, { message: 'Số tài khoản phải từ 6 đến 30 ký tự' })
  @Matches(/^[0-9A-Za-z]+$/, { message: 'Số tài khoản chỉ chứa chữ và số' })
  accountNumber: string;

  @ApiProperty({
    description: 'Họ và tên chủ tài khoản (in hoa không dấu hoặc có dấu)',
    example: 'NGUYEN VAN A',
  })
  @IsNotEmpty({ message: 'Tên chủ tài khoản không được để trống' })
  @IsString()
  accountHolder: string;
}
