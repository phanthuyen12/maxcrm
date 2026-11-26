import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GatewayModule } from '../gateway/gateway.module';
import { OutboundMessageProcessor } from './outbound-message.processor';
import { OaSyncProcessor } from './oa-sync.processor';
import { OverdueScannerProcessor } from './overdue-scanner.processor';
import { GroupBroadcastProcessor } from './group-broadcast.processor';
import { QUEUE_GROUP_BROADCAST, QUEUE_OA_SYNC, QUEUE_OUTBOUND_MESSAGE, QUEUE_OVERDUE_SCANNER } from './queues';
import { PersonalZaloModule } from '../zalo-personal/zalo-personal.module';
import { GroupBroadcastModule } from '../group-broadcast/group-broadcast.module';

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
      { name: QUEUE_GROUP_BROADCAST },
    ),
    GatewayModule,
    PersonalZaloModule,
    GroupBroadcastModule,
  ],
  providers: [OutboundMessageProcessor, OaSyncProcessor, OverdueScannerProcessor, GroupBroadcastProcessor],
  exports: [BullModule],
})
export class JobsModule implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(QUEUE_OVERDUE_SCANNER) private overdueQueue: Queue,
    @InjectQueue(QUEUE_GROUP_BROADCAST) private groupBroadcastQueue: Queue,
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
    // Bộ quét lịch gửi nhóm chạy mỗi phút để tin được phát sát mốc hẹn giờ.
    await this.groupBroadcastQueue.add(
      'scan',
      {},
      {
        repeat: { every: 60 * 1000 },
        jobId: 'group-broadcast-repeat',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
  }
}
