'use client';

import * as React from 'react';
import { Search, Inbox as InboxIcon, SlidersHorizontal, X, UserRound, Pin, PinOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { useConversations, usePinConversation } from '@/hooks/use-conversations';
import { useUsers } from '@/hooks/use-users';
import { cn, formatRelativeTime, initials } from '@/lib/utils';
import { Conversation } from '@/lib/types';
import { useZaloOAs } from '@/hooks/use-zalo-oa';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useTags } from '@/hooks/use-tags';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'warning' | 'success' }> = {
  UNREAD: { label: 'Chưa xử lý', variant: 'warning' },
  PROCESSING: { label: 'Đang xử lý', variant: 'default' },
  RESOLVED: { label: 'Đã xử lý', variant: 'success' },
};

export function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('all');
  const [assignedToId, setAssignedToId] = React.useState<string>('all');
  const [channel, setChannel] = React.useState<string>('all');
  const [period, setPeriod] = React.useState<string>('all');
  const [conversationType, setConversationType] = React.useState<string>('all');
  const [tagId, setTagId] = React.useState<string>('all');
  const { data: currentUser } = useCurrentUser();
  const { data: zaloChannels } = useZaloOAs();
  const { data: personalChannels } = useQuery<{ id: string; name: string; channelId: string }[]>({
    queryKey: ['personal-zalo-channel-options'],
    queryFn: () => api.get('/zalo-personal/accounts'),
    staleTime: 30_000,
  });
  const { data: socialChannels } = useQuery<{ id: string; name: string; provider: string }[]>({ queryKey: ['social-channel-options'], queryFn: () => api.get('/social-channels/options') });
  const { data: users } = useUsers();
  const { data: tags } = useTags();
  const activeFilters = [status !== 'all', assignedToId !== 'all', channel !== 'all', period !== 'all', conversationType !== 'all', tagId !== 'all'].filter(Boolean).length;
  const selectedChannelName = zaloChannels?.find((item) => item.id === channel)?.name
    ?? personalChannels?.find((item) => item.channelId === channel)?.name
    ?? socialChannels?.find((item) => item.id === channel)?.name
    ?? 'Kênh';

  const periodStart = period === '24h' ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : period === '7d' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() : undefined;

  const { data, isLoading, isError, refetch } = useConversations({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    zaloOAId: channel === 'all' ? undefined : channel,
    assignedToId: assignedToId === 'me' ? currentUser?.id : assignedToId === 'all' ? undefined : assignedToId,
    dateFrom: periodStart,
    conversationType: conversationType === 'all' ? undefined : conversationType,
    tagId: tagId === 'all' ? undefined : tagId,
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-card">
      <div className="shrink-0 space-y-2 border-b px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Hội thoại</h2>
          {data && <span className="text-xs tabular-nums text-muted-foreground">{data.length}</span>}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm hội thoại…"
            aria-label="Tìm hội thoại"
            className="h-9 pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs"><SlidersHorizontal className="h-3.5 w-3.5" />Bộ lọc{activeFilters > 0 && <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeFilters}</span>}</Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(300px,calc(100vw-32px))] space-y-3 p-3">
              <p className="text-sm font-semibold">Lọc hội thoại</p>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="UNREAD">Chưa đọc</SelectItem>
              <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
              <SelectItem value="RESOLVED">Đã xử lý</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignedToId} onValueChange={setAssignedToId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Phụ trách" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phụ trách</SelectItem>
              {currentUser && <SelectItem value="me">Hội thoại của tôi</SelectItem>}
              <SelectItem value="unassigned">Chưa phân công</SelectItem>
              {users?.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Kênh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kênh</SelectItem>
            {!!zaloChannels?.length && <SelectGroup><SelectLabel>Zalo OA</SelectLabel>{zaloChannels.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectGroup>}
            {!!personalChannels?.length && <SelectGroup><SelectLabel>Zalo cá nhân</SelectLabel>{personalChannels.map((item) => <SelectItem key={item.channelId} value={item.channelId}>{item.name}</SelectItem>)}</SelectGroup>}
            {!!socialChannels?.length && <SelectGroup><SelectLabel>Kênh khác</SelectLabel>{socialChannels.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectGroup>}
          </SelectContent>
        </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Thời gian" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Mọi thời gian</SelectItem><SelectItem value="24h">24 giờ qua</SelectItem><SelectItem value="7d">7 ngày qua</SelectItem></SelectContent>
          </Select>
          <Select value={conversationType} onValueChange={setConversationType}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Loại hội thoại" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Cá nhân và nhóm</SelectItem><SelectItem value="personal">Cá nhân</SelectItem><SelectItem value="group">Nhóm</SelectItem></SelectContent>
          </Select>
          <Select value={tagId} onValueChange={setTagId}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Nhãn khách hàng" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả nhãn</SelectItem>{tags?.map((tag) => <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}</SelectContent>
          </Select>
              {activeFilters > 0 && <Button variant="ghost" size="sm" className="h-8 w-full text-xs" onClick={() => { setStatus('all'); setAssignedToId('all'); setChannel('all'); setPeriod('all'); setConversationType('all'); setTagId('all'); }}>Xóa bộ lọc</Button>}
            </PopoverContent>
          </Popover>
          {activeFilters > 0 && <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-thin">
            {status !== 'all' && <FilterChip label={STATUS_LABEL[status]?.label ?? status} onRemove={() => setStatus('all')} />}
            {assignedToId !== 'all' && <FilterChip label={assignedToId === 'me' ? 'Của tôi' : assignedToId === 'unassigned' ? 'Chưa phân công' : users?.find((u) => u.id === assignedToId)?.name ?? 'Phụ trách'} onRemove={() => setAssignedToId('all')} />}
            {channel !== 'all' && <FilterChip label={selectedChannelName} onRemove={() => setChannel('all')} />}
            {period !== 'all' && <FilterChip label={period === '24h' ? '24 giờ' : '7 ngày'} onRemove={() => setPeriod('all')} />}
            {conversationType !== 'all' && <FilterChip label={conversationType === 'group' ? 'Nhóm' : 'Cá nhân'} onRemove={() => setConversationType('all')} />}
            {tagId !== 'all' && <FilterChip label={tags?.find((tag) => tag.id === tagId)?.name ?? 'Nhãn'} onRemove={() => setTagId('all')} />}
          </div>}
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <StateView
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
          emptyIcon={<InboxIcon className="h-6 w-6" />}
          emptyTitle="Không có hội thoại"
          emptyDescription="Không tìm thấy hội thoại phù hợp với bộ lọc hiện tại."
          loadingFallback={<ListSkeleton />}
        >
          <ul>
            {data?.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === selectedId}
                onClick={() => onSelect(conversation.id)}
              />
            ))}
          </ul>
        </StateView>
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const statusMeta = STATUS_LABEL[conversation.status];
  const isUnread = conversation.status === 'UNREAD';
  const pinMutation = usePinConversation(conversation.id);

  return (
    <li className="relative border-b border-border/70">
      <button
        onClick={onClick}
        className={cn(
          'relative flex min-h-[90px] w-full gap-2.5 px-3 py-3 pr-10 text-left transition-colors hover:bg-secondary/60',
          active && 'bg-accent/80 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-primary',
        )}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback>{initials(conversation.customer.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className={cn('truncate text-sm', isUnread ? 'font-semibold' : 'font-medium')}>
                {conversation.customer.name}
              </p>
              <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none', conversation.isGroup ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600')}>
                {conversation.isGroup ? 'NHÓM' : 'CÁ NHÂN'}
              </span>
            </div>
            <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground" title={new Date(conversation.lastMessageAt).toLocaleString()}>
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          </div>
          <p className="mt-1 truncate text-[13px] text-muted-foreground">
            {conversation.lastMessage
              ? `${conversation.lastMessage.direction === 'OUT' ? 'Bạn: ' : ''}${conversation.lastMessage.content}`
              : 'Chưa có tin nhắn'}
          </p>
          {!!conversation.customer.tags?.length && <div className="mt-1 flex min-w-0 gap-1 overflow-hidden">{conversation.customer.tags.slice(0, 3).map(({ tag }) => <span key={tag.id} className="max-w-24 truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium leading-none" style={{ borderColor: tag.color, color: tag.color }}>{tag.name}</span>)}</div>}
          <div className="mt-2 flex min-w-0 items-center gap-1.5">
            <Badge variant={statusMeta.variant} className="h-5 shrink-0 whitespace-nowrap px-1.5 py-0 text-[10px] leading-4">
              {statusMeta.label}
            </Badge>
            <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" title={conversation.zaloOA.name}>{conversation.zaloOA.name}</span>
            {!conversation.assignedTo && (
              <span className="shrink-0 text-muted-foreground" title="Chưa phân công"><UserRound className="h-3.5 w-3.5" /></span>
            )}
          </div>
        </div>
        {isUnread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
      </button>
      {conversation.isGroup && <button
        type="button"
        onClick={() => pinMutation.mutate(!conversation.isPinned)}
        disabled={pinMutation.isPending}
        aria-label={conversation.isPinned ? 'Bỏ ghim nhóm' : 'Ghim nhóm'}
        title={conversation.isPinned ? 'Bỏ ghim nhóm' : 'Ghim nhóm'}
        className={cn('absolute right-2 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-secondary disabled:opacity-50', conversation.isPinned ? 'text-primary' : 'text-muted-foreground')}
      >
        {conversation.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </button>}
    </li>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-accent px-2 text-[10px] font-medium text-accent-foreground">{label}<button type="button" aria-label={`Xóa bộ lọc ${label}`} onClick={onRemove}><X className="h-3 w-3" /></button></span>;
}

function ListSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
