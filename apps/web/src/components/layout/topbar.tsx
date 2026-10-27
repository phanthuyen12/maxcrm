'use client';

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen, User as UserIcon } from 'lucide-react';
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
