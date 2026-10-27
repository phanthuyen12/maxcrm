'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StateView } from '@/components/state/state-view';
import { useTemplates } from '@/hooks/use-templates';

export function TemplatePicker({ onSelect }: { onSelect: (content: string) => void }) {
  const { data, isLoading, isError, refetch } = useTemplates();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" type="button" title="Chọn mẫu trả lời">
          <FileText className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b p-3 text-sm font-medium">Mẫu trả lời nhanh</div>
        <div className="max-h-80 overflow-y-auto p-1">
          <StateView
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
            emptyTitle="Chưa có mẫu"
            emptyDescription="Tạo mẫu tin nhắn ở trang Mẫu tin nhắn."
          >
            {data?.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template.content)}
                className="block w-full rounded-md p-2 text-left text-sm hover:bg-accent"
              >
                <p className="font-medium">{template.title}</p>
                <p className="truncate text-xs text-muted-foreground">{template.content}</p>
              </button>
            ))}
          </StateView>
        </div>
      </PopoverContent>
    </Popover>
  );
}
