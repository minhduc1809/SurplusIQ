import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { IsStrongPassword } from './password-rule';
import { ApiProperty } from '@nestjs/swagger';

export class StoreRegisterDto {
  @ApiProperty({ example: 'tiembanh@example.com' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: 'MatKhau123@', minLength: 8 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'Tiệm Bánh ABC' })
  @IsNotEmpty({ message: 'Tên cửa hàng không được để trống' })
  @IsString()
  storeName: string;

  @ApiProperty({ example: '123 Nguyễn Huệ, Quận 1, TP.HCM' })
  @IsNotEmpty({ message: 'Địa chỉ cửa hàng không được để trống' })
  @IsString()
  storeAddress: string;

  @ApiProperty({ example: '02838123456' })
  @IsNotEmpty({ message: 'Số điện thoại cửa hàng không được để trống' })
  @IsString()
  storePhone: string;
}
