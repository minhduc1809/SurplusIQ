import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities';
import { AdminDirectoryService } from './admin-directory.service';
import {
  CreateAdminStoreDto,
  CreateAdminUserDto,
  UpdateAdminStoreDto,
  UpdateAdminUserDto,
} from './dto/admin-directory.dto';

@ApiTags('Admin directory')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDirectoryController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Post('users')
  createUser(@CurrentUser('userId') actorId: string, @Body() dto: CreateAdminUserDto) {
    return this.directory.createUser(actorId, dto);
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser('userId') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.directory.updateUser(actorId, id, dto);
  }

  @Delete('users/:id')
  deactivateUser(@CurrentUser('userId') actorId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.directory.deactivateUser(actorId, id);
  }

  @Post('stores')
  createStore(@CurrentUser('userId') actorId: string, @Body() dto: CreateAdminStoreDto) {
    return this.directory.createStore(actorId, dto);
  }

  @Patch('stores/:id')
  updateStore(
    @CurrentUser('userId') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminStoreDto,
  ) {
    return this.directory.updateStore(actorId, id, dto);
  }

  @Delete('stores/:id')
  suspendStore(@CurrentUser('userId') actorId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.directory.suspendStore(actorId, id);
  }
}
