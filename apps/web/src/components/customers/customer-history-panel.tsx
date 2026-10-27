'use client';

import { User as UserIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { useCustomerActivity } from '@/hooks/use-customers';
import { formatRelativeTime } from '@/lib/utils';

export function CustomerHistoryPanel({ customerId }: { customerId: string }) {
  const { data: activity, isLoading, isError, refetch } = useCustomerActivity(customerId);

  return (
    <StateView
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
      isEmpty={!isLoading && !isError && (activity?.length ?? 0) === 0}
      emptyIcon={<UserIcon className="h-6 w-6" />}
      emptyTitle="Chưa có lịch sử"
      emptyDescription="Lịch sử chăm sóc khách hàng sẽ hiện ở đây."
      loadingFallback={<Skeleton className="h-16 w-full" />}
    >
      <ul className="space-y-4 border-l pl-4">
        {activity?.map((item) => (
          <li key={item.id} className="relative text-sm">
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
            <p>{item.content}</p>
            <p className="text-xs text-muted-foreground">
              {item.actor?.name ?? 'Hệ thống'} · {formatRelativeTime(item.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </StateView>
  );
}
