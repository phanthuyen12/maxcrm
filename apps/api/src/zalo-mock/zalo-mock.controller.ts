import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ZaloMockService } from './zalo-mock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('zalo-mock')
export class ZaloMockController {
  constructor(private zaloMockService: ZaloMockService) {}

  @Post('simulate-incoming')
  simulateIncoming(@Body('conversationId') conversationId: string) {
    return this.zaloMockService.simulateIncoming(conversationId);
  }

  @Post('simulate-webhook')
  simulateWebhook(@Body('oaId') oaId: string) {
    return this.zaloMockService.simulateWebhook(oaId);
  }
}
