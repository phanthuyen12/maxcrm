'use client';

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Bell, LogOut, PanelLeftClose, PanelLeftOpen, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/hooks/use-current-user';
import { api } from '@/lib/api';
import { initials } from '@/lib/utils';
import { MobileNav } from './mobile-nav';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/hooks/use-notifications';
import { formatRelativeTime } from '@/lib/utils';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  AGENT: 'Nhân viên',
  CHAT: 'Chat',
};

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const onState = (event: Event) => setCollapsed((event as CustomEvent<boolean>).detail);
    window.addEventListener('crm:sidebar-state', onState);
    setCollapsed(pathname.startsWith('/inbox') && window.innerWidth < 1024);
    return () => window.removeEventListener('crm:sidebar-state', onState);
  }, [pathname]);
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.dispatchEvent(new CustomEvent('crm:sidebar', { detail: next }));
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    toast.success('Đã đăng xuất');
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        <button type="button" onClick={toggleSidebar} className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground md:flex" aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Thông báo" className="relative mr-auto ml-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-white">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[min(70vh,480px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-1.5">
            <DropdownMenuLabel className="p-0">Thông báo</DropdownMenuLabel>
            {unreadNotifications > 0 && <button type="button" className="text-xs text-primary hover:underline" onClick={() => markAllRead.mutate()}>Đánh dấu đã đọc</button>}
          </div>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? <p className="px-2 py-5 text-center text-xs text-muted-foreground">Chưa có thông báo</p> : notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} className="block cursor-pointer whitespace-normal py-2.5" onSelect={() => { if (!notification.isRead) markRead.mutate(notification.id); router.push(`/inbox?conversationId=${encodeURIComponent(notification.conversation.id)}`); }}>
              <span className="flex items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-transparent' : 'bg-primary'}`} />
                <span className="min-w-0 flex-1"><span className="block text-xs font-medium">{notification.title}</span><span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{notification.content}</span><span className="mt-1 block text-[10px] text-muted-foreground">{formatRelativeTime(notification.createdAt)}</span></span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{user ? initials(user.name) : <UserIcon className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left text-sm sm:block">
              <div className="font-medium leading-none">{user?.name ?? 'Đang tải...'}</div>
              <div className="text-xs text-muted-foreground">
                {user ? ROLE_LABEL[user.role] : ''}
              </div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="h-4 w-4" /> Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
