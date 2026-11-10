'use client';

import { Bot } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { AiBotChannelCard } from '@/components/ai-bot/ai-bot-channel-card';
import { useAiBotChannels } from '@/hooks/use-ai-bot';

export default function AiBotPage() {
  const { data, isLoading, isError, refetch } = useAiBotChannels();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Trợ lý AI" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Cho mỗi kênh: tab <span className="font-medium text-foreground">Cấu hình</span> để dán API key, chọn model
          và viết hướng dẫn trả lời; tab <span className="font-medium text-foreground">Tài liệu</span> để tải lên
          FAQ/chính sách dạng .txt, .md — hệ thống tự tách đoạn và vector hoá, chỉ gửi cho AI phần liên quan tới
          từng câu hỏi để tiết kiệm token; tab <span className="font-medium text-foreground">Chat thử</span> để kiểm
          tra trước khi bật thật.
        </p>
        <StateView
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
          emptyIcon={<Bot className="h-6 w-6" />}
          emptyTitle="Chưa có kênh nào"
          emptyDescription="Kết nối một kênh Zalo, Telegram hoặc Facebook trước khi cấu hình trợ lý AI."
          loadingFallback={
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-full" />
              ))}
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            {data?.map((channel) => <AiBotChannelCard key={channel.id} channel={channel} />)}
          </div>
        </StateView>
      </div>
    </div>
  );
}
