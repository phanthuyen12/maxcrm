'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  AlertCircle, CalendarClock, Check, CheckCircle2, Clock3, Eye, Loader2, Pause, Pencil, Play,
  RefreshCw, Search, Send, Trash2, Users, X, XCircle,
} from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/group-broadcast/rich-text-editor';
import { api } from '@/lib/api';
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils';
import {
  useBroadcastAction, useDeleteGroupBroadcast, useGroupBroadcasts, useSaveGroupBroadcast, useZaloGroups,
  type BroadcastRepeat, type BroadcastStatus, type GroupBroadcast,
} from '@/hooks/use-group-broadcasts';

type Account = { id: string; name: string; status: string };

const REPEAT_OPTIONS: Array<{ value: BroadcastRepeat; label: string; hint: string }> = [
  { value: 'NONE', label: 'Một lần', hint: 'Gửi đúng một lần vào mốc đã chọn' },
  { value: 'DAILY', label: 'Hằng ngày', hint: 'Lặp mỗi ngày vào cùng giờ' },
  { value: 'WEEKLY', label: 'Hằng tuần', hint: 'Lặp vào các thứ đã chọn' },
  { value: 'MONTHLY', label: 'Hằng tháng', hint: 'Lặp vào cùng ngày mỗi tháng' },
];

const WEEKDAYS = [
  { value: 1, label: 'T2' }, { value: 2, label: 'T3' }, { value: 3, label: 'T4' },
  { value: 4, label: 'T5' }, { value: 5, label: 'T6' }, { value: 6, label: 'T7' }, { value: 0, label: 'CN' },
];

const STATUS_META: Record<BroadcastStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  SCHEDULED: { label: 'Đang chờ gửi', className: 'bg-sky-50 text-sky-700', icon: Clock3 },
  RUNNING: { label: 'Đang gửi', className: 'bg-amber-50 text-amber-700', icon: Loader2 },
  COMPLETED: { label: 'Đã gửi xong', className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  FAILED: { label: 'Gửi lỗi', className: 'bg-red-50 text-red-700', icon: AlertCircle },
  PAUSED: { label: 'Tạm dừng', className: 'bg-secondary text-muted-foreground', icon: Pause },
  CANCELED: { label: 'Đã hủy', className: 'bg-secondary text-muted-foreground', icon: XCircle },
};

const pad = (value: number) => String(value).padStart(2, '0');

/** `datetime-local` làm việc theo giờ máy người dùng; đổi qua lại với ISO khi gọi API. */
function toInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultSchedule() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toInputValue(date);
}

const emptyForm = () => ({
  id: '' as string,
  accountId: '',
  name: '',
  contentHtml: '',
  scheduledAt: defaultSchedule(),
  repeat: 'NONE' as BroadcastRepeat,
  repeatDays: [1] as number[],
  intervalMs: 2000,
  targets: [] as Array<{ groupId: string; groupName: string }>,
});

function describeRepeat(broadcast: Pick<GroupBroadcast, 'repeat' | 'repeatDays'>) {
  if (broadcast.repeat === 'NONE') return 'Gửi một lần';
  if (broadcast.repeat === 'DAILY') return 'Lặp hằng ngày';
  if (broadcast.repeat === 'MONTHLY') return 'Lặp hằng tháng';
  const days = WEEKDAYS.filter((day) => broadcast.repeatDays.includes(day.value)).map((day) => day.label);
  return `Lặp hằng tuần · ${days.join(', ') || 'chưa chọn thứ'}`;
}

