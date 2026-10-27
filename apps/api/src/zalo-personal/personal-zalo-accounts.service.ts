import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { API, LoginQRCallbackEventType, ThreadType, Zalo } from 'zca-js';
import nodeFetch from 'node-fetch';
import { imageMetadataGetter } from './image-metadata';
import { getZaloGroupProfile, getZaloUserProfile, invalidateZaloGroupProfile } from './zalo-user-profile';
import { PrismaService } from '../prisma/prisma.service';
import { InboxGateway } from '../gateway/inbox.gateway';

const HttpsProxyAgent: new (proxyUrl: string) => any = require('https-proxy-agent').HttpsProxyAgent;
const SocksProxyAgent: new (proxyUrl: string) => any = require('socks-proxy-agent').SocksProxyAgent;

type AccountSession = { api: API | null; qrImage: string | null; status: string; loginPromise: Promise<void> | null; listenerRetryTimer: ReturnType<typeof setTimeout> | null; listenerRetryCount: number };
type BulkRecipient = { userId: string; displayName?: string };
type BulkBatch = {
  id: string;
  accountId: string;
  status: 'running' | 'completed';
  total: number;
  sent: number;
  failed: number;
  results: Array<{ userId: string; displayName: string; status: 'pending' | 'sent' | 'failed'; error?: string }>;
};

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
export class PersonalZaloAccountsService implements OnModuleDestroy {
  private readonly sessions = new Map<string, AccountSession>();
  private readonly seenMessageIds = new Set<string>();
  private readonly bulkBatches = new Map<string, BulkBatch>();

  constructor(private readonly prisma: PrismaService, private readonly gateway: InboxGateway) {}

  private session(id: string): AccountSession {
    let session = this.sessions.get(id);
    if (!session) {
      session = { api: null, qrImage: null, status: 'disconnected', loginPromise: null, listenerRetryTimer: null, listenerRetryCount: 0 };
      this.sessions.set(id, session);
    }
    return session;
  }

  private async account(id: string) {
    const account = await this.prisma.personalZaloAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản Zalo');
    return account;
  }

  private async channel(account: { id: string; name: string }) {
    return this.prisma.zaloOA.upsert({
      where: { zaloOaId: `personal-zca-js-${account.id}` },
      update: { name: `Zalo cá nhân — ${account.name}` },
      create: { zaloOaId: `personal-zca-js-${account.id}`, name: `Zalo cá nhân — ${account.name}`, status: 'DISCONNECTED' },
    });
  }

  private async view(account: { id: string; name: string; proxyUrl: string | null; status: string; createdAt: Date }) {
    const session = this.session(account.id);
    const channel = await this.channel(account);
    const staffAccess = await this.prisma.oAStaffAccess.findMany({
      where: { zaloOAId: channel.id },
      include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
      orderBy: { user: { name: 'asc' } },
    });
    return { id: account.id, name: account.name, hasProxy: Boolean(account.proxyUrl), proxyType: account.proxyUrl ? new URL(account.proxyUrl).protocol.slice(0, -1) : null,
      status: session.status, qrImage: session.qrImage, createdAt: account.createdAt, channelId: channel.id, staffAccess };
  }

  async list(userId: string, role: string) {
    const accounts = await this.prisma.personalZaloAccount.findMany({ orderBy: { createdAt: 'asc' } });
    const visible = role === 'ADMIN' ? accounts : await Promise.all(accounts.map(async (account) => {
      const channel = await this.channel(account);
      return await this.prisma.oAStaffAccess.findUnique({ where: { userId_zaloOAId: { userId, zaloOAId: channel.id } }, select: { id: true } }) ? account : null;
    }));
    return Promise.all(visible.filter((account): account is NonNullable<typeof account> => Boolean(account)).map((account) => this.view(account)));
  }

