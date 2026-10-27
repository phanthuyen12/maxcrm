import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  async createBackup() {
    const [users, customerSources, templateCategories, tags, customers, customerTags, appointments, notes, conversations, messages, deals, tasks, messageTemplates, activityLogs, zaloOAs, personalZaloAccounts, oaStaffAccess] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, email: true, name: true, avatar: true, role: true, isActive: true, isAcceptingChats: true, maxConcurrentChats: true, createdAt: true, updatedAt: true } }),
      this.prisma.customerSource.findMany(),
      this.prisma.templateCategory.findMany(),
      this.prisma.tag.findMany(),
      this.prisma.customer.findMany(),
      this.prisma.customerTag.findMany(),
      this.prisma.appointment.findMany(),
      this.prisma.note.findMany(),
      this.prisma.conversation.findMany(),
      this.prisma.message.findMany(),
      this.prisma.deal.findMany(),
      this.prisma.task.findMany(),
      this.prisma.messageTemplate.findMany(),
      this.prisma.activityLog.findMany(),
      this.prisma.zaloOA.findMany({ select: { id: true, name: true, avatar: true, zaloOaId: true, status: true, lastSyncAt: true, dailyMessageLimit: true, messagesSentToday: true, webhookVerifiedAt: true, provider: true, externalId: true, createdAt: true } }),
      this.prisma.personalZaloAccount.findMany({ select: { id: true, name: true, status: true, createdAt: true, updatedAt: true } }),
      this.prisma.oAStaffAccess.findMany(),
    ]);

    return {
      product: 'MAXCRM',
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      note: 'Bản sao dữ liệu CRM đã lưu; không bao gồm mật khẩu, token, proxy hoặc bí mật webhook.',
      data: { users, customerSources, templateCategories, tags, customers, customerTags, appointments, notes, conversations, messages, deals, tasks, messageTemplates, activityLogs, zaloOAs, personalZaloAccounts, oaStaffAccess },
    };
  }
}
