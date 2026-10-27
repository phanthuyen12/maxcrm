'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { usePipelineSummary } from '@/hooks/use-reports';
import { formatCurrency } from '@/lib/utils';

const STAGE_LABEL: Record<string, string> = {
  NEW: 'Mới',
  CONSULTING: 'Đang tư vấn',
  POTENTIAL: 'Tiềm năng',
  WON: 'Chốt đơn',
  LOST: 'Không thành công',
};

export function PipelineSummaryChart() {
  const { data, isLoading, isError, refetch } = usePipelineSummary();
  const chartData = data?.map((d) => ({ ...d, label: STAGE_LABEL[d.stage] ?? d.stage }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Tổng giá trị theo giai đoạn pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <StateView
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
          emptyTitle="Chưa có dữ liệu pipeline"
          emptyDescription="Thêm deal ở trang Pipeline bán hàng để xem báo cáo."
          loadingFallback={<Skeleton className="h-64 w-full" />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v / 1_000_000}tr`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="totalValue" radius={[4, 4, 0, 0]} fill="#0068FF" />
            </BarChart>
          </ResponsiveContainer>
        </StateView>
      </CardContent>
    </Card>
  );
}
