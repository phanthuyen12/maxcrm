import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { GroupBroadcastService } from '../group-broadcast/group-broadcast.service';
import { QUEUE_GROUP_BROADCAST } from './queues';

/**
 * Mỗi phút quét các lịch gửi nhóm đã đến hạn. Quét định kỳ thay vì đặt job hẹn
 * sẵn cho từng lịch, nhờ vậy việc sửa/xóa/tạm dừng lịch có hiệu lực ngay và lịch
 * vẫn chạy đúng sau khi API khởi động lại.
 */
@Processor(QUEUE_GROUP_BROADCAST)
export class GroupBroadcastProcessor extends WorkerHost {
  private readonly logger = new Logger(GroupBroadcastProcessor.name);

  constructor(private readonly broadcasts: GroupBroadcastService) {
    super();
  }

  async process() {
    const result = await this.broadcasts.runDueBroadcasts();
    if (result.executed > 0) this.logger.log(`Đã chạy ${result.executed}/${result.due} lịch gửi nhóm đến hạn`);
    return result;
  }
}
