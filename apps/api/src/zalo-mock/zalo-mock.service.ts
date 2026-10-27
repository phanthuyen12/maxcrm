import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';

const SAMPLE_INCOMING_MESSAGES = [
  'Shop ơi cho mình hỏi sản phẩm này còn hàng không?',
  'Bên mình có ship tới Đà Nẵng không ạ?',
  'Giá này đã bao gồm thuế chưa shop?',
  'Mình đặt hàng rồi, khi nào giao nhỉ?',
  'Cho mình xin thêm ảnh thực tế được không?',
  'Có thể đổi trả nếu không vừa size không ạ?',
  'Mình muốn đặt lịch tư vấn vào chiều mai được không?',
  'Cảm ơn shop đã hỗ trợ nhiệt tình nha!',
  'Sản phẩm này có bảo hành bao lâu vậy?',
  'Mình chuyển khoản rồi, shop kiểm tra giúp mình nhé.',
];

const FAKE_HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const FAKE_TEN = ['Văn An', 'Thị Hoa', 'Minh Tuấn', 'Thanh Trúc', 'Hữu Nghĩa', 'Ngọc Linh'];

function randomFakeName() {
  const ho = FAKE_HO[Math.floor(Math.random() * FAKE_HO.length)];
  const ten = FAKE_TEN[Math.floor(Math.random() * FAKE_TEN.length)];
  return `${ho} ${ten}`;
}

function randomSample() {
  return SAMPLE_INCOMING_MESSAGES[Math.floor(Math.random() * SAMPLE_INCOMING_MESSAGES.length)];
}

/**
 * Công cụ giả lập webhook/tin nhắn đến từ Zalo OA — dùng để demo trong môi trường
 * chưa có App ID/Secret Zalo OA thật. Mọi logic xử lý tin nhắn đến đều đi qua
 * WebhooksService (dùng chung với endpoint webhook chuẩn), KHÔNG tự viết lại ở đây.
 * KHÔNG gọi Zalo Official Account API thật.
 */
@Injectable()
export class ZaloMockService {
  constructor(
    private prisma: PrismaService,
    private webhooksService: WebhooksService,
  ) {}

  simulateIncoming(conversationId: string) {
    return this.webhooksService.ingestIncomingMessage(conversationId, randomSample());
  }

  async simulateWebhook(oaId: string) {
    const fakeZaloUserId = `zalo_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const result = await this.webhooksService.receiveWebhookEvent(
      oaId,
      {
        event_name: 'user_send_text',
        sender: { id: fakeZaloUserId },
        recipient: { id: oaId },
        message: { text: randomSample() },
        customer_name: randomFakeName(),
      },
      { skipSecretCheck: true },
    );

    const assignee = result.assignedToId
      ? await this.prisma.user.findUnique({ where: { id: result.assignedToId }, select: { name: true } })
      : null;

    return {
      conversationId: result.conversation.id,
      customerName: result.customer.name,
      isNewConversation: result.isNewConversation,
      assignedToName: assignee?.name ?? null,
    };
  }
}
