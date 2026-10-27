'use client';

import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Deal } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { DealCard } from './deal-card';

export function PipelineColumn({
  id,
  title,
  deals,
}: {
  id: string;
  title: string;
  deals: Deal[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border bg-secondary/40 transition-colors',
        isOver && 'bg-primary/5 ring-2 ring-primary/40',
      )}
    >
      <div className="flex items-center justify-between border-b bg-card/60 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="secondary">{deals.length}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
        {deals.length === 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">Chưa có deal nào</p>
        )}
      </div>
    </div>
  );
}
