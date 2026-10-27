'use client';

import { Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { useStaffPerformance } from '@/hooks/use-reports';
import { initials } from '@/lib/utils';

export function StaffPerformanceTable() {
  const { data, isLoading, isError, refetch } = useStaffPerformance();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Hiệu suất nhân viên</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <StateView
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
          emptyIcon={<Users className="h-6 w-6" />}
          emptyTitle="Chưa có dữ liệu nhân viên"
          emptyDescription="Dữ liệu sẽ hiển thị khi có hoạt động chăm sóc khách hàng."
          loadingFallback={<Skeleton className="h-48 w-full" />}
        >
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                  <TableHead className="whitespace-nowrap">Hội thoại đã xử lý</TableHead>
                  <TableHead className="whitespace-nowrap">Deal chốt thành công</TableHead>
                  <TableHead className="whitespace-nowrap">Công việc đang chờ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-[10px]">{initials(staff.name)}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-32 truncate font-medium" title={staff.name}>{staff.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{staff.resolvedConversations}</TableCell>
                  <TableCell>
                    <span className="tabular-nums">{staff.wonDeals}/{staff.totalDeals}</span>
                  </TableCell>
                  <TableCell className="tabular-nums">{staff.pendingTasks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StateView>
      </CardContent>
    </Card>
  );
}