  async create(name: string, proxyUrl?: string, ownerId?: string) {
    if (!name?.trim()) throw new BadRequestException('Vui lòng nhập tên tài khoản');
    let normalizedProxy: string | null = null;
    if (proxyUrl?.trim()) {
      try {
        const parsed = new URL(proxyUrl.trim());
        if (!['http:', 'https:', 'socks:', 'socks4:', 'socks4a:', 'socks5:', 'socks5h:'].includes(parsed.protocol)) throw new Error();
        normalizedProxy = parsed.toString();
      } catch { throw new BadRequestException('Proxy không hợp lệ. Dùng http://, https:// hoặc socks5://'); }
    }
    const account = await this.prisma.personalZaloAccount.create({ data: { name: name.trim(), proxyUrl: normalizedProxy } });
    const channel = await this.channel(account);
    if (ownerId) await this.prisma.oAStaffAccess.upsert({ where: { userId_zaloOAId: { userId: ownerId, zaloOAId: channel.id } }, update: { canSend: true }, create: { userId: ownerId, zaloOAId: channel.id, canSend: true } });
    return this.view(account);
  }

  async updateProxy(id: string, proxyUrl: string | null, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    let normalizedProxy: string | null = null;
    if (proxyUrl?.trim()) {
      try {
        const parsed = new URL(proxyUrl.trim());
        if (!['http:', 'https:', 'socks:', 'socks4:', 'socks4a:', 'socks5:', 'socks5h:'].includes(parsed.protocol)) throw new Error();
        normalizedProxy = parsed.toString();
      } catch { throw new BadRequestException('Proxy không hợp lệ. Dùng http://, https:// hoặc socks5://'); }
    }
    await this.disconnect(id, userId, role);
    const updated = await this.prisma.personalZaloAccount.update({ where: { id }, data: { proxyUrl: normalizedProxy } });
    return this.view(updated);
  }

  async remove(id: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    await this.disconnect(id, userId, role);
    this.sessions.delete(id);
    await this.prisma.personalZaloAccount.delete({ where: { id } });
    return { success: true };
  }

  async status(id: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    return this.view(account);
  }

