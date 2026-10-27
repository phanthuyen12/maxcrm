'use client';

import * as React from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Kanban } from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/topbar';
import { StateView } from '@/components/state/state-view';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineColumn } from '@/components/pipeline/pipeline-column';
import { CreateDealDialog } from '@/components/pipeline/create-deal-dialog';
import { useDeals, useUpdateDealStage } from '@/hooks/use-pipeline';
import { DealStage } from '@/lib/types';

const STAGES: { id: DealStage; title: string }[] = [
  { id: 'NEW', title: 'Mới' },
  { id: 'CONSULTING', title: 'Đang tư vấn' },
  { id: 'POTENTIAL', title: 'Tiềm năng' },
  { id: 'WON', title: 'Chốt đơn' },
  { id: 'LOST', title: 'Không thành công' },
];

export default function PipelinePage() {
  const { data: deals, isLoading, isError, refetch } = useDeals();
  const updateStage = useUpdateDealStage();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const dealId = active.id as string;
    const newStage = over.id as string;
    const deal = deals?.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;
    updateStage.mutate(
      { id: dealId, stage: newStage },
      {
        onSuccess: () => toast.success('Đã chuyển giai đoạn deal'),
        onError: () => toast.error('Không thể cập nhật giai đoạn deal'),
      },
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Pipeline bán hàng" />
      <div className="flex items-center justify-end border-b bg-card px-4 py-2">
        <CreateDealDialog />
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <StateView
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={!isLoading && !isError && (deals?.length ?? 0) === 0}
          emptyIcon={<Kanban className="h-6 w-6" />}
          emptyTitle="Chưa có deal nào"
          emptyDescription="Thêm deal đầu tiên để bắt đầu theo dõi pipeline bán hàng."
          loadingFallback={
            <div className="flex gap-3">
              {STAGES.map((s) => (
                <Skeleton key={s.id} className="h-96 w-72 shrink-0" />
              ))}
            </div>
          }
        >
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-3">
              {STAGES.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  id={stage.id}
                  title={stage.title}
                  deals={deals?.filter((d) => d.stage === stage.id) ?? []}
                />
              ))}
            </div>
          </DndContext>
        </StateView>
      </div>
    </div>
  );
}
