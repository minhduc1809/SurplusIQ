import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities/auth/user.entity';
import { AdminSnapshotService } from './admin-snapshot.service';

@ApiTags('Platform Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSnapshotController {
  constructor(private readonly snapshots: AdminSnapshotService) {}

  @Get('snapshot')
  read() {
    return this.snapshots.read();
  }
}
