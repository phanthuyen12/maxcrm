'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Kanban,
  CheckSquare,
  MessageSquareText,
  BarChart3,
  Link2,
  Smartphone,
  Building2,
  Facebook,
  Settings,
  Blocks,
  ScanSearch,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/use-conversations';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const NAV_GROUPS = [
  { label: 'Không gian làm việc', items: [
  { href: '/overview', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/inbox', label: 'Hộp thư Zalo', icon: Inbox, badgeKey: 'inbox' },
  { href: '/customers', label: 'Khách hàng', icon: Users },
  { href: '/pipeline', label: 'Pipeline bán hàng', icon: Kanban },
  { href: '/tasks', label: 'Công việc', icon: CheckSquare },
  ] },
  { label: 'Nội dung & báo cáo', items: [
  { href: '/templates', label: 'Mẫu tin nhắn', icon: MessageSquareText },
  { href: '/reports', label: 'Báo cáo', icon: BarChart3 },
  ] },
  { label: 'Quản trị & tích hợp', items: [
  { href: '/team', label: 'Thành viên', icon: Users },
  { href: '/connections', label: 'Tổng hợp kết nối', icon: Link2 },
  { href: '/oa-connections', label: 'Kết nối Zalo OA', icon: Building2 },
  { href: '/social-channels', label: 'Telegram & Facebook', icon: Facebook },
  { href: '/personal-zalo', label: 'Zalo cá nhân', icon: Smartphone },
  { href: '/group-scanner', label: 'Quét member group', icon: ScanSearch },
  { href: '/bulk-message', label: 'Gửi tin theo danh sách', icon: Send },
  ] },
  { label: '', items: [
  { href: '/settings', label: 'Cài đặt', icon: Settings },
  ] },
];

export function Sidebar() {
  const pathname = usePathname();
  const unread = useUnreadCount();
  const { data: currentUser } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const onToggle = (event: Event) => setCollapsed((event as CustomEvent<boolean>).detail);
    const syncInboxWidth = () => {
      if (!pathname.startsWith('/inbox')) return;
      const next = window.innerWidth < 1024;
      setCollapsed(next);
      window.dispatchEvent(new CustomEvent('crm:sidebar-state', { detail: next }));
    };
    window.addEventListener('crm:sidebar', onToggle);
    syncInboxWidth();
    window.addEventListener('resize', syncInboxWidth);
    return () => { window.removeEventListener('crm:sidebar', onToggle); window.removeEventListener('resize', syncInboxWidth); };
  }, [pathname]);
  const allowed = (item: (typeof NAV_GROUPS)[number]['items'][number]) => {
    if (currentUser?.role === 'CHAT') return item.href === '/inbox';
    if (item.href === '/reports') return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    if (['/connections', '/oa-connections', '/social-channels'].includes(item.href)) return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    if (item.href === '/team') return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    if (item.href === '/personal-zalo') return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    if (item.href === '/group-scanner') return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    if (item.href === '/bulk-message') return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    return true;
  };

  return (
    <aside className={`hidden h-full min-w-[68px] shrink-0 flex-col overflow-hidden bg-[#003F35] text-white transition-[width] duration-200 md:!flex ${collapsed ? 'w-[68px]' : 'w-[224px]'}`}>
      <div className={`flex h-[68px] shrink-0 items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        {collapsed
          ? <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-[#52DDB2]"><Blocks className="h-5 w-5" /></div>
          : <div className="flex flex-col gap-0.5">
              <Image src="/maxcrm-logo.png" alt="MAXCRM" width={2172} height={724} className="h-auto w-[140px] brightness-0 invert" />
              <span className="pl-1 text-[8px] font-medium tracking-[0.22em] text-white/55">CUSTOMER PLATFORM</span>
            </div>}
      </div>
      <TooltipProvider delayDuration={180}>
      <nav className={`hide-scrollbar flex-1 overflow-y-auto py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV_GROUPS.map((group) => {
          const groupItems = group.items.filter(allowed);
          if (!groupItems.length) return null;
          return <div key={group.label || 'settings'} className="mb-2 border-b border-white/10 pb-2 last:border-0">
            {!collapsed && group.label && <p className="px-2 pb-2 pt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#83B8A7]">{group.label}</p>}
            <div className="space-y-0.5">{groupItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Tooltip key={item.href}>
            <TooltipTrigger asChild><Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex h-[38px] items-center justify-between gap-2 rounded-[9px] px-2 text-[13px] font-medium transition-colors duration-150',
                active
                  ? 'bg-[#45DDB0] text-[#073F34] shadow-[0_4px_12px_-8px_rgba(69,221,176,0.8)]'
                  : 'text-white/80 hover:bg-white/[0.08] hover:text-white',
                collapsed && 'justify-center px-0',
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', active ? 'text-[#073F34]' : 'text-white/75')}><Icon className="h-[17px] w-[17px] stroke-[1.8]" /></span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </span>
              {item.badgeKey === 'inbox' && unread > 0 && (!collapsed ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1 text-[11px] font-semibold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#45DDB0]" />)}
            </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" sideOffset={10} className="rounded-lg bg-[#073F34] px-3 py-2 text-xs font-medium text-white shadow-lg">{item.label}</TooltipContent>}
            </Tooltip>
          );
            })}</div>
          </div>;
        })}
      </nav>
      </TooltipProvider>
    </aside>
  );
}
