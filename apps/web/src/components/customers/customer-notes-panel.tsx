'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StateView } from '@/components/state/state-view';
import { useAddCustomerNote, useCustomerNotes } from '@/hooks/use-customers';
import { formatRelativeTime } from '@/lib/utils';

export function CustomerNotesPanel({ customerId }: { customerId: string }) {
  const { data: notes, isLoading, isError, refetch } = useCustomerNotes(customerId);
  const addNote = useAddCustomerNote(customerId);
  const [content, setContent] = React.useState('');

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Textarea
          placeholder="Thêm ghi chú nội bộ về khách hàng..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="min-h-[76px] w-full resize-y"
        />
        <div className="flex justify-end"><Button
          disabled={!content.trim() || addNote.isPending}
          onClick={() =>
            addNote.mutate(content.trim(), {
              onSuccess: () => {
                setContent('');
                toast.success('Đã thêm ghi chú');
              },
            })
          }
        >
          Lưu
        </Button></div>
      </div>
      <Separator />
      <StateView
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        isEmpty={!isLoading && !isError && (notes?.length ?? 0) === 0}
        emptyTitle="Chưa có ghi chú"
        emptyDescription="Thêm ghi chú để đồng nghiệp cùng theo dõi."
        loadingFallback={<Skeleton className="h-16 w-full" />}
      >
        <ul className="space-y-3">
          {notes?.map((note) => (
            <li key={note.id} className="rounded-xl border bg-card p-3 text-sm">
              <p className="whitespace-pre-wrap break-words">{note.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {note.author.name} · {formatRelativeTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </StateView>
    </div>
  );
}
