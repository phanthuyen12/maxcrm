import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { JobsModule } from '../jobs/jobs.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [GatewayModule, JobsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
