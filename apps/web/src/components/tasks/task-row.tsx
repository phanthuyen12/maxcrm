'use client';

import { Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDeleteTask, useUpdateTask } from '@/hooks/use-tasks';
import { Task } from '@/lib/types';
import { cn, formatDateTime, initials } from '@/lib/utils';

const PRIORITY_META: Record<string, { label: string; variant: 'default' | 'warning' | 'destructive' }> = {
  LOW: { label: 'Thấp', variant: 'default' },
  MEDIUM: { label: 'Trung bình', variant: 'warning' },
  HIGH: { label: 'Cao', variant: 'destructive' },
};

export function TaskRow({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const isOverdue = task.status === 'TODO' && new Date(task.dueAt) < new Date();

  return (
    <div className={cn('flex items-center gap-3 border-b p-3', task.status === 'DONE' && 'opacity-60')}>
      <input
        type="checkbox"
        checked={task.status === 'DONE'}
        onChange={(e) => updateTask.mutate({ id: task.id, status: e.target.checked ? 'DONE' : 'TODO' })}
        className="h-4 w-4 accent-primary"
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', task.status === 'DONE' && 'line-through')}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className={cn(isOverdue && 'font-medium text-destructive')}>
            Hạn: {formatDateTime(task.dueAt)}
            {isOverdue && ' · Quá hạn'}
          </span>
          {task.customer && <span>· KH: {task.customer.name}</span>}
        </div>
      </div>
      <Badge variant={PRIORITY_META[task.priority].variant}>{PRIORITY_META[task.priority].label}</Badge>
      <div className="flex items-center gap-1.5">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback>
        </Avatar>
      </div>
      <Button variant="ghost" size="icon" onClick={() => deleteTask.mutate(task.id)}>
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
