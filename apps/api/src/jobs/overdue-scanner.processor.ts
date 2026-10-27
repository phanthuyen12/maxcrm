import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { InboxGateway } from '../gateway/inbox.gateway';
import { QUEUE_OVERDUE_SCANNER } from './queues';

@Processor(QUEUE_OVERDUE_SCANNER)
export class OverdueScannerProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private gateway: InboxGateway,
  ) {
    super();
  }

  async process() {
    const overdueTasks = await this.prisma.task.count({
      where: { status: 'TODO', dueAt: { lt: new Date() } },
    });
    this.gateway.emitStatsUpdate({ overdueTasks, scannedAt: new Date() });
    return { overdueTasks };
  }
}
