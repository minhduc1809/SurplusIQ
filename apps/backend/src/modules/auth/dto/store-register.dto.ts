import { IsNotEmpty, IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';
import { IsStrongPassword } from './password-rule';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', description: 'Họ tên chủ cửa hàng (2–60 ký tự)' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Họ tên từ 2 đến 60 ký tự.' })
  @MaxLength(60, { message: 'Họ tên từ 2 đến 60 ký tự.' })
  ownerName?: string;

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
