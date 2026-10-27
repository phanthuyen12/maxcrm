'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { useAddCustomerAppointment, useCustomerAppointments } from '@/hooks/use-customers';
import { formatDateTime } from '@/lib/utils';

export function CustomerAppointmentsPanel({ customerId }: { customerId: string }) {
  const { data: appointments, isLoading, isError, refetch } = useCustomerAppointments(customerId);
  const addAppointment = useAddCustomerAppointment(customerId);
  const [title, setTitle] = React.useState('');
  const [startAt, setStartAt] = React.useState('');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Tiêu đề lịch hẹn" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
        <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="w-56" />
        <Button
          disabled={!title.trim() || !startAt || addAppointment.isPending}
          onClick={() =>
            addAppointment.mutate(
              { title: title.trim(), startAt: new Date(startAt).toISOString() },
              {
                onSuccess: () => {
                  setTitle('');
                  setStartAt('');
                  toast.success('Đã tạo lịch hẹn');
                },
              },
            )
          }
        >
          Tạo lịch hẹn
        </Button>
      </div>
      <Separator />
      <StateView
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        isEmpty={!isLoading && !isError && (appointments?.length ?? 0) === 0}
        emptyTitle="Chưa có lịch hẹn"
        emptyDescription="Tạo lịch hẹn để nhắc lịch chăm sóc khách hàng."
        loadingFallback={<Skeleton className="h-16 w-full" />}
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {appointments?.map((appt) => (
            <li key={appt.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{appt.title}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(appt.startAt)}</p>
              <p className="text-xs text-muted-foreground">Phụ trách: {appt.staff.name}</p>
              <Badge
                variant={appt.status === 'DONE' ? 'success' : appt.status === 'CANCELED' ? 'destructive' : 'default'}
                className="mt-1"
              >
                {appt.status === 'SCHEDULED' ? 'Đã lên lịch' : appt.status === 'DONE' ? 'Hoàn tất' : 'Đã hủy'}
              </Badge>
            </li>
          ))}
        </ul>
      </StateView>
    </div>
  );
}
