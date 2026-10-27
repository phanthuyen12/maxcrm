'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Deal } from '@/lib/types';
import { cn, formatCurrency, initials } from '@/lib/utils';

export function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow active:cursor-grabbing',
        isDragging && 'z-10 opacity-60 shadow-lg',
      )}
    >
      <p className="text-sm font-medium">{deal.customer.name}</p>
      <p className="mt-1 text-base font-semibold text-primary">{formatCurrency(deal.value)}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[9px]">{initials(deal.owner.name)}</AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground">{deal.owner.name}</span>
      </div>
    </div>
  );
}
