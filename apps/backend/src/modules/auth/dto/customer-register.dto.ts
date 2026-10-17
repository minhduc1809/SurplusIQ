import { IsNotEmpty, IsString, MinLength, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerRegisterDto {
  @ApiProperty({ example: '0901234567', description: 'Số điện thoại đăng ký' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'khachhang@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @ApiProperty({ example: 'MatKhau123@', minLength: 6 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
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
