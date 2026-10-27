import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { QUEUE_OA_SYNC } from '../jobs/queues';

const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:4000';

@Injectable()
export class ZaloOaService {
  constructor(
    private prisma: PrismaService,
    private webhooksService: WebhooksService,
    @InjectQueue(QUEUE_OA_SYNC) private oaSyncQueue: Queue,
  ) {}

  private withWebhookInfo<T extends { id: string }>(oa: T) {
    return { ...oa, webhookUrl: `${PUBLIC_API_URL}/api/webhooks/zalo-oa/${oa.id}` };
  }

  async findAll(userId: string, role: string) {
    const oas = await this.prisma.zaloOA.findMany({
      where: {
        provider: 'ZALO',
        NOT: { zaloOaId: { startsWith: 'personal-zca-js-' } },
        ...(role !== 'ADMIN' ? { staffAccess: { some: { userId } } } : {}),
      },
      include: {
        staffAccess: {
          include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
        },
        _count: { select: { conversations: true } },
      },
      orderBy: { name: 'asc' },
    });
    return oas.map((oa) => this.withWebhookInfo(oa));
  }

  async findOne(id: string) {
    const oa = await this.prisma.zaloOA.findUnique({
      where: { id },
      include: {
        staffAccess: {
          include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
        },
      },
    });
    if (!oa) throw new NotFoundException('Không tìm thấy Zalo OA');
    return this.withWebhookInfo(oa);
  }

  // Giả lập quy trình kết nối lại OAuth với Zalo OA — KHÔNG gọi API Zalo thật.
  async reconnect(id: string) {
    await this.findOne(id);
    await this.prisma.zaloOA.update({
      where: { id },
      data: { status: 'DISCONNECTED' },
    });
    await this.oaSyncQueue.add('sync', { zaloOAId: id });
    return { success: true, message: 'Đang kết nối lại, vui lòng chờ đồng bộ...' };
  }

  async rotateWebhookSecret(id: string) {
    await this.findOne(id);
    const webhookSecret = randomUUID();
    await this.prisma.zaloOA.update({ where: { id }, data: { webhookSecret } });
    return this.findOne(id);
  }

  async testWebhook(id: string) {
    await this.findOne(id);
    const result = await this.webhooksService.receiveWebhookEvent(
      id,
      {
        event_name: 'user_send_text',
        sender: { id: `webhook_test_${id}` },
        message: { text: 'Đây là tin nhắn kiểm tra webhook (tự động).' },
        customer_name: 'Khách kiểm tra webhook',
      },
      { skipSecretCheck: true },
    );
    await this.prisma.zaloOA.update({ where: { id }, data: { webhookVerifiedAt: new Date() } });
    return { success: true, conversationId: result.conversation.id };
  }

  async updateStaffAccess(zaloOAId: string, userId: string, canSend: boolean) {
    if (typeof canSend !== 'boolean') throw new BadRequestException('canSend phải là true hoặc false');
    const [channel, user] = await Promise.all([
      this.prisma.zaloOA.findUnique({ where: { id: zaloOAId }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true, role: true } }),
    ]);
    if (!channel) throw new NotFoundException('Không tìm thấy kênh');
    if (!user?.isActive || user.role === 'ADMIN') throw new NotFoundException('Không tìm thấy nhân viên đang hoạt động');
    return this.prisma.oAStaffAccess.upsert({
      where: { userId_zaloOAId: { userId, zaloOAId } },
      update: { canSend },
      create: { userId, zaloOAId, canSend },
    });
  }

  async removeStaffAccess(zaloOAId: string, userId: string) {
    const access = await this.prisma.oAStaffAccess.findUnique({ where: { userId_zaloOAId: { userId, zaloOAId } }, select: { id: true } });
    if (!access) throw new NotFoundException('Nhân viên chưa được cấp quyền trên kênh này');
    await this.prisma.oAStaffAccess.delete({
      where: { userId_zaloOAId: { userId, zaloOAId } },
    });
    return { success: true };
  }
}
