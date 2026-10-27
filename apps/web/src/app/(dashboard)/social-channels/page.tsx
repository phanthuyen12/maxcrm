'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Facebook, Send, Trash2 } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SocialChannel = { id: string; name: string; provider: 'TELEGRAM' | 'FACEBOOK'; externalId: string | null; webhookUrl: string; verificationToken: string; credentialConfigured: boolean };

export default function SocialChannelsPage() {
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [provider, setProvider] = useState<'TELEGRAM' | 'FACEBOOK'>('TELEGRAM');
  const [name, setName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [externalId, setExternalId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = async () => setChannels(await api.get<SocialChannel[]>('/social-channels'));
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/social-channels', { provider, name, accessToken, ...(provider === 'FACEBOOK' ? { externalId, appSecret } : {}) });
      setName(''); setAccessToken(''); setExternalId(''); setAppSecret(''); await refresh();
    } catch (e: any) { setError(e.message || 'Không thể kết nối kênh'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) { await api.delete(`/social-channels/${id}`); await refresh(); }

  return <div className="flex flex-1 flex-col overflow-hidden">
    <Topbar title="Kết nối Telegram & Facebook" />
    <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
      <p className="text-sm text-muted-foreground">Kết nối bot Telegram hoặc Facebook Page để nhận và trả lời tin nhắn ngay trong hộp thư.</p>
      <Card><CardHeader><CardTitle>Thêm kênh</CardTitle></CardHeader><CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Nền tảng</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={provider} onChange={(e) => setProvider(e.target.value as any)}><option value="TELEGRAM">Telegram Bot</option><option value="FACEBOOK">Facebook Page</option></select></div>
          <div className="space-y-2"><Label>Tên hiển thị</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder={provider === 'TELEGRAM' ? 'Bot chăm sóc khách hàng' : 'Facebook Page của bạn'} /></div>
          {provider === 'FACEBOOK' && <><div className="space-y-2"><Label>Facebook Page ID</Label><Input required value={externalId} onChange={(e) => setExternalId(e.target.value)} /></div><div className="space-y-2"><Label>Facebook App Secret</Label><Input required type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} /></div></>}
          <div className="space-y-2 md:col-span-2"><Label>{provider === 'TELEGRAM' ? 'Bot token' : 'Page access token'}</Label><Input required type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} autoComplete="new-password" /></div>
          <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Đang kết nối…' : 'Kết nối kênh'}</Button>{error && <p className="mt-2 text-sm text-destructive">{error}</p>}</div>
        </form>
      </CardContent></Card>
      <div className="grid gap-4 md:grid-cols-2">{channels.map((channel) => <Card key={channel.id}><CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle className="flex items-center gap-2 text-base">{channel.provider === 'TELEGRAM' ? <Send className="h-4 w-4" /> : <Facebook className="h-4 w-4" />}{channel.name}</CardTitle><Button variant="ghost" size="icon" onClick={() => remove(channel.id)} aria-label="Ngắt kết nối kênh"><Trash2 className="h-4 w-4" /></Button></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>{channel.provider === 'TELEGRAM' ? 'Telegram Bot' : 'Facebook Page'} · Đã kết nối</p><p className="break-all">Webhook: {channel.webhookUrl}</p><p className="break-all">Webhook verification token: {channel.verificationToken}</p></CardContent></Card>)}</div>
    </div>
  </div>;
}
