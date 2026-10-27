import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ZaloOaController } from './zalo-oa.controller';
import { ZaloOaService } from './zalo-oa.service';

@Module({
  imports: [JobsModule, WebhooksModule],
  controllers: [ZaloOaController],
  providers: [ZaloOaService],
})
export class ZaloOaModule {}
