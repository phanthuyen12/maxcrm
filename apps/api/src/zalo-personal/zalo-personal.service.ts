import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { API, LoginQRCallbackEventType, ThreadType, Zalo } from 'zca-js';
import { imageMetadataGetter } from './image-metadata';
import { getZaloGroupProfile, getZaloUserProfile, invalidateZaloGroupProfile } from './zalo-user-profile';
import { PrismaService } from '../prisma/prisma.service';
import { InboxGateway } from '../gateway/inbox.gateway';

function messageContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const data = value as Record<string, unknown>;
    const readable = [data.title, data.description, data.href].filter((part) => typeof part === 'string' && part.trim());
    if (readable.length) return readable.join('\n');
    return JSON.stringify(data);
  }
  return String(value ?? '');
}

@Injectable()
export class PersonalZaloService implements OnModuleDestroy {
  private api: API | null = null;
  private qrImage: string | null = null;
  private state: 'disconnected' | 'waiting_qr' | 'scanned' | 'connected' | 'reconnecting' | 'error' = 'disconnected';
  private loginPromise: Promise<void> | null = null;
  private listenerRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private listenerRetryCount = 0;
  private readonly seenMessageIds = new Set<string>();

  constructor(private readonly prisma: PrismaService, private readonly gateway: InboxGateway) {}

  getStatus() {
    return { status: this.state, qrImage: this.qrImage };
  }

  private publishStatus() {
    this.gateway.emitPersonalZaloStatus(this.getStatus());
  }

