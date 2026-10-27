import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { InboxGateway } from '../gateway/inbox.gateway';
import { QUEUE_OUTBOUND_MESSAGE } from './queues';
import { PersonalZaloService } from '../zalo-personal/zalo-personal.service';
import { PersonalZaloAccountsService } from '../zalo-personal/personal-zalo-accounts.service';
import { access } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';

export interface OutboundMessageJobData {
  messageId: string;
  conversationId: string;
}

@Processor(QUEUE_OUTBOUND_MESSAGE)
export class OutboundMessageProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private gateway: InboxGateway,
    private personalZalo: PersonalZaloService,
    private personalZaloAccounts: PersonalZaloAccountsService,
  ) {
    super();
  }

  async process(job: Job<OutboundMessageJobData>) {
    const { messageId, conversationId } = job.data;

    const messageToSend = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { customer: true, zaloOA: true } } },
    });
    if (!messageToSend) throw new Error('Không tìm thấy tin nhắn cần gửi');

    let failed = false;
    try {
      const recipientId = messageToSend.conversation.customer.zaloUserId;
      if (!recipientId) throw new Error('Khách hàng chưa có ID trên kênh');
      const channel = messageToSend.conversation.zaloOA;
      const publicAttachmentUrl = messageToSend.attachmentUrl
        ? new URL(messageToSend.attachmentUrl, process.env.PUBLIC_API_URL ?? 'http://localhost:4000').toString()
        : undefined;
      if (channel.provider === 'TELEGRAM') {
        const telegramChatId = recipientId.replace(/^telegram:/, '');
        const method = publicAttachmentUrl ? (messageToSend.type === 'IMAGE' ? 'sendPhoto' : 'sendDocument') : 'sendMessage';
        const payload = publicAttachmentUrl
          ? { chat_id: telegramChatId, [messageToSend.type === 'IMAGE' ? 'photo' : 'document']: publicAttachmentUrl, caption: messageToSend.content || undefined }
          : { chat_id: telegramChatId, text: messageToSend.content };
        const response = await fetch(`https://api.telegram.org/bot${channel.accessToken}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        const result: any = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.description || 'Telegram gửi tin thất bại');
      } else if (channel.provider === 'FACEBOOK') {
        const facebookId = recipientId.replace(/^facebook:/, '');
        const message = publicAttachmentUrl
          ? { attachment: { type: messageToSend.type === 'IMAGE' ? 'image' : 'file', payload: { url: publicAttachmentUrl, is_reusable: true } } }
          : { text: messageToSend.content };
        const response = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(channel.accessToken ?? '')}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recipient: { id: facebookId }, message, messaging_type: 'RESPONSE' }) });
        const result: any = await response.json();
        if (!response.ok || result.error) throw new Error(result.error?.message || 'Facebook gửi tin thất bại');
      } else {
        const zaloChannel = await this.prisma.zaloOA.findUnique({ where: { id: messageToSend.conversation.zaloOAId }, select: { zaloOaId: true } });
        if (!zaloChannel?.zaloOaId.startsWith('personal-zca-js')) {
          throw new Error('Kênh này chưa có kết nối gửi tin Zalo thật');
        }
        const accountId = zaloChannel.zaloOaId.startsWith('personal-zca-js-') ? zaloChannel.zaloOaId.slice('personal-zca-js-'.length) : undefined;
        const attachmentPath = messageToSend.attachmentUrl ? await this.localUploadPath(messageToSend.attachmentUrl) : undefined;
        const isGroup = recipientId.startsWith('group:');
        const targetId = isGroup ? recipientId.slice('group:'.length) : recipientId;
        if (attachmentPath) {
          if (isGroup && accountId) await this.personalZaloAccounts.sendGroupAttachment(targetId, messageToSend.content, attachmentPath, accountId);
          else if (isGroup) await this.personalZalo.sendGroupAttachment(targetId, messageToSend.content, attachmentPath);
          else if (accountId) await this.personalZaloAccounts.sendAttachment(targetId, messageToSend.content, attachmentPath, accountId);
          else await this.personalZalo.sendAttachment(targetId, messageToSend.content, attachmentPath);
        } else if (isGroup && accountId) {
          await this.personalZaloAccounts.sendGroupText(targetId, messageToSend.content, accountId);
        } else if (isGroup) {
          await this.personalZalo.sendGroupText(targetId, messageToSend.content);
        } else if (accountId) {
          await this.personalZaloAccounts.sendText(targetId, messageToSend.content, accountId);
        } else {
          await this.personalZalo.sendText(targetId, messageToSend.content);
        }
      }
    } catch (error) {
      failed = true;
      console.error('Gửi tin Zalo thất bại:', error);
    }
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { status: failed ? 'FAILED' : 'SENT' },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    this.gateway.emitNewMessage(conversationId, message);

    if (!failed) {
      const oa = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { zaloOAId: true },
      });
      if (oa) {
        await this.prisma.zaloOA.update({
          where: { id: oa.zaloOAId },
          data: { messagesSentToday: { increment: 1 } },
        });
      }
    }

    return { failed };
  }

  private async localUploadPath(attachmentUrl: string) {
    let pathname: string;
    try {
      pathname = new URL(attachmentUrl, 'http://crm.local').pathname;
    } catch {
      throw new Error('Đường dẫn tệp đính kèm không hợp lệ');
    }
    if (!pathname.startsWith('/uploads/')) throw new Error('Tệp gửi Zalo phải nằm trong thư mục uploads');
    const filename = basename(pathname);
    const uploadDirectory = resolve(process.cwd(), 'uploads');
    const filePath = resolve(uploadDirectory, filename);
    if (!filename || !filePath.startsWith(`${uploadDirectory}${sep}`)) throw new Error('Đường dẫn tệp đính kèm không hợp lệ');
    await access(filePath);
    return filePath;
  }
}
