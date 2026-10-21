import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '../../../entities/stores/store-legal-profile.entity';
import { ContractStatus } from '../../../entities/stores/store-contract.entity';

export class UpsertLegalProfileDto {
  @ApiProperty({ example: 'Hộ kinh doanh Phở Cụ Chiêu' })
  @IsString()
  @Length(2, 150, { message: 'Tên pháp lý từ 2 đến 150 ký tự.' })
  legalName: string;

  @ApiProperty({ enum: BusinessType })
  @IsEnum(BusinessType, { message: 'Loại hình kinh doanh không hợp lệ.' })
  businessType: BusinessType;

  @ApiPropertyOptional({ example: '0312345678' })
  @IsOptional()
  @Matches(/^\d{10}(-?\d{3})?$/, { message: 'Mã số thuế gồm 10 số (hoặc 13 số cho chi nhánh).' })
  taxCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  businessLicenseNo?: string;

  @ApiProperty()
  @IsString()
  @Length(2, 100, { message: 'Tên người đại diện từ 2 đến 100 ký tự.' })
  representativeName: string;

  @ApiProperty({ example: '0988123001' })
  @Matches(/^\+?\d{9,15}$/, { message: 'Số điện thoại người đại diện không hợp lệ.' })
  representativePhone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ kinh doanh không được để trống.' })
  @MaxLength(255)
  legalAddress: string;
}

export class ReviewContractDto {
  @ApiProperty({
    enum: [ContractStatus.APPROVED, ContractStatus.REJECTED, ContractStatus.NEED_MORE_INFO],
  })
  @IsIn([ContractStatus.APPROVED, ContractStatus.REJECTED, ContractStatus.NEED_MORE_INFO], {
    message: 'Quyết định phải là APPROVED, REJECTED hoặc NEED_MORE_INFO.',
  })
  decision: ContractStatus;

  @ApiPropertyOptional({ description: 'Bắt buộc khi từ chối hoặc yêu cầu bổ sung' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
