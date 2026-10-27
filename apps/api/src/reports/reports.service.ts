import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async overview(userId: string, role: string) {
    if (role === 'AGENT') {
      const myOpenConversations = await this.prisma.conversation.count({
        where: { assignedToId: userId, status: { in: ['UNREAD', 'PROCESSING'] } },
      });
      return { myOpenConversations };
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [newCustomersToday, newCustomersWeek, unresolvedConversations, overdueTasks, avgResponse, messagesToday, assignedPages] =
      await Promise.all([
        this.prisma.customer.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.customer.count({ where: { createdAt: { gte: weekStart } } }),
        this.prisma.conversation.count({ where: { status: { in: ['UNREAD', 'PROCESSING'] } } }),
        this.prisma.task.count({ where: { status: 'TODO', dueAt: { lt: now } } }),
        this.estimateAverageResponseMinutes(),
        this.prisma.message.count({ where: { sentAt: { gte: todayStart } } }),
        this.prisma.zaloOA.count({ where: { provider: 'FACEBOOK', staffAccess: { some: { user: { isActive: true } } } } }),
      ]);

    return {
      newCustomersToday,
      newCustomersWeek,
      unresolvedConversations,
      overdueTasks,
      avgResponseMinutes: avgResponse,
      messagesToday,
      assignedPages,
    };
  }

  async conversationOverview() {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const [weekGroups, monthGroups, yearGroups, channels] = await Promise.all([
      this.prisma.conversation.groupBy({ by: ['zaloOAId'], where: { createdAt: { gte: weekStart } }, _count: { _all: true } }),
      this.prisma.conversation.groupBy({ by: ['zaloOAId'], where: { createdAt: { gte: monthStart } }, _count: { _all: true } }),
      this.prisma.conversation.groupBy({ by: ['zaloOAId'], where: { createdAt: { gte: yearStart } }, _count: { _all: true } }),
      this.prisma.zaloOA.findMany({
        orderBy: [{ provider: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, provider: true, zaloOaId: true },
      }),
    ]);
    const countMap = (rows: typeof weekGroups) => new Map(rows.map((row) => [row.zaloOAId, row._count._all]));
    const weekByChannel = countMap(weekGroups);
    const monthByChannel = countMap(monthGroups);
    const yearByChannel = countMap(yearGroups);
    const channelStats = channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      provider: channel.provider,
      kind: channel.zaloOaId.startsWith('personal-zca-js-') ? 'PERSONAL_ZALO' : channel.provider,
      week: weekByChannel.get(channel.id) ?? 0,
      month: monthByChannel.get(channel.id) ?? 0,
      year: yearByChannel.get(channel.id) ?? 0,
    }));

    return {
      periods: {
        week: weekGroups.reduce((sum, row) => sum + row._count._all, 0),
        month: monthGroups.reduce((sum, row) => sum + row._count._all, 0),
        year: yearGroups.reduce((sum, row) => sum + row._count._all, 0),
      },
      channels: channelStats,
    };
  }

  private async estimateAverageResponseMinutes() {
    const recentOut = await this.prisma.message.findMany({
      where: { direction: 'OUT' },
      orderBy: { sentAt: 'desc' },
      take: 200,
      select: { sentAt: true, conversationId: true },
    });
    if (recentOut.length === 0) return 0;

    let totalMinutes = 0;
    let count = 0;
    for (const out of recentOut) {
      const prevIn = await this.prisma.message.findFirst({
        where: {
          conversationId: out.conversationId,
          direction: 'IN',
          sentAt: { lt: out.sentAt },
        },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true },
      });
      if (prevIn) {
        const diffMinutes = (out.sentAt.getTime() - prevIn.sentAt.getTime()) / 60000;
        if (diffMinutes >= 0 && diffMinutes < 24 * 60) {
          totalMinutes += diffMinutes;
          count++;
        }
      }
    }
    return count > 0 ? Math.round(totalMinutes / count) : 0;
  }

  async engagement(days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const messages = await this.prisma.message.findMany({
      where: { sentAt: { gte: since } },
      select: { sentAt: true, direction: true },
    });

    const buckets: Record<string, { date: string; inbound: number; outbound: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, inbound: 0, outbound: 0 };
    }

    for (const m of messages) {
      const key = m.sentAt.toISOString().slice(0, 10);
      if (!buckets[key]) continue;
      if (m.direction === 'IN') buckets[key].inbound++;
      else buckets[key].outbound++;
    }

    return Object.values(buckets);
  }

  async staffPerformance() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, avatar: true },
    });

    const result = await Promise.all(
      users.map(async (u) => {
        const [resolvedConversations, sentMessages, wonDeals, totalDeals, pendingTasks] = await Promise.all([
          this.prisma.conversation.count({ where: { assignedToId: u.id, status: 'RESOLVED' } }),
          this.prisma.message.count({ where: { senderId: u.id, direction: 'OUT' } }),
          this.prisma.deal.count({ where: { ownerId: u.id, stage: 'WON' } }),
          this.prisma.deal.count({ where: { ownerId: u.id } }),
          this.prisma.task.count({ where: { assigneeId: u.id, status: 'TODO' } }),
        ]);
        return { ...u, resolvedConversations, sentMessages, wonDeals, totalDeals, pendingTasks };
      }),
    );

    return result;
  }

  async pipelineSummary() {
    const deals = await this.prisma.deal.groupBy({
      by: ['stage'],
      _count: { _all: true },
      _sum: { value: true },
    });
    return deals.map((d) => ({
      stage: d.stage,
      count: d._count._all,
      totalValue: d._sum.value ?? 0,
    }));
  }

  async conversationStatus() {
    const counts = await this.prisma.conversation.groupBy({ by: ['status'], _count: { _all: true } });
    return counts.map((row) => ({ status: row.status, count: row._count._all }));
  }

  async customerGrowth(days = 14) {
    const safeDays = Math.max(1, Math.min(90, Math.floor(days) || 14));
    const since = new Date();
    since.setDate(since.getDate() - (safeDays - 1));
    since.setHours(0, 0, 0, 0);
    const customers = await this.prisma.customer.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const buckets = new Map<string, number>();
    for (let i = 0; i < safeDays; i++) {
      const date = new Date(since);
      date.setDate(date.getDate() + i);
      buckets.set(date.toISOString().slice(0, 10), 0);
    }
    for (const customer of customers) {
      const key = customer.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
    }
    return [...buckets].map(([date, count]) => ({ date, count }));
  }
}
