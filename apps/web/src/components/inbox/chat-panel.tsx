'use client';

import * as React from 'react';
import { MessageCircle, Paperclip, Send, Loader2, X, ArrowLeft, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { MessageBubble } from './message-bubble';
import { TemplatePicker } from './template-picker';
import {
  useConversation,
  useConversationMessages,
  useSendMessage,
  useUpdateConversation,
} from '@/hooks/use-conversations';
import { initials } from '@/lib/utils';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'warning' | 'success' }> = {
  UNREAD: { label: 'Chưa đọc', variant: 'warning' },
  PROCESSING: { label: 'Đang xử lý', variant: 'default' },
  RESOLVED: { label: 'Đã xử lý', variant: 'success' },
};

export function ChatPanel({ conversationId, onBack, onShowCustomer, customerOpen }: { conversationId: string | null; onBack: () => void; onShowCustomer: () => void; customerOpen: boolean }) {
  const { data: conversation, isLoading: convLoading } = useConversation(conversationId);
  const { data: messages, isLoading, isError, refetch } = useConversationMessages(conversationId);
  const sendMessage = useSendMessage(conversationId ?? '');
  const updateConversation = useUpdateConversation(conversationId ?? '');
  const [content, setContent] = React.useState('');
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  }, [content]);

  React.useEffect(() => {
    if (conversation && conversation.status === 'UNREAD' && conversationId) {
      updateConversation.mutate({ status: 'PROCESSING' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]);

  if (!conversationId) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <MessageCircle className="h-10 w-10" />
        <p className="text-sm">Chọn một hội thoại để bắt đầu trò chuyện</p>
      </div>
    );
  }

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed && !attachment) return;
    try {
      let uploaded: { url: string; type: 'IMAGE' | 'FILE'; name: string } | undefined;
      if (attachment) {
        const form = new FormData();
        form.append('file', attachment);
        uploaded = await api.post('/conversations/attachments', form);
      }
      await sendMessage.mutateAsync({ content: trimmed || uploaded?.name || '', type: uploaded?.type, attachmentUrl: uploaded?.url });
      setContent('');
      setAttachment(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gửi tin nhắn thất bại, vui lòng thử lại');
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-card px-3 sm:px-4">
        {convLoading ? (
          <Skeleton className="h-9 w-40" />
        ) : conversation ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 md:hidden" title="Quay lại danh sách" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials(conversation.customer.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" title={conversation.customer.name}>{conversation.customer.name}</p>
              <p className="max-w-[180px] truncate text-xs text-muted-foreground" title={conversation.zaloOA.name}>{conversation.zaloOA.name}</p>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 max-w-[128px] whitespace-nowrap px-2 text-xs">
                <span className="truncate">{STATUS_LABEL[conversation?.status ?? 'PROCESSING']?.label ?? 'Trạng thái'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => updateConversation.mutate({ status: 'PROCESSING' })}>
                Đang xử lý
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateConversation.mutate({ status: 'RESOLVED' })}>
                Đã xử lý
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title={customerOpen ? 'Đóng hồ sơ khách hàng' : 'Mở hồ sơ khách hàng'} onClick={onShowCustomer}><UserRound className="h-4 w-4" /></Button>
        </div>
      </div>

      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F6F8FA] px-4 py-4 sm:px-6">
        <StateView
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={!isLoading && !isError && (messages?.length ?? 0) === 0}
          emptyTitle="Chưa có tin nhắn"
          emptyDescription="Hãy bắt đầu cuộc trò chuyện với khách hàng."
          loadingFallback={<MessagesSkeleton />}
        >
          {messages?.map((message, index) => {
            const currentDay = new Date(message.sentAt).toLocaleDateString('vi-VN');
            const previousDay = index > 0 ? new Date(messages[index - 1].sentAt).toLocaleDateString('vi-VN') : null;
            return <React.Fragment key={message.id}>
              {currentDay !== previousDay && <div className="flex justify-center py-1"><span className="rounded-full border bg-white px-3 py-1 text-[11px] text-muted-foreground">{currentDay}</span></div>}
              <MessageBubble message={message} />
            </React.Fragment>;
          })}
        </StateView>
      </div>

      <div className="shrink-0 border-t bg-card px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-end gap-1.5 sm:gap-2">
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.txt,.zip,.docx,.xlsx,.pptx" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />
          <Button variant="ghost" size="icon" type="button" className="h-9 w-9 shrink-0 border" title="Đính kèm file/ảnh" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <TemplatePicker onSelect={(text) => setContent((prev) => (prev ? prev + '\n' + text : text))} />
          <Textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              const native = e.nativeEvent as KeyboardEvent;
              if (e.key === 'Enter' && !e.shiftKey && !native.isComposing && native.keyCode !== 229) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Nhập tin nhắn…"
            aria-label="Nhập tin nhắn"
            className="min-h-[38px] max-h-[140px] min-w-0 flex-1 resize-none overflow-y-auto rounded-lg py-2"
            rows={1}
          />
          <Button onClick={() => void handleSend()} disabled={(!content.trim() && !attachment) || sendMessage.isPending} className="h-9 shrink-0 px-3">
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gửi
          </Button>
        </div>
        <p className="mt-1.5 pl-1 text-[11px] text-muted-foreground">Enter để gửi · Shift+Enter xuống dòng</p>
        {attachment && <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="truncate">Tệp đính kèm: {attachment.name}</span><button type="button" title="Bỏ tệp" onClick={() => setAttachment(null)}><X className="h-3.5 w-3.5" /></button></div>}
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={i % 2 === 0 ? 'flex justify-start' : 'flex justify-end'}>
          <Skeleton className="h-10 w-48 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
