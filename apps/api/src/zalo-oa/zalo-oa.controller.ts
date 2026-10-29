import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ZaloOaService } from './zalo-oa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('zalo-oa')
export class ZaloOaController {
  constructor(private zaloOaService: ZaloOaService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.zaloOaService.findAll(user.userId, user.role);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  findOne(@Param('id') id: string) {
    return this.zaloOaService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() body: { name?: string; dailyMessageLimit?: number }) {
    return this.zaloOaService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.zaloOaService.remove(id);
  }

  @Post(':id/reconnect')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  reconnect(@Param('id') id: string) {
    return this.zaloOaService.reconnect(id);
  }

  @Post(':id/rotate-webhook-secret')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  rotateWebhookSecret(@Param('id') id: string) {
    return this.zaloOaService.rotateWebhookSecret(id);
  }

  @Post(':id/webhook-test')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  testWebhook(@Param('id') id: string) {
    return this.zaloOaService.testWebhook(id);
  }

  @Put(':id/staff-access/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateStaffAccess(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('canSend') canSend: boolean,
  ) {
    return this.zaloOaService.updateStaffAccess(id, userId, canSend);
  }

  @Delete(':id/staff-access/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  removeStaffAccess(@Param('id') id: string, @Param('userId') userId: string) {
    return this.zaloOaService.removeStaffAccess(id, userId);
  }
}
