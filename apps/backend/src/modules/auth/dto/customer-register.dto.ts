import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { IsStrongPassword } from './password-rule';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerRegisterDto {
  @ApiProperty({ example: '0901234567', description: 'Số điện thoại đăng ký' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'khachhang@example.com', description: 'Email nhận mã OTP xác minh' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: 'MatKhau123@', minLength: 8 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString()
  fullName: string;

  @ApiProperty({
    example: 'device-uuid-1234',
    description: 'Mã định danh thiết bị, dùng để giới hạn số lần đăng ký',
  })
  @IsNotEmpty({ message: 'Mã định danh thiết bị không được để trống' })
  @IsString()
  deviceId: string;
}
