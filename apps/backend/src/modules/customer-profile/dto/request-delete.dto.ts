import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Yêu cầu xóa tài khoản phải xác nhận lại bằng mật khẩu hiện tại (BUG-016, R1-011). */
export class RequestDeleteDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại để xác nhận xóa tài khoản' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản.' })
  @MaxLength(128, { message: 'Mật khẩu quá dài.' })
  password: string;
}
