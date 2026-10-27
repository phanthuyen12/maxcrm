'use client';

import * as React from 'react';
import { CheckSquare } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { TaskRow } from '@/components/tasks/task-row';
import { useTasks } from '@/hooks/use-tasks';
import { useUsers } from '@/hooks/use-users';

export default function TasksPage() {
  const [assigneeId, setAssigneeId] = React.useState('all');
  const [filter, setFilter] = React.useState<'all' | 'todo' | 'done' | 'overdue'>('all');
  const { data: users } = useUsers();

  const { data, isLoading, isError, refetch } = useTasks({
    assigneeId: assigneeId === 'all' ? undefined : assigneeId,
    status: filter === 'todo' ? 'TODO' : filter === 'done' ? 'DONE' : undefined,
    overdue: filter === 'overdue' ? 'true' : undefined,
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Công việc" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(['all', 'todo', 'overdue', 'done'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
              >
                {{ all: 'Tất cả', todo: 'Chưa hoàn thành', overdue: 'Quá hạn', done: 'Đã hoàn thành' }[f]}
              </Button>
            ))}
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Nhân viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhân viên</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CreateTaskDialog />
        </div>

        <div className="rounded-lg border bg-card">
          <StateView
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
            emptyIcon={<CheckSquare className="h-6 w-6" />}
            emptyTitle="Không có công việc"
            emptyDescription="Không có công việc nào khớp với bộ lọc hiện tại."
            loadingFallback={
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            }
          >
            {data?.map((task) => <TaskRow key={task.id} task={task} />)}
          </StateView>
        </div>
      </div>
    </div>
  );
}
