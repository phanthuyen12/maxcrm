'use client';

import { MessageSquare, MessagesSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { useConversationOverview } from '@/hooks/use-reports';

const PERIODS = [
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: 'year', label: 'Năm nay' },
] as const;

const PROVIDER_LABEL: Record<string, string> = { ZALO: 'Zalo OA', TELEGRAM: 'Telegram', FACEBOOK: 'Facebook', PERSONAL_ZALO: 'Zalo cá nhân' };

export function ConversationOverview() {
  const { data, isLoading, isError, refetch } = useConversationOverview();
  const totalMonth = data?.periods.month ?? 0;

  return <div className="space-y-4">
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b bg-white px-5 py-4">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-accent text-accent-foreground"><MessagesSquare className="h-5 w-5" /></span><div><CardTitle>Hội thoại</CardTitle><p className="mt-1 text-xs text-muted-foreground">Số cuộc hội thoại được tạo trong kỳ</p></div></div>
        <span className="hidden rounded-full border border-primary/20 bg-accent/60 px-2.5 py-1 text-[11px] font-medium text-accent-foreground sm:inline-flex">Theo kỳ</span>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="grid grid-cols-3 divide-x">{PERIODS.map((period) => <div key={period.key} className="space-y-3 p-5"><Skeleton className="h-3 w-16" /><Skeleton className="h-7 w-12" /></div>)}</div>
          : <div className="grid grid-cols-3 divide-x">{PERIODS.map((period) => <div key={period.key} className="p-4 sm:p-5"><p className="text-xs font-medium text-muted-foreground">{period.label}</p><p className="mt-2 text-2xl font-semibold leading-none tabular-nums tracking-tight">{data?.periods[period.key] ?? 0}</p><p className="mt-2 text-[11px] text-muted-foreground">cuộc hội thoại</p></div>)}</div>}
        {isError && <div className="border-t px-5 py-3 text-sm text-destructive">Không tải được thống kê hội thoại. <button className="font-medium underline" onClick={() => void refetch()}>Thử lại</button></div>}
      </CardContent>
    </Card>

    <Card className="overflow-hidden shadow-none">
      <CardHeader className="flex-row items-center gap-3 border-b bg-white px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-accent text-accent-foreground"><MessageSquare className="h-5 w-5" /></span>
        <div><CardTitle>Kênh hội thoại</CardTitle><p className="mt-1 text-xs text-muted-foreground">Theo dõi tuần, tháng và năm</p></div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="space-y-4 p-5">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-10 w-full" />)}</div>
          : <StateView isLoading={false} isError={isError} onRetry={refetch} isEmpty={!data?.channels.length} emptyTitle="Chưa có kênh" emptyDescription="Kết nối kênh để xem thống kê hội thoại.">
            <div className="divide-y">
              <div className="grid grid-cols-[minmax(0,1fr)_52px_52px_52px] gap-2 bg-secondary/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[minmax(0,1fr)_64px_64px_64px] sm:px-5"><span>Kênh</span><span className="text-right">Tuần</span><span className="text-right">Tháng</span><span className="text-right">Năm</span></div>
              {data?.channels.map((channel) => <div key={channel.id} className="grid grid-cols-[minmax(0,1fr)_48px_48px_48px] items-center gap-2 px-4 py-2.5 transition-colors hover:bg-secondary/30 sm:grid-cols-[minmax(0,1fr)_72px_72px_72px] sm:px-5">
                <div className="min-w-0"><p className="truncate text-sm font-medium" title={channel.name}>{channel.name}</p><div className="mt-1 flex items-center gap-2"><p className="shrink-0 text-[10px] text-muted-foreground">{PROVIDER_LABEL[channel.kind] ?? channel.provider}</p>{totalMonth > 0 && <div className="h-1 min-w-8 max-w-44 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(100, channel.month / totalMonth * 100)}%` }} /></div>}</div></div>
                <span className="text-right text-sm tabular-nums text-muted-foreground">{channel.week}</span><span className="text-right text-sm font-semibold tabular-nums text-primary">{channel.month}</span><span className="text-right text-sm tabular-nums text-muted-foreground">{channel.year}</span>
              </div>)}
            </div>
          </StateView>}
      </CardContent>
    </Card>
  </div>;
}
