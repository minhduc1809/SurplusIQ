import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyProxyCodeDto {
  @ApiProperty({
    description: 'Mã nhận hộ 8 ký tự do khách hàng cung cấp (R1-052)',
    example: 'A7B8C9D2',
  })
  @IsNotEmpty({ message: 'Mã nhận hộ không được để trống.' })
  @IsString({ message: 'Mã nhận hộ phải là chuỗi ký tự.' })
  @Length(8, 8, { message: 'Mã nhận hộ phải gồm đúng 8 ký tự.' })
  @Matches(/^[A-Z0-9]{8}$/, { message: 'Mã nhận hộ phải gồm 8 ký tự chữ in hoa và chữ số.' })
  code: string;
}
