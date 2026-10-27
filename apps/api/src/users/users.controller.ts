import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('manage')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  findAllForManagement(@CurrentUser() actor: CurrentUserPayload) { return this.usersService.findAllForManagement(actor.role as Role); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  createMember(@Body() body: { name: string; email: string; password: string; role: Role }, @CurrentUser() actor: CurrentUserPayload) {
    return this.usersService.createMember(body, actor.role as Role);
  }

  @Patch(':id/active')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  setMemberActive(@Param('id') id: string, @Body('isActive') isActive: boolean, @CurrentUser() actor: CurrentUserPayload) {
    return this.usersService.setMemberActive(id, isActive, actor.userId, actor.role as Role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/availability')
  updateAvailability(@Param('id') id: string, @Body() dto: UpdateAvailabilityDto, @CurrentUser() actor: CurrentUserPayload) {
    if (id !== actor.userId) throw new ForbiddenException('Chỉ được cập nhật trạng thái của chính mình');
    return this.usersService.updateAvailability(actor.userId, dto);
  }
}
