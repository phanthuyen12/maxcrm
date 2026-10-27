import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { Message } from '@/lib/types';

export function MessageBubble({ message }: { message: Message }) {
  const isOut = message.direction === 'OUT';
  const inlineImage = message.attachmentUrl ?? (isDirectImageUrl(message.content) ? message.content.trim() : null);

  return (
    <div className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] space-y-1', isOut ? 'items-end' : 'items-start')}>
        {!isOut && message.externalSenderName && <div className="flex max-w-full items-center gap-1.5 px-1 text-[11px] font-medium text-muted-foreground">
          {message.externalSenderAvatar && <img src={message.externalSenderAvatar} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />}
          <span className="truncate" title={message.externalSenderName}>{message.externalSenderName}</span>
        </div>}
        {isOut && message.sender?.name && <div className="max-w-full truncate px-1 text-[11px] font-medium text-muted-foreground" title={`Gửi bởi ${message.sender.name}`}>{message.sender.name}</div>}
        <div
          className={cn(
            'max-w-full break-words rounded-2xl px-3.5 py-2 text-sm leading-[1.5] [overflow-wrap:anywhere]',
            isOut ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border border-border/70 bg-white text-foreground',
          )}
        >
          {!(inlineImage && isDirectImageUrl(message.content)) && message.content}
          {message.attachmentUrl && (
            <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block underline underline-offset-2">
              {message.type === 'IMAGE' || inlineImage ? <img src={inlineImage ?? message.attachmentUrl} alt={message.content || 'Ảnh đính kèm'} className="max-h-72 max-w-full rounded-lg object-contain" /> : `Tải tệp: ${message.content || 'Tệp đính kèm'}`}
            </a>
          )}
          {!message.attachmentUrl && inlineImage && <a href={inlineImage} target="_blank" rel="noreferrer" className="mt-2 block"><img src={inlineImage} alt="Ảnh khách gửi" className="max-h-72 max-w-full rounded-lg object-contain" /></a>}
        </div>
        <div
          className={cn(
            'flex items-center gap-1 text-[11px] text-muted-foreground',
            isOut ? 'justify-end' : 'justify-start',
          )}
        >
          <span title={formatDateTime(message.sentAt)}>{new Date(message.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          {isOut && <MessageStatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function isDirectImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol)
      && (/\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(url.pathname) || url.hostname.endsWith('.zdn.vn'));
  } catch {
    return false;
  }
}

function MessageStatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'SENDING') return <Clock className="h-3 w-3" />;
  if (status === 'FAILED') return <AlertCircle className="h-3 w-3 text-destructive" />;
  if (status === 'DELIVERED') return <CheckCheck className="h-3 w-3 text-primary" />;
  return <Check className="h-3 w-3" />;
}
