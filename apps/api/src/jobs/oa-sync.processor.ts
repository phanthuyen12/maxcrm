import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_OA_SYNC } from './queues';

export interface OaSyncJobData {
  zaloOAId: string;
}

// Giả lập đồng bộ với Zalo OA API — KHÔNG gọi API Zalo thật.
@Processor(QUEUE_OA_SYNC)
export class OaSyncProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<OaSyncJobData>) {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));
    return this.prisma.zaloOA.update({
      where: { id: job.data.zaloOAId },
      data: { status: 'CONNECTED', lastSyncAt: new Date() },
    });
  }
}
