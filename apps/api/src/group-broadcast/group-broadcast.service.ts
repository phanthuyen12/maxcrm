import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GroupBroadcastRepeat, GroupBroadcastStatus, Prisma, Role } from '@prisma/client';
import type { Style } from 'zca-js';
import { PrismaService } from '../prisma/prisma.service';
import { PersonalZaloAccountsService } from '../zalo-personal/personal-zalo-accounts.service';
import { htmlToZaloMessage } from '../zalo-personal/html-message';
import { UpsertGroupBroadcastDto } from './dto/upsert-group-broadcast.dto';
import { firstRunAt, nextRunAfter, parseWeekdays, serializeWeekdays } from './group-broadcast.schedule';

type RunResultItem = { groupId: string; groupName: string; status: 'pending' | 'sent' | 'failed'; error?: string; sentAt?: string };

const BROADCAST_INCLUDE = {
  targets: { orderBy: { groupName: 'asc' } },
  createdBy: { select: { id: true, name: true, avatar: true } },
  account: { select: { id: true, name: true, status: true } },
  runs: { orderBy: { startedAt: 'desc' }, take: 5 },
} as const satisfies Prisma.GroupBroadcastInclude;

@Injectable()
export class GroupBroadcastService {
  private readonly logger = new Logger(GroupBroadcastService.name);
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: PersonalZaloAccountsService,
  ) {}

  /** Nhóm để chọn khi tạo lịch — gọn nhẹ hơn danh sách nhóm đầy đủ. */
  groups(accountId: string, userId: string, role: string) {
    return this.accounts.groupSummaries(accountId, userId, role);
  }

  /** Xem trước nội dung sẽ xuất hiện trên Zalo (văn bản thuần + các khoảng định dạng). */
  preview(contentHtml: string) {
    const content = htmlToZaloMessage(contentHtml ?? '');
    return { text: content.text, styles: content.styles, length: content.text.length };
  }

  async list(userId: string, role: string) {
    const where: Prisma.GroupBroadcastWhereInput = role === Role.ADMIN ? {} : { createdById: userId };
    const broadcasts = await this.prisma.groupBroadcast.findMany({
      where,
      include: BROADCAST_INCLUDE,
      orderBy: [{ nextRunAt: 'asc' }, { createdAt: 'desc' }],
    });
    return broadcasts.map((broadcast) => this.view(broadcast));
  }

  async get(id: string, userId: string, role: string) {
    await this.load(id, userId, role);
    return this.view(await this.prisma.groupBroadcast.findUniqueOrThrow({ where: { id }, include: BROADCAST_INCLUDE }));
  }

  async create(dto: UpsertGroupBroadcastDto, userId: string, role: string) {
    const { content, targets, nextRun, repeat, scheduledAt } = await this.validate(dto, userId, role);
    const broadcast = await this.prisma.groupBroadcast.create({
      data: {
        accountId: dto.accountId,
        name: dto.name.trim(),
        contentHtml: dto.contentHtml,
        contentText: content.text,
        styles: content.styles as unknown as Prisma.InputJsonValue,
        repeat,
        repeatDays: serializeWeekdays(dto.repeatDays),
        scheduledAt,
        nextRunAt: nextRun,
        intervalMs: dto.intervalMs ?? 2000,
        status: GroupBroadcastStatus.SCHEDULED,
        createdById: userId,
        targets: { create: targets },
      },
      include: BROADCAST_INCLUDE,
    });
    return this.view(broadcast);
  }

  async update(id: string, dto: UpsertGroupBroadcastDto, userId: string, role: string) {
    const existing = await this.load(id, userId, role);
    if (existing.status === GroupBroadcastStatus.RUNNING) throw new BadRequestException('Lịch đang gửi, hãy chờ gửi xong rồi sửa');
    const { content, targets, nextRun, repeat, scheduledAt } = await this.validate(dto, userId, role);
    const broadcast = await this.prisma.$transaction(async (tx) => {
      await tx.groupBroadcastTarget.deleteMany({ where: { broadcastId: id } });
      return tx.groupBroadcast.update({
        where: { id },
        data: {
          accountId: dto.accountId,
          name: dto.name.trim(),
          contentHtml: dto.contentHtml,
          contentText: content.text,
          styles: content.styles as unknown as Prisma.InputJsonValue,
          repeat,
          repeatDays: serializeWeekdays(dto.repeatDays),
          scheduledAt,
          nextRunAt: nextRun,
          intervalMs: dto.intervalMs ?? 2000,
          status: GroupBroadcastStatus.SCHEDULED,
          targets: { create: targets },
        },
        include: BROADCAST_INCLUDE,
      });
    });
    return this.view(broadcast);
  }

  async remove(id: string, userId: string, role: string) {
    const existing = await this.load(id, userId, role);
    if (existing.status === GroupBroadcastStatus.RUNNING) throw new BadRequestException('Lịch đang gửi, không thể xóa lúc này');
    await this.prisma.groupBroadcast.delete({ where: { id } });
    return { id };
  }

  async pause(id: string, userId: string, role: string) {
    const existing = await this.load(id, userId, role);
    if (existing.status !== GroupBroadcastStatus.SCHEDULED) throw new BadRequestException('Chỉ tạm dừng được lịch đang chờ gửi');
    return this.view(await this.prisma.groupBroadcast.update({ where: { id }, data: { status: GroupBroadcastStatus.PAUSED }, include: BROADCAST_INCLUDE }));
  }

  async resume(id: string, userId: string, role: string) {
    const existing = await this.load(id, userId, role);
    if (existing.status !== GroupBroadcastStatus.PAUSED) throw new BadRequestException('Chỉ tiếp tục được lịch đang tạm dừng');
    const weekdays = parseWeekdays(existing.repeatDays);
    const nextRun = existing.nextRunAt && existing.nextRunAt.getTime() > Date.now()
      ? existing.nextRunAt
      : firstRunAt(existing.nextRunAt ?? existing.scheduledAt, existing.repeat, weekdays);
    if (!nextRun) throw new BadRequestException('Mốc gửi đã trôi qua. Hãy sửa lại thời gian hẹn giờ.');
    return this.view(await this.prisma.groupBroadcast.update({ where: { id }, data: { status: GroupBroadcastStatus.SCHEDULED, nextRunAt: nextRun }, include: BROADCAST_INCLUDE }));
  }

  async cancel(id: string, userId: string, role: string) {
    const existing = await this.load(id, userId, role);
    if (existing.status === GroupBroadcastStatus.RUNNING) throw new BadRequestException('Lịch đang gửi, không thể hủy lúc này');
    return this.view(await this.prisma.groupBroadcast.update({ where: { id }, data: { status: GroupBroadcastStatus.CANCELED, nextRunAt: null }, include: BROADCAST_INCLUDE }));
  }

  /**
   * Gửi ngay một lần, không dịch mốc hẹn giờ kế tiếp. Lượt gửi chạy ở chế độ nền
   * vì gửi vài chục nhóm có giãn cách sẽ lâu hơn một request HTTP nên chịu được.
   */
  async runNow(id: string, userId: string, role: string) {
    const existing = await this.load(id, userId, role);
    if (existing.status === GroupBroadcastStatus.RUNNING || this.running.has(id)) throw new BadRequestException('Lịch này đang gửi');
    await this.accounts.assertCanSend(existing.accountId, userId, role);
    if (!this.accounts.isConnected(existing.accountId)) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    const claimed = await this.prisma.groupBroadcast.updateMany({
      where: { id, status: existing.status },
      data: { status: GroupBroadcastStatus.RUNNING },
    });
    if (claimed.count === 0) throw new BadRequestException('Lịch này vừa được chạy ở nơi khác');
    void this.execute(id, { keepSchedule: true, restoreStatus: existing.status }).catch(async (error) => {
      this.logger.error(`Gửi ngay lịch ${id} thất bại: ${error instanceof Error ? error.message : error}`);
      await this.prisma.groupBroadcast.updateMany({ where: { id }, data: { status: existing.status } });
    });
    return { started: true, broadcastId: id };
  }

  async runs(id: string, userId: string, role: string) {
    await this.load(id, userId, role);
    return this.prisma.groupBroadcastRun.findMany({ where: { broadcastId: id }, orderBy: { startedAt: 'desc' }, take: 30 });
  }

  /**
   * Được bộ quét định kỳ gọi mỗi phút: nhận các lịch đã đến hạn và gửi tuần tự.
   * Trạng thái RUNNING được ghi bằng `updateMany` có điều kiện nên một lịch
   * không thể bị hai lượt quét cùng nhận.
   */
  async runDueBroadcasts(now = new Date()) {
    const due = await this.prisma.groupBroadcast.findMany({
      where: { status: GroupBroadcastStatus.SCHEDULED, nextRunAt: { lte: now } },
      select: { id: true },
      orderBy: { nextRunAt: 'asc' },
      take: 20,
    });
    let executed = 0;
    for (const { id } of due) {
      if (this.running.has(id)) continue;
      const claimed = await this.prisma.groupBroadcast.updateMany({
        where: { id, status: GroupBroadcastStatus.SCHEDULED },
        data: { status: GroupBroadcastStatus.RUNNING },
      });
      if (claimed.count === 0) continue;
      try {
        await this.execute(id, { keepSchedule: false });
        executed++;
      } catch (error) {
        this.logger.error(`Lịch gửi nhóm ${id} thất bại: ${error instanceof Error ? error.message : error}`);
        await this.prisma.groupBroadcast.updateMany({ where: { id }, data: { status: GroupBroadcastStatus.FAILED } });
      }
    }
    return { due: due.length, executed };
  }

  private async execute(id: string, options: { keepSchedule: boolean; restoreStatus?: GroupBroadcastStatus }) {
    this.running.add(id);
    try {
      const broadcast = await this.prisma.groupBroadcast.findUnique({ where: { id }, include: { targets: true } });
      if (!broadcast) throw new NotFoundException('Không tìm thấy lịch gửi');
      const results: RunResultItem[] = broadcast.targets.map((target) => ({ groupId: target.groupId, groupName: target.groupName, status: 'pending' }));
      const run = await this.prisma.groupBroadcastRun.create({
        data: { broadcastId: id, status: 'running', total: results.length, results: results as unknown as Prisma.InputJsonValue },
      });

      let sent = 0;
      let failed = 0;
      const connected = this.accounts.isConnected(broadcast.accountId);
      const styles = (broadcast.styles ?? []) as unknown as Style[];
      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        if (!connected) {
          result.status = 'failed';
          result.error = 'Tài khoản Zalo chưa kết nối';
          failed++;
          continue;
        }
        try {
          await this.accounts.sendGroupRichMessage({
            accountId: broadcast.accountId,
            groupId: result.groupId,
            groupName: result.groupName,
            text: broadcast.contentText,
            styles,
            senderId: broadcast.createdById,
          });
          result.status = 'sent';
          result.sentAt = new Date().toISOString();
          sent++;
        } catch (error) {
          result.status = 'failed';
          result.error = error instanceof Error ? error.message : 'Zalo từ chối gửi tin';
          failed++;
        }
        await this.prisma.groupBroadcastRun.update({
          where: { id: run.id },
          data: { sent, failed, results: results as unknown as Prisma.InputJsonValue },
        });
        if (index < results.length - 1) await new Promise((resolve) => setTimeout(resolve, broadcast.intervalMs));
      }

      const finished = await this.prisma.groupBroadcastRun.update({
        where: { id: run.id },
        data: { status: 'completed', sent, failed, results: results as unknown as Prisma.InputJsonValue, finishedAt: new Date() },
      });

      if (!options.keepSchedule) {
        const weekdays = parseWeekdays(broadcast.repeatDays);
        const nextRun = nextRunAfter(broadcast.nextRunAt ?? broadcast.scheduledAt, broadcast.repeat, weekdays);
        await this.prisma.groupBroadcast.update({
          where: { id },
          data: {
            lastRunAt: new Date(),
            nextRunAt: nextRun,
            status: nextRun
              ? GroupBroadcastStatus.SCHEDULED
              : sent === 0
                ? GroupBroadcastStatus.FAILED
                : GroupBroadcastStatus.COMPLETED,
          },
        });
      } else {
        await this.prisma.groupBroadcast.update({
          where: { id },
          data: { lastRunAt: new Date(), ...(options.restoreStatus ? { status: options.restoreStatus } : {}) },
        });
      }
      return finished;
    } finally {
      this.running.delete(id);
    }
  }

  private async validate(dto: UpsertGroupBroadcastDto, userId: string, role: string) {
    const content = htmlToZaloMessage(dto.contentHtml ?? '');
    if (!content.text.trim()) throw new BadRequestException('Nội dung tin nhắn đang trống');

    const targets = [...new Map(dto.targets
      .filter((target) => target.groupId?.trim())
      .map((target) => [target.groupId.trim(), { groupId: target.groupId.trim(), groupName: target.groupName?.trim() || `Nhóm ${target.groupId.trim()}` }])).values()];
    if (!targets.length) throw new BadRequestException('Hãy chọn ít nhất một nhóm để gửi');

    await this.accounts.assertCanSendToGroups(dto.accountId, targets.map((target) => target.groupId), userId, role);

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Thời điểm hẹn giờ không hợp lệ');
    const repeat = dto.repeat ?? GroupBroadcastRepeat.NONE;
    const weekdays = parseWeekdays((dto.repeatDays ?? []).join(','));
    if (repeat === GroupBroadcastRepeat.WEEKLY && !weekdays.length) throw new BadRequestException('Hãy chọn ít nhất một thứ trong tuần');
    const nextRun = firstRunAt(scheduledAt, repeat, weekdays);
    if (!nextRun) throw new BadRequestException('Thời điểm hẹn giờ đã trôi qua. Hãy chọn mốc trong tương lai.');

    return { content, targets, nextRun, repeat, scheduledAt };
  }

  private async load(id: string, userId: string, role: string) {
    const broadcast = await this.prisma.groupBroadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException('Không tìm thấy lịch gửi tin');
    if (role !== Role.ADMIN && broadcast.createdById !== userId) throw new ForbiddenException('Bạn không có quyền với lịch gửi này');
    return broadcast;
  }

  private view(broadcast: Prisma.GroupBroadcastGetPayload<{ include: typeof BROADCAST_INCLUDE }>) {
    const latestRun = broadcast.runs.at(0) ?? null;
    return {
      id: broadcast.id,
      name: broadcast.name,
      accountId: broadcast.accountId,
      account: broadcast.account,
      contentHtml: broadcast.contentHtml,
      contentText: broadcast.contentText,
      repeat: broadcast.repeat,
      repeatDays: parseWeekdays(broadcast.repeatDays),
      scheduledAt: broadcast.scheduledAt,
      nextRunAt: broadcast.nextRunAt,
      lastRunAt: broadcast.lastRunAt,
      status: broadcast.status,
      intervalMs: broadcast.intervalMs,
      createdBy: broadcast.createdBy,
      createdAt: broadcast.createdAt,
      targets: broadcast.targets.map((target) => ({ groupId: target.groupId, groupName: target.groupName })),
      latestRun: latestRun && {
        id: latestRun.id,
        status: latestRun.status,
        total: latestRun.total,
        sent: latestRun.sent,
        failed: latestRun.failed,
        startedAt: latestRun.startedAt,
        finishedAt: latestRun.finishedAt,
        results: (latestRun.results ?? []) as unknown as RunResultItem[],
      },
    };
  }
}
