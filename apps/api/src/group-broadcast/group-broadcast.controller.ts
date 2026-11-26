import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { GroupBroadcastService } from './group-broadcast.service';
import { UpsertGroupBroadcastDto } from './dto/upsert-group-broadcast.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('group-broadcasts')
export class GroupBroadcastController {
  constructor(private readonly broadcasts: GroupBroadcastService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.list(user.userId, user.role);
  }

  @Get('accounts/:accountId/groups')
  groups(@Param('accountId') accountId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.groups(accountId, user.userId, user.role);
  }

  @Post('preview')
  preview(@Body() body: { contentHtml: string }) {
    return this.broadcasts.preview(body?.contentHtml ?? '');
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.get(id, user.userId, user.role);
  }

  @Get(':id/runs')
  runs(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.runs(id, user.userId, user.role);
  }

  @Post()
  create(@Body() dto: UpsertGroupBroadcastDto, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.create(dto, user.userId, user.role);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpsertGroupBroadcastDto, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.update(id, dto, user.userId, user.role);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.pause(id, user.userId, user.role);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.resume(id, user.userId, user.role);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.cancel(id, user.userId, user.role);
  }

  @Post(':id/run-now')
  runNow(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.runNow(id, user.userId, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.remove(id, user.userId, user.role);
  }
}