export default function GroupBroadcastPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [form, setForm] = React.useState(emptyForm);
  const [groupSearch, setGroupSearch] = React.useState('');
  const [preview, setPreview] = React.useState<{ text: string; length: number } | null>(null);
  const [error, setError] = React.useState('');
  const [expandedRun, setExpandedRun] = React.useState('');

  const broadcasts = useGroupBroadcasts();
  const groups = useZaloGroups(form.accountId);
  const save = useSaveGroupBroadcast();
  const action = useBroadcastAction();
  const remove = useDeleteGroupBroadcast();

  React.useEffect(() => {
    api.get<Account[]>('/zalo-personal/accounts')
      .then((items) => {
        setAccounts(items);
        const connected = items.find((item) => item.status === 'connected');
        if (connected) setForm((current) => (current.accountId ? current : { ...current, accountId: connected.id }));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Không tải được tài khoản Zalo'));
  }, []);

  // Bản xem trước lấy từ server để đúng y hệt những gì Zalo sẽ nhận được.
  React.useEffect(() => {
    if (!form.contentHtml.trim()) { setPreview(null); return; }
    const timer = setTimeout(() => {
      api.post<{ text: string; length: number }>('/group-broadcasts/preview', { contentHtml: form.contentHtml })
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [form.contentHtml]);

  const connectedAccounts = accounts.filter((account) => account.status === 'connected');
  const selectedIds = new Set(form.targets.map((target) => target.groupId));
  const visibleGroups = (groups.data ?? []).filter((group) => group.name.toLowerCase().includes(groupSearch.trim().toLowerCase()));
  const editing = Boolean(form.id);

  const toggleGroup = (group: { id: string; name: string }) => setForm((current) => ({
    ...current,
    targets: selectedIds.has(group.id)
      ? current.targets.filter((target) => target.groupId !== group.id)
      : [...current.targets, { groupId: group.id, groupName: group.name }],
  }));

  const toggleAllVisible = () => setForm((current) => {
    const allSelected = visibleGroups.length > 0 && visibleGroups.every((group) => selectedIds.has(group.id));
    if (allSelected) {
      const visibleSet = new Set(visibleGroups.map((group) => group.id));
      return { ...current, targets: current.targets.filter((target) => !visibleSet.has(target.groupId)) };
    }
    const merged = new Map(current.targets.map((target) => [target.groupId, target]));
    for (const group of visibleGroups) merged.set(group.id, { groupId: group.id, groupName: group.name });
    return { ...current, targets: [...merged.values()] };
  });

  const startEdit = (broadcast: GroupBroadcast) => {
    setForm({
      id: broadcast.id,
      accountId: broadcast.accountId,
      name: broadcast.name,
      contentHtml: broadcast.contentHtml,
      scheduledAt: toInputValue(new Date(broadcast.nextRunAt ?? broadcast.scheduledAt)),
      repeat: broadcast.repeat,
      repeatDays: broadcast.repeatDays.length ? broadcast.repeatDays : [1],
      intervalMs: broadcast.intervalMs,
      targets: broadcast.targets,
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const scheduledAt = new Date(form.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) { setError('Hãy chọn thời điểm hẹn giờ.'); return; }
    try {
      await save.mutateAsync({
        id: form.id || undefined,
        accountId: form.accountId,
        name: form.name.trim(),
        contentHtml: form.contentHtml,
        targets: form.targets,
        scheduledAt: scheduledAt.toISOString(),
        repeat: form.repeat,
        repeatDays: form.repeat === 'WEEKLY' ? form.repeatDays : undefined,
        intervalMs: form.intervalMs,
      });
      toast.success(editing ? 'Đã cập nhật lịch gửi' : 'Đã tạo lịch gửi tin nhóm');
      setForm({ ...emptyForm(), accountId: form.accountId });
      setPreview(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không lưu được lịch gửi';
      setError(message);
      toast.error(message);
    }
  };

  const runAction = async (id: string, next: 'pause' | 'resume' | 'cancel' | 'run-now', label: string) => {
    try {
      await action.mutateAsync({ id, action: next });
      toast.success(label);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Không thực hiện được');
    }
  };

  const deleteBroadcast = async (broadcast: GroupBroadcast) => {
    if (!window.confirm(`Xóa lịch “${broadcast.name}”? Thao tác này không thể hoàn lại.`)) return;
    try {
      await remove.mutateAsync(broadcast.id);
      toast.success('Đã xóa lịch gửi');
      if (form.id === broadcast.id) setForm({ ...emptyForm(), accountId: form.accountId });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Không xóa được lịch gửi');
    }
  };

  const hasContent = form.contentHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
  const canSubmit = Boolean(form.accountId && form.name.trim() && form.targets.length && hasContent) && !save.isPending;

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <Topbar title="Hẹn giờ gửi tin nhóm Zalo" />
    <main className="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-6 xl:p-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Chiến dịch Zalo</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Hẹn giờ gửi tin vào nhóm</h1>
            <p className="mt-1 text-sm text-muted-foreground">Soạn một tin có định dạng, chọn nhiều nhóm và đặt giờ gửi tự động.</p>
          </div>
          <div className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">Lịch được quét mỗi phút · giờ Việt Nam</div>
        </div>

        <form onSubmit={submit} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-3 border-b pb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><CalendarClock className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h2 className="font-semibold">{editing ? 'Sửa lịch gửi' : 'Tạo lịch gửi mới'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Nội dung hỗ trợ in đậm, nghiêng, gạch chân, màu và danh sách — Zalo sẽ hiển thị đúng các định dạng này.</p>
              </div>
              {editing && <Button type="button" variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => { setForm({ ...emptyForm(), accountId: form.accountId }); setError(''); }}><X className="h-4 w-4" />Thoát sửa</Button>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block min-w-0 space-y-2 text-sm">
                <span className="font-medium">Tài khoản Zalo gửi</span>
                <select
                  className="h-10 w-full rounded-lg border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  value={form.accountId}
                  onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value, targets: [] }))}
                  required
                >
                  <option value="">Chọn tài khoản đã kết nối</option>
                  {connectedAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
                {connectedAccounts.length === 0 && <span className="block text-xs text-amber-700">Chưa có tài khoản Zalo cá nhân đang kết nối.</span>}
              </label>
              <label className="block min-w-0 space-y-2 text-sm">
                <span className="font-medium">Tên lịch gửi</span>
                <Input value={form.name} maxLength={120} required placeholder="VD: Thông báo khuyến mãi sáng thứ 2" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="h-10" />
              </label>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">Nhóm nhận tin</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{form.targets.length} nhóm đã chọn</span>
                  <Button type="button" variant="outline" size="sm" className="h-8" disabled={!form.accountId || groups.isFetching} onClick={() => groups.refetch()}>
                    {groups.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {groups.isFetching ? 'Đang tải…' : 'Tải nhóm'}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <div className="flex items-center gap-2 border-b bg-secondary/40 px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                    placeholder="Tìm nhóm theo tên…"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button type="button" onClick={toggleAllVisible} disabled={!visibleGroups.length} className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline disabled:opacity-40">
                    {visibleGroups.length > 0 && visibleGroups.every((group) => selectedIds.has(group.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
                <div className="scrollbar-thin max-h-64 overflow-y-auto">
                  {!form.accountId && <p className="p-6 text-center text-sm text-muted-foreground">Hãy chọn tài khoản Zalo trước.</p>}
                  {form.accountId && groups.isLoading && <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải danh sách nhóm từ Zalo…</p>}
                  {form.accountId && groups.isError && <p className="p-6 text-center text-sm text-destructive">{groups.error instanceof Error ? groups.error.message : 'Không tải được danh sách nhóm'}</p>}
                  {form.accountId && !groups.isLoading && !groups.isError && visibleGroups.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Không có nhóm nào khớp.</p>}
                  {visibleGroups.map((group) => {
                    const checked = selectedIds.has(group.id);
                    return <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className={cn('flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-0', checked ? 'bg-accent/40' : 'hover:bg-secondary/40')}
                    >
                      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', checked ? 'border-primary bg-primary text-primary-foreground' : 'bg-background')}>
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium" title={group.name}>{group.name}</span>
                        <span className="block text-xs text-muted-foreground">{group.memberCount} thành viên</span>
                      </span>
                    </button>;
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <span className="font-medium">Nội dung tin nhắn</span>
              <RichTextEditor value={form.contentHtml} onChange={(contentHtml) => setForm((current) => ({ ...current, contentHtml }))} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Zalo chỉ nhận 4 màu đậm/cam/vàng/xanh; màu khác sẽ được quy về màu gần nhất.</span>
                <span className="tabular-nums">{preview?.length ?? 0} / 2000 ký tự</span>
              </div>
            </div>

            {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">Tin được gửi tuần tự từng nhóm, giãn cách {(form.intervalMs / 1000).toFixed(1)} giây.</p>
              <Button type="submit" disabled={!canSubmit} className="h-10 min-w-40 rounded-lg px-4">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                {save.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : `Hẹn giờ gửi ${form.targets.length} nhóm`}
              </Button>
            </div>
          </div>

          <aside className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            <div><h2 className="text-sm font-semibold">Hẹn giờ</h2><p className="mt-1 text-xs text-muted-foreground">Thời gian tính theo giờ Việt Nam.</p></div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Thời điểm gửi</span>
              <Input type="datetime-local" value={form.scheduledAt} required onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))} className="h-10" />
            </label>

            <div className="space-y-2 text-sm">
              <span className="font-medium">Lặp lại</span>
              <div className="grid grid-cols-2 gap-2">
                {REPEAT_OPTIONS.map((option) => <button
                  key={option.value}
                  type="button"
                  title={option.hint}
                  onClick={() => setForm((current) => ({ ...current, repeat: option.value }))}
                  className={cn('rounded-lg border px-3 py-2 text-xs font-medium transition-colors', form.repeat === option.value ? 'border-primary bg-accent/50 text-primary' : 'bg-background hover:bg-secondary/50')}
                >{option.label}</button>)}
              </div>
            </div>

            {form.repeat === 'WEEKLY' && <div className="space-y-2 text-sm">
              <span className="font-medium">Các thứ trong tuần</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const picked = form.repeatDays.includes(day.value);
                  return <button
                    key={day.value}
                    type="button"
                    onClick={() => setForm((current) => ({
                      ...current,
                      repeatDays: picked ? current.repeatDays.filter((value) => value !== day.value) : [...current.repeatDays, day.value],
                    }))}
                    className={cn('h-9 w-10 rounded-lg border text-xs font-semibold transition-colors', picked ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary/50')}
                  >{day.label}</button>;
                })}
              </div>
              {form.repeatDays.length === 0 && <span className="block text-xs text-amber-700">Hãy chọn ít nhất một thứ.</span>}
            </div>}

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Giãn cách giữa 2 nhóm</span>
              <select className="h-10 w-full rounded-lg border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value={form.intervalMs} onChange={(event) => setForm((current) => ({ ...current, intervalMs: Number(event.target.value) }))}>
                {[1000, 2000, 3000, 5000, 10000, 20000].map((value) => <option key={value} value={value}>{value / 1000} giây</option>)}
              </select>
              <span className="block text-xs text-muted-foreground">Giãn cách rộng hơn giúp giảm nguy cơ Zalo chặn tài khoản.</span>
            </label>

            <div className="space-y-2 rounded-xl border border-dashed p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Eye className="h-3.5 w-3.5" />Zalo sẽ nhận được</p>
              {preview?.text
                ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{preview.text}</p>
                : <p className="text-xs text-muted-foreground">Nhập nội dung để xem trước.</p>}
            </div>
          </aside>
        </form>

        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
            <div><h2 className="font-semibold">Lịch đã hẹn</h2><p className="mt-1 text-sm text-muted-foreground">Theo dõi mốc gửi kế tiếp và kết quả của lần gửi gần nhất.</p></div>
            <Button type="button" variant="outline" size="sm" disabled={broadcasts.isFetching} onClick={() => broadcasts.refetch()}>
              {broadcasts.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Làm mới
            </Button>
          </div>

          {broadcasts.isLoading && <p className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải lịch gửi…</p>}
          {!broadcasts.isLoading && (broadcasts.data?.length ?? 0) === 0 && <p className="p-10 text-center text-sm text-muted-foreground">Chưa có lịch gửi nào. Hãy tạo lịch đầu tiên ở phía trên.</p>}

          <div className="divide-y">
            {(broadcasts.data ?? []).map((broadcast) => {
              const meta = STATUS_META[broadcast.status];
              const StatusIcon = meta.icon;
              const run = broadcast.latestRun;
              const open = expandedRun === broadcast.id;
              return <article key={broadcast.id} className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold" title={broadcast.name}>{broadcast.name}</h3>
                      <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', meta.className)}>
                        <StatusIcon className={cn('h-3.5 w-3.5', broadcast.status === 'RUNNING' && 'animate-spin')} />{meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {broadcast.account.name} · {describeRepeat(broadcast)} · {broadcast.targets.length} nhóm
                      {broadcast.createdBy ? ` · tạo bởi ${broadcast.createdBy.name}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button type="button" variant="outline" size="sm" className="h-8" disabled={action.isPending} onClick={() => runAction(broadcast.id, 'run-now', 'Đã bắt đầu gửi — kết quả cập nhật bên dưới')}><Send className="h-3.5 w-3.5" />Gửi ngay</Button>
                    {broadcast.status === 'SCHEDULED' && <Button type="button" variant="outline" size="sm" className="h-8" disabled={action.isPending} onClick={() => runAction(broadcast.id, 'pause', 'Đã tạm dừng lịch')}><Pause className="h-3.5 w-3.5" />Tạm dừng</Button>}
                    {broadcast.status === 'PAUSED' && <Button type="button" variant="outline" size="sm" className="h-8" disabled={action.isPending} onClick={() => runAction(broadcast.id, 'resume', 'Đã tiếp tục lịch')}><Play className="h-3.5 w-3.5" />Tiếp tục</Button>}
                    {(broadcast.status === 'SCHEDULED' || broadcast.status === 'PAUSED') && <Button type="button" variant="outline" size="sm" className="h-8" disabled={action.isPending} onClick={() => runAction(broadcast.id, 'cancel', 'Đã hủy lịch')}><XCircle className="h-3.5 w-3.5" />Hủy lịch</Button>}
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => startEdit(broadcast)}><Pencil className="h-3.5 w-3.5" />Sửa</Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => deleteBroadcast(broadcast)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Mốc gửi kế tiếp</p>
                    <p className="mt-1 text-sm font-medium">{broadcast.nextRunAt ? formatDateTime(broadcast.nextRunAt) : '—'}</p>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Lần gửi gần nhất</p>
                    <p className="mt-1 text-sm font-medium">{broadcast.lastRunAt ? formatRelativeTime(broadcast.lastRunAt) : 'Chưa gửi'}</p>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Kết quả lần gần nhất</p>
                    <p className="mt-1 text-sm font-medium tabular-nums">{run ? <><span className="text-emerald-700">{run.sent} gửi được</span>{run.failed > 0 && <span className="text-destructive"> · {run.failed} lỗi</span>}</> : '—'}</p>
                  </div>
                </div>

                <p className="line-clamp-2 whitespace-pre-wrap break-words rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">{broadcast.contentText}</p>

                <div className="flex flex-wrap items-center gap-1.5">
                  {broadcast.targets.slice(0, open ? undefined : 6).map((target) => <span key={target.groupId} className="inline-flex max-w-[220px] items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs">
                    <Users className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="truncate" title={target.groupName}>{target.groupName}</span>
                  </span>)}
                  {!open && broadcast.targets.length > 6 && <span className="text-xs text-muted-foreground">+{broadcast.targets.length - 6} nhóm nữa</span>}
                  {(broadcast.targets.length > 6 || (run?.results.length ?? 0) > 0) && <button type="button" onClick={() => setExpandedRun(open ? '' : broadcast.id)} className="text-xs font-medium text-primary hover:underline">
                    {open ? 'Thu gọn' : 'Xem chi tiết'}
                  </button>}
                </div>

                {open && run && <div className="overflow-hidden rounded-xl border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                    <span>Lượt gửi {formatDateTime(run.startedAt)}</span>
                    <span className="tabular-nums">{run.sent}/{run.total} thành công</span>
                  </div>
                  <div className="scrollbar-thin max-h-64 divide-y overflow-y-auto">
                    {run.results.map((result) => <div key={result.groupId} className="flex items-start gap-2.5 px-3 py-2 text-sm">
                      <span className={cn('mt-0.5 shrink-0', result.status === 'sent' ? 'text-emerald-600' : result.status === 'failed' ? 'text-destructive' : 'text-muted-foreground')}>
                        {result.status === 'sent' ? <CheckCircle2 className="h-4 w-4" /> : result.status === 'failed' ? <AlertCircle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" title={result.groupName}>{result.groupName}</p>
                        {result.status === 'failed' && <p className="break-words text-xs text-destructive">{result.error || 'Không gửi được tin nhắn'}</p>}
                        {result.status === 'sent' && result.sentAt && <p className="text-xs text-muted-foreground">Đã gửi {formatRelativeTime(result.sentAt)}</p>}
                      </div>
                    </div>)}
                  </div>
                </div>}
              </article>;
            })}
          </div>
        </section>
      </div>
    </main>
  </div>;
}
