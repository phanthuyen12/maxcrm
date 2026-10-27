'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
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
  Facebook,
  Settings,
  Menu,
  Blocks,
  ScanSearch,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

const NAV_ITEMS = [
  { href: '/overview', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/inbox', label: 'Hộp thư Zalo', icon: Inbox },
  { href: '/customers', label: 'Khách hàng', icon: Users },
  { href: '/pipeline', label: 'Pipeline bán hàng', icon: Kanban },
  { href: '/tasks', label: 'Công việc', icon: CheckSquare },
  { href: '/templates', label: 'Mẫu tin nhắn', icon: MessageSquareText },
  { href: '/reports', label: 'Báo cáo', icon: BarChart3 },
  { href: '/connections', label: 'Tổng hợp kết nối', icon: Link2 },
  { href: '/oa-connections', label: 'Kết nối Zalo OA', icon: Link2 },
  { href: '/social-channels', label: 'Telegram & Facebook', icon: Facebook },
  { href: '/personal-zalo', label: 'Zalo cá nhân', icon: Smartphone },
  { href: '/team', label: 'Quản lý tài khoản', icon: Users },
  { href: '/group-scanner', label: 'Quét member group', icon: ScanSearch },
  { href: '/bulk-message', label: 'Gửi tin theo danh sách', icon: Send },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();
  const navItems = NAV_ITEMS.filter((item) => {
    if (currentUser?.role === 'CHAT') return item.href === '/inbox';
    if (item.href === '/reports') return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    if (['/connections', '/oa-connections', '/social-channels'].includes(item.href)) return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    if (['/group-scanner', '/bulk-message', '/personal-zalo'].includes(item.href)) return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    if (item.href === '/team') return currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    return true;
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-white/10 bg-[#003F35] p-3 text-white shadow-lg focus:outline-none">
          <DialogPrimitive.Title className="flex h-[58px] shrink-0 items-center gap-2 border-b border-white/10 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[#52DDB2]">
              <Blocks className="h-[18px] w-[18px]" />
            </div>
            <span className="font-bold tracking-wide">MAXCRM</span>
          </DialogPrimitive.Title>
          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                    active ? 'bg-[#45DDB0] text-[#073F34]' : 'text-white/80 hover:bg-white/[0.08] hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
