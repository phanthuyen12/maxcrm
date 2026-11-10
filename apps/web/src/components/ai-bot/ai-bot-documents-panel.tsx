'use client';

import * as React from 'react';
import { FileText, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { useAiBotDocuments, useDeleteAiBotDocument, useUploadAiBotDocument } from '@/hooks/use-ai-bot';

const ACCEPTED_EXTENSIONS = ['.txt', '.md'];

function formatSize(charCount: number) {
  if (charCount < 1000) return `${charCount} ký tự`;
  return `${(charCount / 1000).toFixed(1)}k ký tự`;
}

function isAcceptedFile(file: File) {
  return ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

export function AiBotDocumentsPanel({ botId }: { botId: string }) {
  const { data: documents, isLoading } = useAiBotDocuments(botId);
  const upload = useUploadAiBotDocument(botId);
  const remove = useDeleteAiBotDocument(botId);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const uploadFiles = (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (!isAcceptedFile(file)) {
        toast.error(`"${file.name}" không phải tệp .txt hoặc .md`);
        continue;
      }
      upload.mutate(file, {
        onSuccess: () => toast.success(`Đã thêm "${file.name}" vào kho tài liệu`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : `Tải "${file.name}" thất bại`),
      });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tài liệu upload sẽ được tách đoạn và chuyển thành vector ngay trên server. Khi khách nhắn tin, hệ thống chỉ
        gửi cho AI những đoạn liên quan nhất tới câu hỏi — thay vì toàn bộ tài liệu — nhờ vậy tiết kiệm token dù kho
        tài liệu rất dài.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/50'
        }`}
      >
        {upload.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <UploadCloud className="h-5 w-5 text-muted-foreground" />
        )}
        <p className="text-sm font-medium text-foreground">Kéo thả hoặc bấm để chọn tệp</p>
        <p className="text-xs text-muted-foreground">Hỗ trợ .txt và .md — tối đa 2MB mỗi tệp</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : documents?.length ? (
        <ul className="space-y-1.5">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.chunkCount} đoạn vector · {formatSize(doc.charCount)}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                disabled={remove.isPending}
                title="Xoá tài liệu"
                onClick={() => {
                  if (!window.confirm(`Xoá tài liệu "${doc.fileName}"? AI sẽ không còn dùng nội dung này nữa.`)) return;
                  remove.mutate(doc.id, { onSuccess: () => toast.success(`Đã xoá "${doc.fileName}"`) });
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-secondary/60 px-3 py-2.5 text-center text-xs text-muted-foreground">
          Chưa có tài liệu nào. Tải lên FAQ, chính sách, thông tin sản phẩm... để AI trả lời chính xác hơn.
        </p>
      )}
    </div>
  );
}
