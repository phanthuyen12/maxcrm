'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Facebook, Link2, Send, Smartphone, ArrowUpRight } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { api } from '@/lib/api';
import { useZaloOAs } from '@/hooks/use-zalo-oa';
import { useCurrentUser } from '@/hooks/use-current-user';

type SocialChannel = { id: string; provider: 'TELEGRAM' | 'FACEBOOK'; name: string };
type PersonalAccount = { id: string; name: string; status: string };

export default function ConnectionsPage() {
  const { data: oas = [], isLoading: oaLoading } = useZaloOAs();
  const { data: user } = useCurrentUser();
  const [social, setSocial] = useState<SocialChannel[]>([]);
  const [personal, setPersonal] = useState<PersonalAccount[]>([]);
  const canManagePersonal = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    void api.get<SocialChannel[]>('/social-channels').then(setSocial).catch(() => setSocial([]));
    if (canManagePersonal) void api.get<PersonalAccount[]>('/zalo-personal/accounts').then(setPersonal).catch(() => setPersonal([]));
  }, [canManagePersonal]);

  const cards = [
    { title: 'Zalo Official Account', subtitle: 'OA, webhook và phân công nhân viên tiếp nhận', icon: Link2, href: '/oa-connections', count: oaLoading ? '…' : `${oas.length} OA`, color: 'bg-blue-500/10 text-blue-600' },
    ...(canManagePersonal ? [{ title: 'Zalo cá nhân', subtitle: 'Tài khoản, đăng nhập QR, proxy và quyền truy cập', icon: Smartphone, href: '/personal-zalo', count: `${personal.length} tài khoản`, color: 'bg-sky-500/10 text-sky-600' }] : []),
    { title: 'Facebook Page', subtitle: 'Kết nối Page và nhận/trả lời tin nhắn', icon: Facebook, href: '/social-channels', count: `${social.filter((channel) => channel.provider === 'FACEBOOK').length} Page`, color: 'bg-indigo-500/10 text-indigo-600' },
    { title: 'Telegram Bot', subtitle: 'Kết nối bot Telegram vào hộp thư tập trung', icon: Send, href: '/social-channels', count: `${social.filter((channel) => channel.provider === 'TELEGRAM').length} bot`, color: 'bg-cyan-500/10 text-cyan-600' },
  ];

  return <div className="flex flex-1 flex-col overflow-hidden">
    <Topbar title="Quản lý kết nối" />
    <main className="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-7">
      <section className="mx-auto max-w-6xl space-y-6">
        <div><h2 className="text-2xl font-bold tracking-tight">Tất cả kết nối</h2><p className="mt-1 text-sm text-muted-foreground">Quản lý các kênh nhắn tin và tài khoản mạng xã hội tại một nơi.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map(({ title, subtitle, icon: Icon, href, count, color }) => <Link key={title} href={href} className="group rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
            <div className="flex items-start justify-between gap-3"><span className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" /></div>
            <div className="mt-5 flex items-center justify-between gap-2"><h3 className="font-semibold">{title}</h3><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{count}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            <p className="mt-4 text-sm font-medium text-primary">Mở quản lý <span aria-hidden="true">→</span></p>
          </Link>)}
        </div>
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Các kênh Facebook và Telegram được quản lý chung trong màn hình mạng xã hội.</div>
      </section>
    </main>
  </div>;
}
