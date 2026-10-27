import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ZaloMockController } from './zalo-mock.controller';
import { ZaloMockService } from './zalo-mock.service';

@Module({
  imports: [WebhooksModule],
  controllers: [ZaloMockController],
  providers: [ZaloMockService],
})
export class ZaloMockModule {}
