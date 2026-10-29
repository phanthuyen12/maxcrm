'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/topbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalogList } from '@/components/settings/catalog-list';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { NOTIFICATION_SOUND_KEY, playNotificationSound, unlockNotificationSound } from '@/lib/notification-sound';
import { api, ApiError } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from '@/hooks/use-tags';
import {
  useCreateSource,
  useCreateTemplateCategory,
  useDeleteSource,
  useDeleteTemplateCategory,
  useSources,
  useTemplateCategories,
  useUpdateSource,
  useUpdateTemplateCategory,
} from '@/hooks/use-catalog';
import { initials } from '@/lib/utils';
import { BadgeCheck, BellRing, CircleUserRound, KeyRound, Languages, Palette, ShieldCheck, Wallet, UserRound, Crown, SlidersHorizontal, Download } from 'lucide-react';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  AGENT: 'Nhân viên',
  CHAT: 'Chat',
};

function AccountTab() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useCurrentUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  const handleUpdateProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, {
        name,
        email,
        ...(password.trim() ? { password } : {}),
      });
      setPassword('');
      toast.success('Đã cập nhật thông tin tài khoản');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['team-members'] }),
      ]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không thể cập nhật thông tin tài khoản');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardContent className="space-y-1 p-3">
          {[
            { icon: UserRound, title: 'Thông tin', detail: 'Hồ sơ tài khoản', active: true },
            { icon: ShieldCheck, title: 'Bảo mật', detail: 'Mật khẩu và phiên đăng nhập' },
            { icon: KeyRound, title: 'API Keys', detail: 'Tích hợp ứng dụng ngoài' },
            { icon: Wallet, title: 'Thanh toán', detail: 'Gói dịch vụ và hóa đơn' },
            { icon: Palette, title: 'Giao diện', detail: 'Tùy chỉnh trải nghiệm' },
          ].map(({ icon: Icon, title, detail, active }) => <div key={title} className={`flex items-center gap-3 rounded-xl p-3 ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary'}`}><Icon className="h-4 w-4" /></span><span><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs">{detail}</span></span></div>)}
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            {isLoading || !user ? <Skeleton className="h-16 w-full" /> : <>
              <Avatar className="h-16 w-16 ring-4 ring-accent"><AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">{initials(user.name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold tracking-tight">{user.name}</h2><Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"><BadgeCheck className="h-3.5 w-3.5"/>Đang hoạt động</Badge><Badge variant="secondary" className="gap-1"><Crown className="h-3 w-3"/>{ROLE_LABEL[user.role]}</Badge></div><p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p></div>
            </>}
          </CardContent>
          <div className="grid grid-cols-2 border-t sm:grid-cols-4"><div className="border-b p-4 sm:border-b-0 sm:border-r"><p className="text-xs text-muted-foreground">Vai trò</p><p className="mt-1 font-semibold">{user ? ROLE_LABEL[user.role] : '—'}</p></div><div className="border-b p-4 sm:border-b-0 sm:border-r"><p className="text-xs text-muted-foreground">Trạng thái</p><p className="mt-1 font-semibold text-emerald-700">Đang hoạt động</p></div><div className="border-r p-4"><p className="text-xs text-muted-foreground">Tài khoản</p><p className="mt-1 font-semibold">Zalo CRM</p></div><div className="p-4"><p className="text-xs text-muted-foreground">Phiên bản</p><p className="mt-1 font-semibold">0.1.0</p></div></div>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b px-5 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><CircleUserRound className="h-5 w-5"/></span><div><CardTitle className="text-base">Thông tin cá nhân</CardTitle><p className="mt-1 text-sm text-muted-foreground">Cập nhật thông tin tài khoản đang đăng nhập</p></div></CardHeader>
          <form onSubmit={(event) => void handleUpdateProfile(event)}>
            <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Họ và tên</label>
                <input
                  className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm font-medium shadow-sm outline-none focus:border-primary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Địa chỉ email</label>
                <input
                  type="email"
                  className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none focus:border-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mật khẩu mới (tùy chọn)</label>
                <input
                  type="password"
                  minLength={6}
                  placeholder="Để trống nếu không thay đổi"
                  className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none focus:border-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ngôn ngữ & Múi giờ</label>
                <div className="flex h-11 items-center justify-between rounded-xl border bg-muted/40 px-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><Languages className="h-4 w-4 text-muted-foreground"/>Tiếng Việt · UTC+7</span>
                </div>
              </div>
            </CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4">
              <p className="text-xs text-muted-foreground">Cập nhật họ tên, email đăng nhập hoặc mật khẩu của bạn.</p>
              <Button type="submit" size="sm" disabled={saving || !user}>
                {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </Card>
        <NotificationSoundSetting />
        {user?.role === 'ADMIN' && <DataBackupSetting />}
      </div>
    </div>
  );
}

function DataBackupSetting() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const downloadBackup = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/backup', { credentials: 'include' });
      if (!response.ok) throw new Error('Không tải được bản sao dữ liệu');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `maxcrm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được bản sao dữ liệu');
    } finally {
      setBusy(false);
    }
  };

  return <Card>
    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div><p className="text-sm font-semibold">Sao lưu dữ liệu MAXCRM</p><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Tải bản sao JSON của dữ liệu CRM đã lưu. Hội thoại và dữ liệu đã đồng bộ vẫn sử dụng được khi tài khoản Zalo mất kết nối.</p>{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}</div>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void downloadBackup()}><Download className="h-4 w-4" />{busy ? 'Đang tạo bản sao…' : 'Tải bản sao dữ liệu'}</Button>
    </CardContent>
  </Card>;
}

function NotificationSoundSetting() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(window.localStorage.getItem(NOTIFICATION_SOUND_KEY) !== 'false');
  }, []);

  const setSound = (next: boolean) => {
    setEnabled(next);
    window.localStorage.setItem(NOTIFICATION_SOUND_KEY, String(next));
    if (next) unlockNotificationSound();
  };

  return <Card>
    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><BellRing className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Âm báo tin nhắn mới</p><p className="mt-1 text-xs text-muted-foreground">Phát một tiếng báo khi có tin nhắn đến hoặc hội thoại mới.</p></div></div>
      <div className="flex items-center gap-3"><Button type="button" variant="outline" size="sm" onClick={() => { unlockNotificationSound(); playNotificationSound(); }}><BellRing className="h-4 w-4" />Nghe thử</Button><Switch checked={enabled} onCheckedChange={setSound} aria-label="Bật âm báo tin nhắn mới" /></div>
    </CardContent>
  </Card>;
}

function CatalogTab() {
  const { data: tags, isLoading: tagsLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const { data: sources, isLoading: sourcesLoading } = useSources();
  const createSource = useCreateSource();
  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();

  const { data: categories, isLoading: categoriesLoading } = useTemplateCategories();
  const createCategory = useCreateTemplateCategory();
  const updateCategory = useUpdateTemplateCategory();
  const deleteCategory = useDeleteTemplateCategory();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-foreground">Nhãn khách hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogList
            items={tags}
            isLoading={tagsLoading}
            hasColor
            placeholder="Tên nhãn mới..."
            onCreate={(name, color) => createTag.mutateAsync({ name, color })}
            onUpdate={(id, name, color) => updateTag.mutateAsync({ id, name, color })}
            onDelete={(id) => deleteTag.mutateAsync(id)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-foreground">Nguồn khách hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogList
            items={sources}
            isLoading={sourcesLoading}
            placeholder="Nguồn mới..."
            onCreate={(name) => createSource.mutateAsync(name)}
            onUpdate={(id, name) => updateSource.mutateAsync({ id, name })}
            onDelete={(id) => deleteSource.mutateAsync(id)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-foreground">Danh mục mẫu tin nhắn</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogList
            items={categories}
            isLoading={categoriesLoading}
            placeholder="Danh mục mới..."
            onCreate={(name) => createCategory.mutateAsync(name)}
            onUpdate={(id, name) => updateCategory.mutateAsync({ id, name })}
            onDelete={(id) => deleteCategory.mutateAsync(id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Cài đặt" />
      <div className="flex-1 overflow-y-auto p-4 md:p-7">
        <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-accent-foreground"><SlidersHorizontal className="h-6 w-6"/></span><div><h2 className="text-2xl font-bold tracking-tight">Cài đặt</h2><p className="mt-1 text-sm text-muted-foreground">Quản lý hồ sơ và tùy chọn tài khoản của bạn</p></div></div>
        <Tabs defaultValue="account" className="space-y-5">
          <TabsList className="h-11 rounded-xl bg-card p-1 shadow-sm">
            <TabsTrigger value="account">Tài khoản</TabsTrigger>
            <TabsTrigger value="catalog">Danh mục</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <AccountTab />
          </TabsContent>
          <TabsContent value="catalog">
            <CatalogTab />
          </TabsContent>
        </Tabs>
        <Card className="bg-card/80"><CardContent className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">© 2026 Zalo CRM</span><span>Quản lý khách hàng và chăm sóc đa kênh</span></CardContent></Card>
        </div>
      </div>
    </div>
  );
}