  async startLogin(id: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const session = this.session(id);
    if (session.api || session.loginPromise) return this.view(account);
    session.status = 'waiting_qr';
    this.publish(id, session);
    let agent: any;
    if (account.proxyUrl) {
      const protocol = new URL(account.proxyUrl).protocol;
      if (protocol.startsWith('socks')) agent = new SocksProxyAgent(account.proxyUrl);
      else agent = new HttpsProxyAgent(account.proxyUrl);
    }
    const zalo = new Zalo(Object.assign(
      // Listen to events generated by this account as well as inbound events;
      // otherwise the message listener misses self-sent messages and event updates.
      { selfListen: true, checkUpdate: true, logging: true, imageMetadataGetter },
      agent ? { agent, polyfill: nodeFetch as unknown as typeof fetch } : {},
    ));
    session.loginPromise = zalo.loginQR({}, (event) => {
      if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
        session.qrImage = event.data.image;
        session.status = 'waiting_qr';
        this.publish(id, session);
      } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
        session.status = 'scanned';
        this.publish(id, session);
      } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
        session.qrImage = null;
        session.status = 'waiting_qr';
        this.publish(id, session);
      }
    }).then(async (api) => {
      if (!api) throw new Error('Đăng nhập Zalo bị hủy');
      session.api = api;
      session.qrImage = null;
      session.status = 'connected';
      await this.channel(account);
      await this.prisma.zaloOA.update({ where: { zaloOaId: `personal-zca-js-${id}` }, data: { status: 'CONNECTED' } });
      this.publish(id, session);
      api.listener.on('message', (message) => {
        this.receiveZaloMessage(id, message).catch((error) => console.error(`Personal Zalo message processing failed (${id}):`, error));
      });
      api.listener.on('group_event', (event) => {
        void this.syncGroupProfileFromEvent(id, event).catch((error) => console.error(`Zalo group profile update failed (${id}):`, error));
      });
      api.listener.on('disconnected', (code, reason) => {
        if (session.api !== api) return;
        console.warn(`Zalo listener disconnected for ${id} (${code}): ${reason}`);
        session.status = 'reconnecting';
        this.publish(id, session);
      });
      api.listener.on('connected', () => {
        if (session.api !== api) return;
        if (session.listenerRetryTimer) clearTimeout(session.listenerRetryTimer);
        session.listenerRetryTimer = null;
        session.listenerRetryCount = 0;
        session.status = 'connected';
        this.publish(id, session);
        void this.prisma.zaloOA.updateMany({ where: { zaloOaId: `personal-zca-js-${id}` }, data: { status: 'CONNECTED' } });
      });
      api.listener.on('closed', (code, reason) => {
        if (session.api !== api) return;
        console.warn(`Zalo listener closed for ${id} (${code}): ${reason}`);
        this.scheduleListenerReconnect(id, api, session);
      });
      api.listener.on('error', (error) => console.warn(`Zalo listener error for ${id}:`, error));
      api.listener.start({ retryOnClose: true });
    }).catch((error) => {
      session.status = 'error';
      session.qrImage = null;
      this.publish(id, session);
      console.error(`Zalo login failed for account ${id}:`, error);
    }).finally(() => { session.loginPromise = null; });
    return this.view(account);
  }

  private scheduleListenerReconnect(id: string, api: API, session: AccountSession) {
    // Keep the account session and retry indefinitely. A temporary outage or
    // a burst of Zalo socket closes must not leave this account unmonitored.
    const delay = Math.min(2_000 * (2 ** Math.min(session.listenerRetryCount, 4)), 30_000);
    session.listenerRetryCount++;
    session.status = 'reconnecting';
    this.publish(id, session);
    if (session.listenerRetryTimer) clearTimeout(session.listenerRetryTimer);
    session.listenerRetryTimer = setTimeout(() => {
      session.listenerRetryTimer = null;
      if (session.api !== api) return;
      try {
        api.listener.start({ retryOnClose: true });
      } catch (error) {
        console.error(`Could not restart Zalo listener for ${id}:`, error);
        this.scheduleListenerReconnect(id, api, session);
      }
    }, delay);
  }

  async disconnect(id: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const session = this.session(id);
    if (session.listenerRetryTimer) clearTimeout(session.listenerRetryTimer);
    session.listenerRetryTimer = null;
    session.listenerRetryCount = 0;
    session.api?.listener.stop();
    session.api = null;
    session.loginPromise = null;
    session.qrImage = null;
    session.status = 'disconnected';
    await this.prisma.zaloOA.updateMany({ where: { zaloOaId: `personal-zca-js-${id}` }, data: { status: 'DISCONNECTED' } });
    this.publish(id, session);
    return this.view(account);
  }

  async groups(id: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const api = this.session(id).api;
    if (!api) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    const all = await api.getAllGroups();
    const ids = Object.keys(all.gridVerMap);
    const groups: Array<{ id: string; name: string; memberCount: number; members: Array<{ id: string; name: string; avatar: string }> }> = [];
    for (let offset = 0; offset < ids.length; offset += 50) {
      const info = await api.getGroupInfo(ids.slice(offset, offset + 50));
      for (const [groupId, group] of Object.entries(info.gridInfoMap ?? {})) {
        const memberIds = group.memberIds ?? [];
        const memberResponse = memberIds.length ? await api.getGroupMembersInfo(memberIds) : { profiles: {} };
        groups.push({ id: groupId, name: group.name, memberCount: group.totalMember ?? memberIds.length,
          members: Object.values(memberResponse.profiles).map((member) => ({ id: member.id, name: member.displayName || member.zaloName, avatar: member.avatar })) });
      }
    }
    this.gateway.emitPersonalZaloGroups({ accountId: id, groups });
    return groups;
  }

  async scanGroupLink(id: string, link: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const api = this.session(id).api;
    if (!api) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    const normalizedLink = link?.trim();
    if (!normalizedLink || !/^https?:\/\//i.test(normalizedLink)) {
      throw new BadRequestException('Vui lòng nhập link mời nhóm Zalo hợp lệ');
    }

    const preview = await api.getGroupLinkInfo({ link: normalizedLink, memberPage: 1 });
    if (!(await this.isGroupMember(api, preview.groupId))) {
      throw new BadRequestException('Tài khoản chưa được duyệt vào nhóm. Hãy tham gia nhóm và chờ quản trị viên duyệt trước khi quét member.');
    }

    const collected = new Map<string, { id: string; displayName: string; zaloName: string; avatar: string; accountStatus: number; type: number; globalId: string; lastUpdateTime: number; membershipStatus: 'member' | 'pending_approval' | 'blocked' }>();
    let group: Awaited<ReturnType<typeof api.getGroupLinkInfo>> | null = null;
    for (let memberPage = 1; memberPage <= 200; memberPage++) {
      const page = await api.getGroupLinkInfo({ link: normalizedLink, memberPage });
      group ??= page;
      const previousCount = collected.size;
      for (const member of page.currentMems ?? []) {
        if (member.id) collected.set(member.id, {
          id: member.id,
          displayName: member.dName,
          zaloName: member.zaloName,
          avatar: member.avatar,
          accountStatus: member.accountStatus,
          type: member.type,
          globalId: '',
          lastUpdateTime: 0,
          membershipStatus: 'member',
        });
      }
      if (!page.hasMoreMember || collected.size >= page.totalMember || !page.currentMems?.length || collected.size === previousCount) break;
    }

    const groupInfo = await api.getGroupInfo(preview.groupId);
    const info = groupInfo.gridInfoMap?.[preview.groupId];
    if (!info) throw new BadRequestException('Không lấy được thông tin nhóm. Hãy kiểm tra link và quyền truy cập của tài khoản Zalo.');
    group = {
      ...group!,
      groupId: info.groupId || preview.groupId,
      name: info.name || group?.name || preview.name,
      desc: info.desc || group?.desc || '',
      avt: info.avt || group?.avt || '',
      fullAvt: info.fullAvt || group?.fullAvt || '',
      totalMember: info.totalMember ?? group?.totalMember ?? preview.totalMember,
      hasMoreMember: info.hasMoreMember ?? group?.hasMoreMember ?? preview.hasMoreMember,
    };
    for (const memberId of info?.memberIds ?? []) {
      if (!collected.has(memberId)) collected.set(memberId, {
        id: memberId, displayName: '', zaloName: '', avatar: '', accountStatus: 0, type: 0,
        globalId: '', lastUpdateTime: 0, membershipStatus: 'member',
      });
    }

    let pendingUsers: Array<{ uid: string; dpn: string; avatar: string }> = [];
    try {
      pendingUsers = (await api.getPendingGroupMembers(preview.groupId)).users ?? [];
    } catch {
      // Zalo only exposes pending join requests to accounts with sufficient group permissions.
    }
    for (const pending of pendingUsers) {
      if (!collected.has(pending.uid)) collected.set(pending.uid, {
        id: pending.uid, displayName: pending.dpn, zaloName: '', avatar: pending.avatar,
        accountStatus: 0, type: 0, globalId: '', lastUpdateTime: 0, membershipStatus: 'pending_approval',
      });
    }

    try {
      for (let page = 1; page <= 100; page++) {
        const blocked = await api.getGroupBlockedMember({ page, count: 50 }, preview.groupId);
        for (const member of blocked.blocked_members ?? []) {
          if (!collected.has(member.id)) collected.set(member.id, {
            id: member.id, displayName: member.dName, zaloName: member.zaloName, avatar: member.avatar,
            accountStatus: member.accountStatus, type: member.type, globalId: '', lastUpdateTime: 0, membershipStatus: 'blocked',
          });
        }
        if (!blocked.has_more || !blocked.blocked_members?.length) break;
      }
    } catch {
      // Blocked-member lists may be restricted for non-admin group members.
    }

    const memberIds = [...collected.values()].filter((member) => member.membershipStatus === 'member').map((member) => member.id);
    for (let offset = 0; offset < memberIds.length; offset += 50) {
      const profiles = await api.getGroupMembersInfo(memberIds.slice(offset, offset + 50));
      for (const [memberId, profile] of Object.entries(profiles.profiles ?? {})) {
        const original = collected.get(memberId);
        collected.set(memberId, {
          id: profile.id || original?.id || memberId,
          displayName: profile.displayName || original?.displayName || '',
          zaloName: profile.zaloName || original?.zaloName || '',
          avatar: profile.avatar || original?.avatar || '',
          accountStatus: profile.accountStatus ?? original?.accountStatus ?? 0,
          type: profile.type ?? original?.type ?? 0,
          globalId: profile.globalId || original?.globalId || '',
          lastUpdateTime: profile.lastUpdateTime || original?.lastUpdateTime || 0,
          membershipStatus: original?.membershipStatus ?? 'member',
        });
      }
    }

    return {
      group: group && {
        id: group.groupId,
        name: group.name,
        description: group.desc,
        avatar: group.fullAvt || group.avt,
        totalMember: group.totalMember,
        hasMoreMember: group.hasMoreMember,
      },
      members: [...collected.values()],
      scannedCount: collected.size,
    };
  }

  async joinGroupByLink(id: string, link: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const api = this.session(id).api;
    if (!api) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    const normalizedLink = link?.trim();
    if (!normalizedLink || !/^https?:\/\//i.test(normalizedLink)) throw new BadRequestException('Vui lòng nhập link mời nhóm Zalo hợp lệ');
    const group = await api.getGroupLinkInfo({ link: normalizedLink, memberPage: 1 });
    let joinStatus: 'joined' | 'pending_approval';
    try {
      await api.joinGroupLink(normalizedLink);
      joinStatus = 'joined';
    } catch (error) {
      const code = (error as { code?: number | null })?.code;
      if (code === 178) joinStatus = 'joined'; // Already a member.
      else if (code === 240) joinStatus = 'pending_approval';
      else throw error;
    }
    const joined = await this.isGroupMember(api, group.groupId);
    if (joined) joinStatus = 'joined';
    else if (joinStatus === 'joined') joinStatus = 'pending_approval';
    return { joinStatus, group: { id: group.groupId, name: group.name, totalMember: group.totalMember } };
  }

  async checkGroupMembership(id: string, groupId: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const api = this.session(id).api;
    if (!api) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    return { joined: await this.isGroupMember(api, groupId) };
  }

  async startBulkSend(id: string, recipients: BulkRecipient[], content: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    if (role !== 'ADMIN') {
      const channel = await this.channel(account);
      const access = await this.prisma.oAStaffAccess.findUnique({ where: { userId_zaloOAId: { userId, zaloOAId: channel.id } }, select: { canSend: true } });
      if (!access?.canSend) throw new ForbiddenException('Bạn chưa được cấp quyền gửi tin trên tài khoản Zalo này');
    }
    if (!this.session(id).api) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    if (!content?.trim()) throw new BadRequestException('Vui lòng nhập nội dung tin nhắn');
    if (!Array.isArray(recipients) || recipients.length === 0) throw new BadRequestException('Danh sách người nhận đang trống');
    const uniqueRecipients = [...new Map(recipients
      .filter((recipient) => typeof recipient?.userId === 'string' && recipient.userId.trim())
      .map((recipient) => [recipient.userId.trim(), { userId: recipient.userId.trim(), displayName: recipient.displayName?.trim() ?? '' }])).values()];
    if (uniqueRecipients.length === 0) throw new BadRequestException('Không tìm thấy userId hợp lệ trong danh sách');
    if (uniqueRecipients.length > 50) throw new BadRequestException('Mỗi lượt gửi tối đa 50 người nhận');
    if (content.trim().length > 2000) throw new BadRequestException('Nội dung tối đa 2000 ký tự');

    const batch: BulkBatch = {
      id: randomUUID(), accountId: id, status: 'running', total: uniqueRecipients.length, sent: 0, failed: 0,
      results: uniqueRecipients.map((recipient) => ({ ...recipient, status: 'pending' })),
    };
    this.bulkBatches.set(batch.id, batch);
    if (this.bulkBatches.size > 100) this.bulkBatches.delete(this.bulkBatches.keys().next().value!);
    void this.processBulkBatch(batch, uniqueRecipients, content.trim(), userId, role);
    return this.publicBatch(batch);
  }

  async bulkSendStatus(id: string, batchId: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const batch = this.bulkBatches.get(batchId);
    if (!batch || batch.accountId !== id) throw new NotFoundException('Không tìm thấy lượt gửi');
    return this.publicBatch(batch);
  }

  private async processBulkBatch(batch: BulkBatch, recipients: BulkRecipient[], content: string, userId: string, role: string) {
    const api = this.session(batch.accountId).api;
    if (!api) {
      batch.status = 'completed';
      batch.failed = batch.total;
      batch.results.forEach((result) => { result.status = 'failed'; result.error = 'Tài khoản Zalo đã ngắt kết nối'; });
      return;
    }
    for (let index = 0; index < recipients.length; index++) {
      const recipient = recipients[index];
      const result = batch.results[index];
      try {
        const { conversationId } = await this.openChat(batch.accountId, recipient.userId, recipient.displayName ?? '', false, userId, role);
        const message = await this.prisma.message.create({
          data: { conversationId, direction: 'OUT', type: 'TEXT', content, senderId: userId, status: 'SENDING' },
          include: { sender: { select: { id: true, name: true, avatar: true } } },
        });
        await this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), status: 'PROCESSING' } });
        this.gateway.emitNewMessage(conversationId, message);
        try {
          await api.sendMessage({ msg: content }, recipient.userId, ThreadType.User);
          await this.prisma.message.update({ where: { id: message.id }, data: { status: 'SENT' } });
          await this.prisma.zaloOA.updateMany({ where: { zaloOaId: `personal-zca-js-${batch.accountId}` }, data: { messagesSentToday: { increment: 1 } } });
          result.status = 'sent';
          batch.sent++;
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Zalo từ chối gửi tin';
          await this.prisma.message.update({ where: { id: message.id }, data: { status: 'FAILED' } });
          result.status = 'failed';
          result.error = reason;
          batch.failed++;
        }
        const current = await this.prisma.message.findUnique({ where: { id: message.id }, include: { sender: { select: { id: true, name: true, avatar: true } } } });
        if (current) this.gateway.emitNewMessage(conversationId, current);
      } catch (error) {
        result.status = 'failed';
        result.error = error instanceof Error ? error.message : 'Không thể tạo hội thoại';
        batch.failed++;
      }
      if (index < recipients.length - 1) await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    batch.status = 'completed';
  }

  private publicBatch(batch: BulkBatch) {
    return { id: batch.id, status: batch.status, total: batch.total, sent: batch.sent, failed: batch.failed, results: batch.results };
  }

  private async isGroupMember(api: API, groupId: string) {
    try {
      const info = await api.getGroupInfo(groupId);
      return Boolean(info.gridInfoMap?.[groupId]);
    } catch {
      return false;
    }
  }

  async friends(id: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const api = this.session(id).api;
    if (!api) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    return api.getAllFriends(20000, 1);
  }

  async friendRequests(id: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const api = this.session(id).api;
    if (!api) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    const result = await api.getFriendRecommendations();
    return result.recommItems.filter((item) => item.dataInfo.recommType === 2).map((item) => item.dataInfo);
  }

  async acceptFriendRequest(id: string, friendId: string, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    const api = this.session(id).api;
    if (!api) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    await api.acceptFriendRequest(friendId);
    return { success: true };
  }

  async openChat(id: string, targetId: string, displayName: string, isGroup: boolean, userId: string, role: string) {
    const account = await this.account(id);
    await this.assertAccountAccess(account, userId, role);
    if (!this.session(id).api) throw new BadRequestException('Tài khoản Zalo chưa kết nối');
    const channel = await this.channel(account);
    const zaloUserId = isGroup ? `group:${targetId}` : targetId;
    const customer = await this.prisma.customer.upsert({
      where: { zaloUserId },
      update: { name: displayName || (isGroup ? `Nhóm Zalo ${targetId}` : `Bạn Zalo ${targetId}`) },
      create: { zaloUserId, name: displayName || (isGroup ? `Nhóm Zalo ${targetId}` : `Bạn Zalo ${targetId}`), source: 'Zalo cá nhân' },
    });
    const conversation = await this.prisma.conversation.upsert({
      where: { customerId_zaloOAId: { customerId: customer.id, zaloOAId: channel.id } },
      update: {},
      create: { customerId: customer.id, zaloOAId: channel.id, status: 'PROCESSING' },
    });
    if (isGroup) {
      const history = await this.session(id).api!.getGroupChatHistory(targetId, 50);
      const records = history.groupMsgs
        .map((item) => ({ item, text: messageContent(item.data.content), sentAt: this.eventDate(item.data.ts) }))
        .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
      for (const record of records) {
        const exists = await this.prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            direction: record.item.isSelf ? 'OUT' : 'IN',
            content: record.text,
            sentAt: { gte: new Date(record.sentAt.getTime() - 1000), lte: new Date(record.sentAt.getTime() + 1000) },
          },
          select: { id: true },
        });
        if (!exists) {
          await this.prisma.message.create({ data: {
            conversationId: conversation.id,
            direction: record.item.isSelf ? 'OUT' : 'IN',
            type: 'TEXT',
            content: record.text,
            status: 'SENT',
            sentAt: record.sentAt,
          } });
        }
      }
      const latest = records.at(-1);
      if (latest) await this.prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: latest.sentAt } });
    }
    return { conversationId: conversation.id };
  }

  async clearChatData(userId: string, role: string) {
    if (role !== 'ADMIN') throw new NotFoundException('Không tìm thấy dữ liệu');
    const result = await this.prisma.conversation.deleteMany({
      where: { zaloOA: { zaloOaId: { startsWith: 'personal-zca-js' } } },
    });
    return { deletedConversations: result.count };
  }

  async sendText(userId: string, text: string, accountId?: string) {
    const api = accountId ? this.sessions.get(accountId)?.api : [...this.sessions.values()].find((session) => session.api)?.api;
    if (!api) throw new Error('Chưa có tài khoản Zalo cá nhân nào được kết nối');
    return api.sendMessage({ msg: text }, userId, ThreadType.User);
  }

  async sendAttachment(userId: string, text: string, filePath: string, accountId?: string) {
    const api = accountId ? this.sessions.get(accountId)?.api : [...this.sessions.values()].find((session) => session.api)?.api;
    if (!api) throw new Error('Chưa có tài khoản Zalo cá nhân nào được kết nối');
    return api.sendMessage({ msg: text, attachments: [filePath] }, userId, ThreadType.User);
  }

  async sendGroupText(groupId: string, text: string, accountId?: string) {
    const api = accountId ? this.sessions.get(accountId)?.api : [...this.sessions.values()].find((session) => session.api)?.api;
    if (!api) throw new Error('Chưa có tài khoản Zalo cá nhân nào được kết nối');
    return api.sendMessage({ msg: text }, groupId, ThreadType.Group);
  }

  async sendGroupAttachment(groupId: string, text: string, filePath: string, accountId?: string) {
    const api = accountId ? this.sessions.get(accountId)?.api : [...this.sessions.values()].find((session) => session.api)?.api;
    if (!api) throw new Error('Chưa có tài khoản Zalo cá nhân nào được kết nối');
    return api.sendMessage({ msg: text, attachments: [filePath] }, groupId, ThreadType.Group);
  }

  private publish(id: string, session: AccountSession) {
    this.gateway.emitPersonalZaloStatus({ accountId: id, status: session.status, qrImage: session.qrImage });
  }

  private async receiveZaloMessage(accountId: string, messageEvent: any) {
    const { threadId, type, isSelf, data } = messageEvent;
    // Some Zalo event variants reuse realMsgId. Include the regular message ID,
    // thread/direction and timestamp so distinct messages from one sender are
    // never dropped as duplicates while still filtering repeated socket events.
    const messageId = [data?.msgId, data?.cliMsgId, data?.realMsgId]
      .find((value) => value !== undefined && value !== null && String(value).trim() !== '');
    const dedupeKey = messageId
      ? `${accountId}:${type}:${threadId}:${isSelf ? 'self' : 'peer'}:${String(messageId)}:${String(data?.ts ?? '')}`
      : '';
    if (dedupeKey && this.seenMessageIds.has(dedupeKey)) return;
    const channelId = `personal-zca-js-${accountId}`;
    let channel = await this.prisma.zaloOA.findUnique({ where: { zaloOaId: channelId } });
    if (!channel) channel = await this.prisma.zaloOA.create({ data: { zaloOaId: channelId, name: `Zalo cá nhân ${accountId}`, status: 'CONNECTED' } });
    const isGroup = type === ThreadType.Group;
    const externalSenderId = !isSelf ? String(data?.uidFrom ?? (isGroup ? '' : threadId)) : '';
    const zaloUserId = isGroup ? `group:${threadId}` : threadId;
    let customer = await this.prisma.customer.findUnique({ where: { zaloUserId } });
    const eventDisplayName = String(data?.dName ?? '');
    const shouldLookupProfile = Boolean(externalSenderId && (isGroup || !customer || customer.name.startsWith('Khách Zalo ') || (eventDisplayName && customer.name !== eventDisplayName)));
    const activeApi = this.session(accountId).api;
    if (!customer) customer = await this.prisma.customer.create({ data: {
      zaloUserId,
      name: isGroup ? `Nhóm Zalo ${threadId}` : eventDisplayName || `Khách Zalo ${threadId.slice(-4)}`,
      source: 'Zalo cá nhân',
    } });
    const text = messageContent(data?.content);
    const sentAt = this.eventDate(data?.ts);
    const conversation = await this.prisma.conversation.upsert({ where: { customerId_zaloOAId: { customerId: customer.id, zaloOAId: channel.id } },
      update: { ...(isSelf ? {} : { status: 'UNREAD' as const }), lastMessageAt: sentAt }, create: { customerId: customer.id, zaloOAId: channel.id, status: isSelf ? 'PROCESSING' : 'UNREAD', lastMessageAt: sentAt } });
    let message;
    if (isSelf) {
      const pending = await this.prisma.message.findFirst({ where: { conversationId: conversation.id, direction: 'OUT', content: text, sentAt: { gte: new Date(Date.now() - 120_000) } }, orderBy: { sentAt: 'desc' } });
      message = pending
        ? await this.prisma.message.update({ where: { id: pending.id }, data: { status: 'SENT', sentAt } })
        : await this.prisma.message.create({ data: { conversationId: conversation.id, direction: 'OUT', type: 'TEXT', content: text, status: 'SENT', sentAt } });
    } else {
      message = await this.prisma.message.create({ data: { conversationId: conversation.id, direction: 'IN', type: 'TEXT', content: text, status: 'SENT', sentAt,
        ...(isGroup && externalSenderId ? { externalSenderId, externalSenderName: eventDisplayName || undefined } : {}) } });
    }
    if (dedupeKey) {
      this.seenMessageIds.add(dedupeKey);
      if (this.seenMessageIds.size > 10_000) this.seenMessageIds.clear();
    }
    this.gateway.emitNewMessage(conversation.id, message);
    this.gateway.emitConversationUpdate({ ...conversation, zaloOAId: channel.id });
    if (!isSelf && activeApi && (isGroup || shouldLookupProfile)) {
      void this.enrichInboundMessage({ api: activeApi, accountId, groupId: isGroup ? threadId : undefined, customerId: customer.id, conversationId: conversation.id, messageId: message.id, channelId: channel.id, senderId: externalSenderId, isGroup })
        .catch((error) => console.error(`Zalo profile refresh failed (${accountId}):`, error));
    }
  }

  private async enrichInboundMessage(input: { api: API; accountId: string; groupId?: string; customerId: string; conversationId: string; messageId: string; channelId: string; senderId: string; isGroup: boolean }) {
    const [profile, group] = await Promise.all([
      input.senderId ? getZaloUserProfile(input.api, input.senderId) : Promise.resolve(null),
      input.isGroup && input.groupId ? getZaloGroupProfile(input.api, input.groupId, input.accountId) : Promise.resolve(null),
    ]);
    const currentCustomer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!currentCustomer) return;
    const displayName = input.isGroup
      ? group?.name
      : profile?.displayName || profile?.zaloName;
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

  private async syncGroupProfileFromEvent(accountId: string, event: any) {
    const groupId = String(event?.threadId ?? event?.data?.groupId ?? event?.data?.group_id ?? '');
    if (!groupId) return;
    invalidateZaloGroupProfile(accountId, groupId);
    const api = this.session(accountId).api;
    if (!api) return;
    const profile = await getZaloGroupProfile(api, groupId, accountId);
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
    const channel = await this.prisma.zaloOA.findUnique({ where: { zaloOaId: `personal-zca-js-${accountId}` }, select: { id: true } });
    if (channel) this.gateway.emitConversationUpdate({ zaloOAId: channel.id, customerId: updated.id });
  }

  private eventDate(value: unknown) {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0
      ? new Date(timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp)
      : new Date();
  }

  private async assertAccountAccess(account: { id: string; name: string }, userId: string, role: string) {
    if (role === 'ADMIN') return;
    const channel = await this.channel(account);
    const access = await this.prisma.oAStaffAccess.findUnique({ where: { userId_zaloOAId: { userId, zaloOAId: channel.id } }, select: { id: true } });
    if (!access) throw new NotFoundException('Không tìm thấy tài khoản Zalo');
  }

  onModuleDestroy() {
    for (const session of this.sessions.values()) {
      if (session.listenerRetryTimer) clearTimeout(session.listenerRetryTimer);
      session.api?.listener.stop();
    }
  }
}
