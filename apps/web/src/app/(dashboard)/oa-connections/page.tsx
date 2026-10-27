'use client';

import { Link2 } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OaCard } from '@/components/oa/oa-card';
import { StaffRosterTable } from '@/components/oa/staff-roster-table';
import { useZaloOAs } from '@/hooks/use-zalo-oa';

export default function OaConnectionsPage() {
  const { data, isLoading, isError, refetch } = useZaloOAs();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Kết nối Zalo OA" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Quản lý các tài khoản Zalo Official Account đã kết nối, webhook nhận tin nhắn, giới hạn gửi tin theo
          chính sách Zalo OA và nhân viên tiếp nhận chat. Dữ liệu kết nối/đồng bộ/webhook trong môi trường demo
          này được giả lập, không gọi API Zalo thật.
        </p>
        <Tabs defaultValue="channels">
          <TabsList>
            <TabsTrigger value="channels">Kênh kết nối</TabsTrigger>
            <TabsTrigger value="staff">Thành viên tiếp nhận chat</TabsTrigger>
          </TabsList>
          <TabsContent value="channels">
            <StateView
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
              emptyIcon={<Link2 className="h-6 w-6" />}
              emptyTitle="Chưa kết nối Zalo OA nào"
              emptyDescription="Kết nối Zalo Official Account để bắt đầu quản lý hội thoại."
              loadingFallback={
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-72 w-full" />
                  ))}
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                {data?.map((oa) => <OaCard key={oa.id} oa={oa} />)}
              </div>
            </StateView>
          </TabsContent>
          <TabsContent value="staff">
            <StaffRosterTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
