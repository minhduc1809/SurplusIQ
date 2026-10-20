import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryService } from './cloudinary.service';
import { UploadsController } from './uploads.controller';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';

@Module({
  imports: [TypeOrmModule.forFeature([StoreMemberEntity])],
  controllers: [UploadsController],
  providers: [CloudinaryService, StorePermissionGuard],
  exports: [CloudinaryService],
})
export class UploadsModule {}
