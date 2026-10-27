import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InboxGateway } from '../gateway/inbox.gateway';
import { QUEUE_OUTBOUND_MESSAGE } from '../jobs/queues';
import { QueryConversationDto } from './dto/query-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

const conversationInclude = {
  customer: {
    select: { id: true, name: true, phone: true, avatar: true, status: true, zaloUserId: true },
  },
  zaloOA: { select: { id: true, name: true, avatar: true } },
  assignedTo: { select: { id: true, name: true, avatar: true } },
};

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: InboxGateway,
    @InjectQueue(QUEUE_OUTBOUND_MESSAGE) private outboundQueue: Queue,
  ) {}

  async findAll(query: QueryConversationDto, userId: string, role: string) {
    const channelFilter: Prisma.ZaloOAWhereInput | undefined = query.zaloOAId === 'personal'
      ? { zaloOaId: { startsWith: 'personal-zca-js' } }
      : query.zaloOAId ? { id: query.zaloOAId } : undefined;
    const where: Prisma.ConversationWhereInput = {
      AND: [
        ...(role !== 'ADMIN' ? [{ zaloOA: { staffAccess: { some: { userId } } } } as Prisma.ConversationWhereInput] : []),
        ...(channelFilter ? [{ zaloOA: channelFilter }] : []),
        ...(query.conversationType === 'group' ? [{ customer: { zaloUserId: { startsWith: 'group:' } } } as Prisma.ConversationWhereInput] : []),
        ...(query.conversationType === 'personal' ? [{ OR: [{ customer: { zaloUserId: null } }, { customer: { zaloUserId: { not: { startsWith: 'group:' } } } }] } as Prisma.ConversationWhereInput] : []),
      ],
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.assignedToId
        ? query.assignedToId === 'unassigned'
          ? { assignedToId: null }
          : { assignedToId: query.assignedToId }
        : {}),
      ...(query.search
        ? {
            OR: [
              { customer: { name: { contains: query.search } } },
              { customer: { phone: { contains: query.search } } },
              { messages: { some: { content: { contains: query.search } } } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo ? {
        lastMessageAt: {
          ...(query.dateFrom && !Number.isNaN(Date.parse(query.dateFrom)) ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo && !Number.isNaN(Date.parse(query.dateTo)) ? { lte: new Date(query.dateTo) } : {}),
        },
      } : {}),
    };

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        ...conversationInclude,
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
      orderBy: [{ isPinned: 'desc' }, { lastMessageAt: 'desc' }],
    });

    return conversations.map((c) => ({
      ...c,
      isGroup: c.customer.zaloUserId?.startsWith('group:') ?? false,
      lastMessage: c.messages[0] ?? null,
      messages: undefined,
    }));
  }

  async setPinned(id: string, pinned: boolean, userId: string, role: string) {
    const conversation = await this.findOne(id, userId, role);
    await this.assertChannelAccess(conversation.zaloOA.id, userId, false, role);
    const customer = await this.prisma.customer.findUnique({ where: { id: conversation.customerId }, select: { zaloUserId: true } });
    if (!customer?.zaloUserId?.startsWith('group:')) throw new BadRequestException('Chỉ có thể ghim hội thoại nhóm');
    const updated = await this.prisma.conversation.update({ where: { id }, data: { isPinned: pinned } });
    this.gateway.emitConversationUpdate({ ...updated, zaloOAId: conversation.zaloOA.id });
    return { id: updated.id, isPinned: updated.isPinned };
  }

  async unreadCount(userId: string, role: string) {
    return this.prisma.conversation.count({
      where: {
        status: 'UNREAD',
        ...(role !== 'ADMIN' ? { zaloOA: { staffAccess: { some: { userId } } } } : {}),
      },
    }).then((count) => ({ count }));
  }

  async findOne(id: string, userId?: string, role?: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude,
    });
    if (!conversation) throw new NotFoundException('Không tìm thấy hội thoại');
    if (userId && role !== 'ADMIN') await this.assertChannelAccess(conversation.zaloOA.id, userId, false);
    return { ...conversation, isGroup: conversation.customer.zaloUserId?.startsWith('group:') ?? false };
  }

  async findMessages(id: string, userId: string, role: string, page = 1, pageSize = 30) {
    await this.findOne(id, userId, role);
    const messages = await this.prisma.message.findMany({
      where: { conversationId: id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return messages.reverse();
  }

  async update(id: string, dto: UpdateConversationDto, userId: string, role: string) {
    const current = await this.findOne(id, userId, role);
    await this.assertChannelAccess(current.zaloOA.id, userId, false, role);
    if (dto.assignedToId !== undefined && dto.assignedToId !== null) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.assignedToId }, select: { id: true, isActive: true } });
      if (!assignee?.isActive) throw new NotFoundException('Không tìm thấy nhân viên đang hoạt động');
      if (role !== 'ADMIN') {
        const assigneeAccess = await this.prisma.oAStaffAccess.findUnique({ where: { userId_zaloOAId: { userId: assignee.id, zaloOAId: current.zaloOA.id } } });
        if (!assigneeAccess) throw new ForbiddenException('Nhân viên chưa được cấp quyền trên kênh này');
      }
    }
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: dto as any,
      include: conversationInclude,
    });
    this.gateway.emitConversationUpdate(conversation);
    return conversation;
  }

  async markRead(id: string, userId: string, role: string) {
    return this.update(id, { status: 'PROCESSING' }, userId, role);
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: string = 'TEXT',
    attachmentUrl?: string,
    role = 'AGENT',
  ) {
    if (!content?.trim() && !attachmentUrl) throw new BadRequestException('Tin nhắn cần có nội dung hoặc tệp đính kèm');
    const conversation = await this.findOne(conversationId, senderId, role);
    await this.assertChannelAccess(conversation.zaloOA.id, senderId, true, role);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'OUT',
        type: type as any,
        content,
        attachmentUrl,
        senderId,
        status: 'SENDING',
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), status: 'PROCESSING' },
      include: conversationInclude,
    });

    this.gateway.emitNewMessage(conversationId, message);
    this.gateway.emitConversationUpdate(updated);

    await this.outboundQueue.add('send', {
      messageId: message.id,
      conversationId,
    });

    return message;
  }

  private async assertChannelAccess(channelId: string, userId: string, canSend: boolean, role = 'AGENT') {
    if (role === 'ADMIN') return;
    const access = await this.prisma.oAStaffAccess.findUnique({ where: { userId_zaloOAId: { userId, zaloOAId: channelId } } });
    if (!access || (canSend && !access.canSend)) throw new ForbiddenException('Bạn chưa được cấp quyền trên kênh này');
  }
}
