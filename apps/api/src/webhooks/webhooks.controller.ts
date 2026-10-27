import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { WebhooksService, ZaloWebhookPayload } from './webhooks.service';

/**
 * Webhook đúng chuẩn Zalo OA: Zalo sẽ gọi POST tới đây kèm header `X-Webhook-Secret`
 * (secret riêng theo từng OA, xem trang Kết nối OA) và payload dạng
 * { sender: { id }, message: { text }, event_name }.
 * Hệ thống hiện CHƯA có App ID/Secret Zalo OA thật nên endpoint này chưa nhận được
 * traffic thật từ Zalo — dữ liệu gọi vào endpoint này hiện chỉ đến từ công cụ giả lập
 * (xem module zalo-mock), nhưng hình dạng payload/bảo mật đã đúng chuẩn, sẵn sàng gắn
 * Zalo OA thật khi có App ID/Secret.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('zalo-oa/:oaId')
  async handle(
    @Param('oaId') oaId: string,
    @Headers('x-webhook-secret') secret: string,
    @Body() payload: ZaloWebhookPayload,
  ) {
    const result = await this.webhooksService.receiveWebhookEvent(oaId, payload, { secret });
    return {
      success: true,
      conversationId: result.conversation.id,
      isNewConversation: result.isNewConversation,
    };
  }
}