  startLogin() {
    if (this.api) return this.getStatus();
    if (this.loginPromise) return this.getStatus();
    this.state = 'waiting_qr';
    this.publishStatus();
    const zalo = new Zalo({ selfListen: false, checkUpdate: true, logging: true, imageMetadataGetter });
    this.loginPromise = zalo.loginQR({}, (event) => {
      if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
        this.qrImage = event.data.image;
        this.state = 'waiting_qr';
        this.publishStatus();
      } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
        this.state = 'scanned';
        this.publishStatus();
      } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
        this.qrImage = null;
        this.state = 'waiting_qr';
        this.publishStatus();
      }
    }).then((api) => {
      if (!api) throw new Error('Đăng nhập Zalo bị hủy');
      this.api = api;
      this.qrImage = null;
      this.state = 'connected';
      this.publishStatus();
      this.api.listener.on('message', (message) => {
        void this.receiveZaloMessage(message).catch((error) => console.error('Zalo message listener failed:', error));
      });
      this.api.listener.on('group_event', (event) => {
        void this.syncGroupProfileFromEvent(event).catch((error) => console.error('Zalo group profile update failed:', error));
      });
      const activeApi = this.api;
      this.api.listener.on('disconnected', () => {
        if (this.api !== activeApi) return;
        this.state = 'reconnecting';
        this.publishStatus();
      });
      this.api.listener.on('connected', () => {
        if (this.api !== activeApi) return;
        if (this.listenerRetryTimer) clearTimeout(this.listenerRetryTimer);
        this.listenerRetryTimer = null;
        this.listenerRetryCount = 0;
        this.state = 'connected';
        this.publishStatus();
        void this.prisma.zaloOA.updateMany({ where: { zaloOaId: 'personal-zca-js' }, data: { status: 'CONNECTED' } });
      });
      this.api.listener.on('closed', (code, reason) => {
        if (this.api !== activeApi) return;
        console.warn(`Zalo listener closed (${code}): ${reason}`);
        this.scheduleListenerReconnect(activeApi);
      });
      this.api.listener.on('error', (error) => console.warn('Zalo listener error:', error));
      this.api.listener.start({ retryOnClose: true });
    }).catch((error) => {
      this.state = 'error';
      this.qrImage = null;
      this.publishStatus();
      throw error;
    }).finally(() => {
      this.loginPromise = null;
    });
    this.loginPromise.catch((error) => console.error('Zalo personal login failed:', error));
    return this.getStatus();
  }

  private scheduleListenerReconnect(api: API) {
    // Continue retrying after extended socket/network interruptions instead
    // of silently abandoning the session after a fixed number of attempts.
    const delay = Math.min(2_000 * (2 ** Math.min(this.listenerRetryCount, 4)), 30_000);
    this.listenerRetryCount++;
    this.state = 'reconnecting';
    this.publishStatus();
    if (this.listenerRetryTimer) clearTimeout(this.listenerRetryTimer);
    this.listenerRetryTimer = setTimeout(() => {
      this.listenerRetryTimer = null;
      if (this.api !== api) return;
      try {
        api.listener.start({ retryOnClose: true });
      } catch (error) {
        console.error('Could not restart Zalo listener:', error);
        this.scheduleListenerReconnect(api);
      }
    }, delay);
  }

  async sendText(userId: string, text: string) {
    if (!this.api) throw new Error('Chưa kết nối tài khoản Zalo cá nhân');
    return this.api.sendMessage({ msg: text }, userId, ThreadType.User);
  }

  async sendAttachment(userId: string, text: string, filePath: string) {
    if (!this.api) throw new Error('Chưa kết nối tài khoản Zalo cá nhân');
    return this.api.sendMessage({ msg: text, attachments: [filePath] }, userId, ThreadType.User);
  }

  async sendGroupText(groupId: string, text: string) {
    if (!this.api) throw new Error('Chưa kết nối tài khoản Zalo cá nhân');
    return this.api.sendMessage({ msg: text }, groupId, ThreadType.Group);
  }

  async sendGroupAttachment(groupId: string, text: string, filePath: string) {
    if (!this.api) throw new Error('Chưa kết nối tài khoản Zalo cá nhân');
    return this.api.sendMessage({ msg: text, attachments: [filePath] }, groupId, ThreadType.Group);
  }

  async listGroups() {
    if (!this.api) throw new Error('Chưa kết nối tài khoản Zalo cá nhân');
    const all = await this.api.getAllGroups();
    const ids = Object.keys(all.gridVerMap);
    const result: Array<{ id: string; name: string; memberCount: number; members: Array<{ id: string; name: string; avatar: string }> }> = [];
    for (let offset = 0; offset < ids.length; offset += 50) {
      const groupInfo = await this.api.getGroupInfo(ids.slice(offset, offset + 50));
      for (const [id, info] of Object.entries(groupInfo.gridInfoMap ?? {})) {
        const memberIds = info.memberIds ?? [];
        const memberResponse = memberIds.length ? await this.api.getGroupMembersInfo(memberIds) : { profiles: {} };
        result.push({
          id,
          name: info.name,
          memberCount: info.totalMember ?? memberIds.length,
          members: Object.values(memberResponse.profiles).map((m) => ({ id: m.id, name: m.displayName || m.zaloName, avatar: m.avatar })),
        });
      }
    }
    this.gateway.emitPersonalZaloGroups(result);
    return result;
  }

  private async receiveZaloMessage(messageEvent: any) {
    const { threadId, type, isSelf, data } = messageEvent;
    const externalId = String(data?.realMsgId || data?.msgId || data?.cliMsgId || '');
    if (externalId && this.seenMessageIds.has(externalId)) return;
    try {
      const channel = await this.ensurePersonalChannel();
      const isGroup = type === ThreadType.Group;
      const externalSenderId = !isSelf ? String(data?.uidFrom ?? (isGroup ? '' : threadId)) : '';
      const eventDisplayName = String(data?.dName ?? '');
      const zaloUserId = isGroup ? `group:${threadId}` : threadId;
      let customer = await this.prisma.customer.findUnique({ where: { zaloUserId } });
      const shouldLookupProfile = Boolean(externalSenderId && (isGroup || !customer || customer.name.startsWith('Khách Zalo ') || (eventDisplayName && customer.name !== eventDisplayName)));
      const activeApi = this.api;
      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            zaloUserId,
            name: isGroup ? `Nhóm Zalo ${threadId}` : eventDisplayName || `Khách Zalo ${threadId.slice(-4)}`,
            source: isGroup ? 'Zalo cá nhân - nhóm' : 'Zalo cá nhân',
          },
        });
      }
      const text = messageContent(data?.content);
      const eventTimestamp = Number(data?.ts);
      const sentAt = Number.isFinite(eventTimestamp) && eventTimestamp > 0
        ? new Date(eventTimestamp < 10_000_000_000 ? eventTimestamp * 1000 : eventTimestamp)
        : new Date();
      const conversation = await this.prisma.conversation.upsert({
        where: { customerId_zaloOAId: { customerId: customer.id, zaloOAId: channel.id } },
        update: { ...(isSelf ? {} : { status: 'UNREAD' as const }), lastMessageAt: sentAt },
        create: { customerId: customer.id, zaloOAId: channel.id, status: isSelf ? 'PROCESSING' : 'UNREAD', lastMessageAt: sentAt },
      });
      let persistedMessage;
      if (isSelf) {
        const pending = await this.prisma.message.findFirst({ where: { conversationId: conversation.id, direction: 'OUT', content: text, sentAt: { gte: new Date(Date.now() - 120_000) } }, orderBy: { sentAt: 'desc' } });
        persistedMessage = pending
          ? await this.prisma.message.update({ where: { id: pending.id }, data: { status: 'SENT', sentAt } })
          : await this.prisma.message.create({ data: { conversationId: conversation.id, direction: 'OUT', type: 'TEXT', content: text, status: 'SENT', sentAt } });
      } else {
        persistedMessage = await this.prisma.message.create({ data: { conversationId: conversation.id, direction: 'IN', type: 'TEXT', content: text, status: 'SENT', sentAt,
          ...(isGroup && externalSenderId ? { externalSenderId, externalSenderName: eventDisplayName || undefined } : {}) } });
      }
      if (externalId) {
        this.seenMessageIds.add(externalId);
        if (this.seenMessageIds.size > 10_000) this.seenMessageIds.clear();
      }
      this.gateway.emitNewMessage(conversation.id, persistedMessage);
      const updated = await this.prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          customer: { select: { id: true, name: true, phone: true, avatar: true, status: true } },
          zaloOA: { select: { id: true, name: true, avatar: true } },
          assignedTo: { select: { id: true, name: true, avatar: true } },
        },
      });
      if (updated) this.gateway.emitConversationUpdate(updated);
      if (!isSelf && activeApi && (isGroup || shouldLookupProfile)) {
        void this.enrichInboundMessage({ api: activeApi, groupId: isGroup ? threadId : undefined, customerId: customer.id, conversationId: conversation.id, messageId: persistedMessage.id, channelId: channel.id, senderId: externalSenderId, isGroup })
          .catch((error) => console.error('Zalo profile refresh failed:', error));
      }
    } catch (error) {
      console.error(`Không thể nhận tin nhắn Zalo (${data?.uidFrom ?? threadId}):`, error);
    }
  }

  private async enrichInboundMessage(input: { api: API; groupId?: string; customerId: string; conversationId: string; messageId: string; channelId: string; senderId: string; isGroup: boolean }) {
    const [profile, group] = await Promise.all([
      input.senderId ? getZaloUserProfile(input.api, input.senderId) : Promise.resolve(null),
      input.isGroup && input.groupId ? getZaloGroupProfile(input.api, input.groupId, 'legacy') : Promise.resolve(null),
    ]);
    const currentCustomer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!currentCustomer) return;
    const displayName = input.isGroup ? group?.name : profile?.displayName || profile?.zaloName;
    const avatar = input.isGroup ? group?.fullAvt || group?.avt : profile?.avatar;
    const customerData = {
      ...(displayName && currentCustomer.name !== displayName ? { name: displayName } : {}),
      ...(avatar && currentCustomer.avatar !== avatar ? { avatar } : {}),
      ...(!input.isGroup && profile?.phoneNumber && currentCustomer.phone !== profile.phoneNumber ? { phone: profile.phoneNumber } : {}),
    };
    let changed = false;
    if (Object.keys(customerData).length) {
      await this.prisma.customer.update({ where: { id: input.customerId }, data: customerData });
      changed = true;
    }
    if (input.isGroup && input.senderId) {
      const currentMessage = await this.prisma.message.findUnique({ where: { id: input.messageId }, select: { externalSenderName: true, externalSenderAvatar: true } });
      const senderName = profile?.displayName || profile?.zaloName || currentMessage?.externalSenderName;
      if (senderName !== currentMessage?.externalSenderName || profile?.avatar && profile.avatar !== currentMessage?.externalSenderAvatar) {
        await this.prisma.message.update({ where: { id: input.messageId }, data: {
          externalSenderId: input.senderId,
          externalSenderName: senderName,
          externalSenderAvatar: profile?.avatar || currentMessage?.externalSenderAvatar,
        } });
        changed = true;
      }
    }
    if (changed) this.gateway.emitConversationUpdate({ id: input.conversationId, zaloOAId: input.channelId, customerId: input.customerId });
  }

  private async syncGroupProfileFromEvent(event: any) {
    const groupId = String(event?.threadId ?? event?.data?.groupId ?? event?.data?.group_id ?? '');
    if (!groupId) return;
    invalidateZaloGroupProfile('legacy', groupId);
    const api = this.api;
    if (!api) return;
    const profile = await getZaloGroupProfile(api, groupId, 'legacy');
    const name = profile?.name || String(event?.data?.groupName ?? '').trim();
    const avatar = profile?.fullAvt || profile?.avt || event?.data?.fullAvt || event?.data?.avt || null;
    if (!name && !avatar) return;
    const customer = await this.prisma.customer.findUnique({ where: { zaloUserId: `group:${groupId}` } });
    if (!customer) return;
    const updated = await this.prisma.customer.update({ where: { id: customer.id }, data: {
      ...(name && customer.name !== name ? { name } : {}),
      ...(avatar && customer.avatar !== avatar ? { avatar } : {}),
    } });
    if (updated.name === customer.name && updated.avatar === customer.avatar) return;
    const channel = await this.ensurePersonalChannel();
    this.gateway.emitConversationUpdate({ zaloOAId: channel.id, customerId: updated.id });
  }

  private async ensurePersonalChannel() {
    let channel = await this.prisma.zaloOA.findUnique({ where: { zaloOaId: 'personal-zca-js' } });
    if (!channel) {
      channel = await this.prisma.zaloOA.create({
        data: { zaloOaId: 'personal-zca-js', name: 'Zalo cá nhân', status: 'CONNECTED' },
      });
    }
    return channel;
  }

  async disconnect() {
    if (this.listenerRetryTimer) clearTimeout(this.listenerRetryTimer);
    this.listenerRetryTimer = null;
    this.listenerRetryCount = 0;
    this.api?.listener.stop();
    this.api = null;
    this.qrImage = null;
    this.state = 'disconnected';
    this.publishStatus();
    return this.getStatus();
  }

  onModuleDestroy() {
    if (this.listenerRetryTimer) clearTimeout(this.listenerRetryTimer);
    this.api?.listener.stop();
  }
}
