import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class SocialChannelsService {
  constructor(private prisma: PrismaService, private webhooks: WebhooksService) {}

  async list() {
    const rows = await this.prisma.zaloOA.findMany({ where: { provider: { in: ['TELEGRAM', 'FACEBOOK'] }, status: 'CONNECTED' }, orderBy: { createdAt: 'desc' } });
    return rows.map(({ accessToken, appSecret, webhookSecret, ...row }) => ({ ...row, credentialConfigured: Boolean(accessToken), verificationToken: webhookSecret, webhookUrl: `${process.env.PUBLIC_API_URL ?? 'http://localhost:4000'}/api/webhooks/${row.provider.toLowerCase()}/${row.id}` }));
  }

  options() {
    return this.prisma.zaloOA.findMany({ where: { provider: { in: ['TELEGRAM', 'FACEBOOK'] }, status: 'CONNECTED' }, select: { id: true, name: true, provider: true }, orderBy: { name: 'asc' } });
  }

  async create(input: { provider: 'TELEGRAM' | 'FACEBOOK'; name: string; accessToken: string; externalId?: string; appSecret?: string }) {
    if (!input.name?.trim() || !input.accessToken?.trim()) throw new BadRequestException('Cần nhập tên kênh và access token');
    if (input.provider === 'FACEBOOK' && (!input.externalId || !input.appSecret)) throw new BadRequestException('Facebook cần Page ID và App Secret');
    const id = input.externalId?.trim() || `telegram-${randomBytes(8).toString('hex')}`;
    const webhookSecret = randomBytes(24).toString('hex');
    const zaloOaId = `${input.provider.toLowerCase()}-${id}`;
    const row = await this.prisma.zaloOA.upsert({ where: { zaloOaId }, create: {
      name: input.name.trim(), zaloOaId, provider: input.provider, externalId: id,
      accessToken: input.accessToken.trim(), appSecret: input.appSecret || null, webhookSecret, status: 'CONNECTED',
    }, update: {
      name: input.name.trim(), provider: input.provider, externalId: id,
      accessToken: input.accessToken.trim(), appSecret: input.appSecret || null, webhookSecret, status: 'CONNECTED',
    } });
    await this.prisma.oAStaffAccess.createMany({ data: (await this.prisma.user.findMany({ where: { isActive: true }, select: { id: true } })).map((user) => ({ userId: user.id, zaloOAId: row.id })), skipDuplicates: true });
    if (input.provider === 'TELEGRAM') await this.registerTelegramWebhook(row.id, input.accessToken.trim(), row.webhookSecret!);
    const { accessToken: _accessToken, appSecret: _appSecret, webhookSecret: _webhookSecret, ...safe } = row;
    return { ...safe, webhookSecret, webhookUrl: `${process.env.PUBLIC_API_URL ?? 'http://localhost:4000'}/api/webhooks/${input.provider.toLowerCase()}/${row.id}` };
  }

  async remove(id: string) {
    const channel = await this.prisma.zaloOA.findUnique({ where: { id } });
    if (!channel || channel.provider === 'ZALO') throw new NotFoundException('Không tìm thấy kênh');
    await this.prisma.zaloOA.update({ where: { id }, data: { status: 'DISCONNECTED', accessToken: null } });
    return { success: true };
  }

  private async registerTelegramWebhook(id: string, token: string, secret: string) {
    const url = `${process.env.PUBLIC_API_URL ?? 'http://localhost:4000'}/api/webhooks/telegram/${id}`;
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, secret_token: secret }) });
    const result: any = await response.json();
    if (!response.ok || !result.ok) throw new BadRequestException(result.description || 'Không đăng ký được Telegram webhook');
  }

  async receiveTelegram(id: string, providedSecret: string, update: any) {
    const channel = await this.findChannel(id, 'TELEGRAM');
    this.verifySecret(channel.webhookSecret, providedSecret);
    const message = update?.message;
    const sender = message?.from;
    const text = message?.text;
    if (!sender?.id || !text) return { success: true, ignored: true };
    return this.webhooks.receiveWebhookEvent(id, { sender: { id: `telegram:${sender.id}` }, message: { text }, customer_name: [sender.first_name, sender.last_name].filter(Boolean).join(' ') || sender.username || `Telegram ${sender.id}` }, { skipSecretCheck: true });
  }

  verifyFacebook(mode: string, token: string, challenge: string) {
    if (mode !== 'subscribe') throw new UnauthorizedException('Facebook webhook mode không hợp lệ');
    return this.prisma.zaloOA.findFirst({ where: { provider: 'FACEBOOK', webhookSecret: token } }).then((channel) => {
      if (!channel) throw new UnauthorizedException('Facebook verify token không hợp lệ');
      return challenge;
    });
  }

  async receiveFacebook(payload: any, signature?: string, rawBody?: Buffer) {
    if (payload?.object !== 'page' || !Array.isArray(payload.entry)) return { success: true, ignored: true };
    if (!signature || !rawBody) throw new UnauthorizedException('Thiếu chữ ký Facebook webhook');
    const signatureMatch = /^sha256=([a-f0-9]{64})$/i.exec(signature);
    if (!signatureMatch) throw new UnauthorizedException('Chữ ký Facebook webhook không hợp lệ');
    const pageIds: string[] = [...new Set<string>(payload.entry.map((entry: any) => String(entry.id)))];
    const configured = await this.prisma.zaloOA.findMany({ where: { provider: 'FACEBOOK', externalId: { in: pageIds } }, select: { externalId: true, appSecret: true } });
    const valid = configured.some((channel) => {
      if (!channel.appSecret) return false;
      const expected = createHmac('sha256', channel.appSecret).update(rawBody).digest();
      const actual = Buffer.from(signatureMatch[1], 'hex');
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    });
    if (!valid) throw new UnauthorizedException('Chữ ký Facebook webhook không hợp lệ');
    let count = 0;
    for (const entry of payload.entry) {
      const channel = await this.prisma.zaloOA.findFirst({ where: { provider: 'FACEBOOK', externalId: String(entry.id) } });
      if (!channel) continue;
      for (const event of entry.messaging ?? []) {
        const senderId = event.sender?.id;
        const text = event.message?.text;
        if (!senderId || !text || event.message?.is_echo) continue;
        await this.webhooks.receiveWebhookEvent(channel.id, { sender: { id: `facebook:${senderId}` }, message: { text }, customer_name: `Facebook ${senderId}` }, { skipSecretCheck: true });
        count++;
      }
    }
    return { success: true, received: count };
  }

  private async findChannel(id: string, provider: 'TELEGRAM' | 'FACEBOOK') {
    const channel = await this.prisma.zaloOA.findUnique({ where: { id } });
    if (!channel || channel.provider !== provider) throw new NotFoundException('Không tìm thấy kênh');
    return channel;
  }

  private verifySecret(expected?: string | null, actual?: string) {
    if (!expected || !actual) throw new UnauthorizedException('Webhook secret không hợp lệ');
    const a = Buffer.from(expected); const b = Buffer.from(actual);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Webhook secret không hợp lệ');
  }
}
