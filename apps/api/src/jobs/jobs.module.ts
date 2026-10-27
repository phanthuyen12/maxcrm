import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GatewayModule } from '../gateway/gateway.module';
import { OutboundMessageProcessor } from './outbound-message.processor';
import { OaSyncProcessor } from './oa-sync.processor';
import { OverdueScannerProcessor } from './overdue-scanner.processor';
import { QUEUE_OA_SYNC, QUEUE_OUTBOUND_MESSAGE, QUEUE_OVERDUE_SCANNER } from './queues';
import { PersonalZaloModule } from '../zalo-personal/zalo-personal.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_OUTBOUND_MESSAGE },
      { name: QUEUE_OA_SYNC },
      { name: QUEUE_OVERDUE_SCANNER },
    ),
    GatewayModule,
    PersonalZaloModule,
  ],
  providers: [OutboundMessageProcessor, OaSyncProcessor, OverdueScannerProcessor],
  exports: [BullModule],
})
export class JobsModule implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(QUEUE_OVERDUE_SCANNER) private overdueQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    await this.overdueQueue.add(
      'scan',
      {},
      {
        repeat: { every: 5 * 60 * 1000 },
        jobId: 'overdue-scanner-repeat',
      },
    );
  }
}
