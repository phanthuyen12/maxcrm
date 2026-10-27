import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true },
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('InboxGateway');

  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.cookie
          ?.split('; ')
          .find((c) => c.startsWith('access_token='))
          ?.split('=')[1];
      if (!token) return client.disconnect();

      const payload = this.jwt.verify(token);
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(client: Socket, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { zaloOAId: true } });
    if (!conversation || !(await this.userCanAccessChannel(client.data.userId, conversation.zaloOAId))) return;
    client.join(`conversation:${conversationId}`);
  }

  async emitPersonalZaloStatus(status: any) {
    const channel = status?.accountId ? await this.prisma.zaloOA.findUnique({ where: { zaloOaId: `personal-zca-js-${status.accountId}` }, select: { id: true } }) : null;
    await this.emitToChannel(channel?.id, 'zalo:personal:status', status);
  }

  async emitPersonalZaloGroups(payload: any) {
    const channel = payload?.accountId ? await this.prisma.zaloOA.findUnique({ where: { zaloOaId: `personal-zca-js-${payload.accountId}` }, select: { id: true } }) : null;
    await this.emitToChannel(channel?.id, 'zalo:personal:groups', payload);
  }

  async emitNewMessage(conversationId: string, message: unknown) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { zaloOAId: true } });
    if (conversation) await this.emitToChannel(conversation.zaloOAId, 'message:new', message);
  }

  async emitConversationUpdate(conversation: any) {
    const channelId = conversation?.zaloOAId ?? conversation?.zaloOA?.id ?? (conversation?.id ? (await this.prisma.conversation.findUnique({ where: { id: conversation.id }, select: { zaloOAId: true } }))?.zaloOAId : undefined);
    await this.emitToChannel(channelId, 'conversation:update', conversation);
  }

  emitStatsUpdate(stats: unknown) {
    this.server.emit('stats:update', stats);
  }

  private async userCanAccessChannel(userId: string, channelId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
    if (user?.role === 'ADMIN' && user.isActive) return true;
    return Boolean(await this.prisma.oAStaffAccess.findUnique({ where: { userId_zaloOAId: { userId, zaloOAId: channelId } }, select: { id: true } }));
  }

  private async emitToChannel(channelId: string | undefined, event: string, payload: unknown) {
    if (!this.server) return;
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    const staff = channelId ? await this.prisma.oAStaffAccess.findMany({ where: { zaloOAId: channelId }, select: { userId: true } }) : [];
    const recipients = new Set([...admins.map((user) => user.id), ...staff.map((access) => access.userId)]);
    for (const userId of recipients) this.server.to(`user:${userId}`).emit(event, payload);
  }
}
