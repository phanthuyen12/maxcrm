import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InboxGateway } from '../gateway/inbox.gateway';

const conversationInclude = {
  customer: { select: { id: true, name: true, phone: true, avatar: true, status: true } },
  zaloOA: { select: { id: true, name: true, avatar: true } },
  assignedTo: { select: { id: true, name: true, avatar: true } },
};

export interface ZaloWebhookPayload {
  event_name?: string;
  sender?: { id: string };
  recipient?: { id: string };
  message?: { text?: string };
  timestamp?: string;
  // Field riêng của bộ giả lập (không có trong payload Zalo OA thật), chỉ dùng khi
  // webhook tạo khách hàng mới để đặt tên hiển thị thay vì "Khách Zalo xxxx".
  customer_name?: string;
}

/**
 * Chuẩn hoá xử lý tin nhắn đến cho cả webhook thật (chưa có App ID/Secret Zalo OA nên
 * chưa thể nhận webhook thật từ Zalo) và công cụ giả lập trong module zalo-mock —
 * cả hai đều đi qua đúng 1 đường xử lý này để không trùng lặp logic.
 */
@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private gateway: InboxGateway,
  ) {}

  verifySecret(oaSecret: string | null | undefined, provided?: string) {
    if (!oaSecret || !provided || oaSecret !== provided) {
      throw new UnauthorizedException('Webhook secret không hợp lệ');
    }
  }

  /** Nhân viên ít hội thoại đang xử lý nhất trong số người có quyền + đang "nhận chat" trên kênh. */
  async pickAssignee(zaloOAId: string): Promise<string | null> {
    const access = await this.prisma.oAStaffAccess.findMany({
      where: { zaloOAId, user: { isActive: true, isAcceptingChats: true } },
      include: { user: true },
    });
    if (access.length === 0) return null;

    let best: { userId: string; load: number } | null = null;
    for (const a of access) {
      const load = await this.prisma.conversation.count({
        where: { assignedToId: a.userId, status: { not: 'RESOLVED' } },
      });
      if (load >= a.user.maxConcurrentChats) continue;
      if (!best || load < best.load) best = { userId: a.userId, load };
    }
    return best?.userId ?? null;
  }

  async receiveWebhookEvent(
    zaloOAId: string,
    payload: ZaloWebhookPayload,
    options: { secret?: string; skipSecretCheck?: boolean } = {},
  ) {
    const oa = await this.prisma.zaloOA.findUnique({ where: { id: zaloOAId } });
    if (!oa) throw new NotFoundException('Không tìm thấy Zalo OA');
    if (!options.skipSecretCheck) {
      this.verifySecret(oa.webhookSecret, options.secret);
    }

    const zaloUserId = payload.sender?.id;
    const text = payload.message?.text?.trim();
    if (!zaloUserId || !text) {
      throw new BadRequestException('Payload webhook thiếu sender.id hoặc message.text');
    }

    let customer = await this.prisma.customer.findUnique({ where: { zaloUserId } });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          name: payload.customer_name || `Khách Zalo ${zaloUserId.slice(-4)}`,
          zaloUserId,
          source: 'Zalo OA',
          status: 'NEW',
        },
      });
    }

    let conversation = await this.prisma.conversation.findUnique({
      where: { customerId_zaloOAId: { customerId: customer.id, zaloOAId } },
    });
    let isNewConversation = false;
    let assignedToId: string | null = null;
    if (!conversation) {
      isNewConversation = true;
      assignedToId = await this.pickAssignee(zaloOAId);
      conversation = await this.prisma.conversation.create({
        data: { customerId: customer.id, zaloOAId, assignedToId, status: 'UNREAD' },
      });
    }

    const message = await this.ingestIncomingMessage(conversation.id, text);
    return { conversation, message, isNewConversation, customer, assignedToId };
  }

  /** Logic lõi: tạo Message IN, cập nhật Conversation, phát realtime qua Socket.IO. */
  async ingestIncomingMessage(conversationId: string, text: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Không tìm thấy hội thoại');

    const message = await this.prisma.message.create({
      data: { conversationId, direction: 'IN', type: 'TEXT', content: text, status: 'SENT' },
    });

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'UNREAD', lastMessageAt: new Date() },
      include: conversationInclude,
    });

    this.gateway.emitNewMessage(conversationId, message);
    this.gateway.emitConversationUpdate(updated);
    await this.gateway.notifyAssignedUser(conversationId, message);

    return message;
  }
}
