import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestEmailOtpDto {
  @ApiProperty({ example: 'khach@example.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  email: string;
}

export class ConfirmEmailDto extends RequestEmailOtpDto {
  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Length(4, 8)
  code: string;
}
