import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PersonalZaloService } from './zalo-personal.service';
import { PersonalZaloAccountsService } from './personal-zalo-accounts.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('zalo-personal')
export class PersonalZaloController {
  constructor(private readonly zalo: PersonalZaloService, private readonly accounts: PersonalZaloAccountsService) {}

  @Get('accounts')
  listAccounts(@CurrentUser() user: CurrentUserPayload) { return this.accounts.list(user.userId, user.role); }

  @Post('accounts')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createAccount(@Body() body: { name: string; proxyUrl?: string }, @CurrentUser() user: CurrentUserPayload) { return this.accounts.create(body.name, body.proxyUrl, user.userId); }

  @Patch('accounts/:id/proxy')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateAccountProxy(@Param('id') id: string, @Body() body: { proxyUrl?: string | null }, @CurrentUser() user: CurrentUserPayload) { return this.accounts.updateProxy(id, body.proxyUrl ?? null, user.userId, user.role); }

  @Delete('accounts/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  removeAccount(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) { return this.accounts.remove(id, user.userId, user.role); }

  @Get('accounts/:id/status')
  accountStatus(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) { return this.accounts.status(id, user.userId, user.role); }

  @Post('accounts/:id/login')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  loginAccount(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) { return this.accounts.startLogin(id, user.userId, user.role); }

  @Post('accounts/:id/disconnect')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  disconnectAccount(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) { return this.accounts.disconnect(id, user.userId, user.role); }

  @Get('accounts/:id/groups')
  accountGroups(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) { return this.accounts.groups(id, user.userId, user.role); }

  @Put('accounts/:id/groups/:groupId/access/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  assignGroupAccess(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() body: { groupName?: string },
  ) {
    return this.accounts.assignGroupAccess(id, groupId, userId, body?.groupName);
  }

  @Delete('accounts/:id/groups/:groupId/access/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  removeGroupAccess(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.accounts.removeGroupAccess(id, groupId, userId);
  }

  @Delete('accounts/:id/groups/:groupId/access')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  clearGroupAccess(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
  ) {
    return this.accounts.clearGroupAccess(id, groupId);
  }

  @Post('accounts/:id/scan-group-link')
  scanGroupLink(@Param('id') id: string, @Body() body: { link: string }, @CurrentUser() user: CurrentUserPayload) {
    return this.accounts.scanGroupLink(id, body.link, user.userId, user.role);
  }

  @Post('accounts/:id/join-group-link')
  joinGroupLink(@Param('id') id: string, @Body() body: { link: string }, @CurrentUser() user: CurrentUserPayload) {
    return this.accounts.joinGroupByLink(id, body.link, user.userId, user.role);
  }

  @Get('accounts/:id/group-membership')
  checkGroupMembership(@Param('id') id: string, @Query('groupId') groupId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.accounts.checkGroupMembership(id, groupId, user.userId, user.role);
  }

  @Post('accounts/:id/bulk-send')
  bulkSend(@Param('id') id: string, @Body() body: { recipients: Array<{ userId: string; displayName?: string }>; content: string }, @CurrentUser() user: CurrentUserPayload) {
    return this.accounts.startBulkSend(id, body.recipients, body.content, user.userId, user.role);
  }

  @Get('accounts/:id/bulk-send/:batchId')
  bulkSendStatus(@Param('id') id: string, @Param('batchId') batchId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.accounts.bulkSendStatus(id, batchId, user.userId, user.role);
  }

  @Get('accounts/:id/friends')
  accountFriends(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) { return this.accounts.friends(id, user.userId, user.role); }

  @Get('accounts/:id/friend-requests')
  friendRequests(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) { return this.accounts.friendRequests(id, user.userId, user.role); }

  @Post('accounts/:id/friend-requests/:friendId/accept')
  acceptFriendRequest(@Param('id') id: string, @Param('friendId') friendId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.accounts.acceptFriendRequest(id, friendId, user.userId, user.role);
  }

  @Post('accounts/:id/chat')
  openChat(@Param('id') id: string, @Body() body: { targetId: string; displayName?: string; isGroup?: boolean }, @CurrentUser() user: CurrentUserPayload) {
    return this.accounts.openChat(id, body.targetId, body.displayName ?? '', Boolean(body.isGroup), user.userId, user.role);
  }

  @Delete('chat-data')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  clearChatData(@CurrentUser() user: CurrentUserPayload) { return this.accounts.clearChatData(user.userId, user.role); }

  @Get('status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  status() {
    return this.zalo.getStatus();
  }

  @Post('login')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  login() {
    return this.zalo.startLogin();
  }

  @Post('disconnect')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  disconnect() {
    return this.zalo.disconnect();
  }

  @Get('groups')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  groups() {
    return this.zalo.listGroups();
  }
}
