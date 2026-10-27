'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { useConversationStatus } from '@/hooks/use-reports';

const LABELS: Record<string, string> = { UNREAD: 'Chưa đọc', PROCESSING: 'Đang xử lý', RESOLVED: 'Đã hoàn tất' };
const COLORS: Record<string, string> = { UNREAD: '#ef4444', PROCESSING: '#0068ff', RESOLVED: '#16a34a' };

export function ConversationStatusChart() {
  const { data, isLoading, isError, refetch } = useConversationStatus();
  const chartData = data?.map((item) => ({ ...item, label: LABELS[item.status] ?? item.status }));
  return <Card>
    <CardHeader><CardTitle className="text-foreground">Trạng thái hội thoại</CardTitle></CardHeader>
    <CardContent>
      <StateView isLoading={isLoading} isError={isError} onRetry={refetch} isEmpty={!isLoading && !isError && !(data?.length)} emptyTitle="Chưa có hội thoại" emptyDescription="Số lượng hội thoại theo trạng thái sẽ hiển thị tại đây." loadingFallback={<Skeleton className="h-64 w-full" />}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={chartData} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={62} outerRadius={96} paddingAngle={3}>
              {chartData?.map((entry) => <Cell key={entry.status} fill={COLORS[entry.status] ?? '#94a3b8'} />)}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [value, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
          {chartData?.map((item) => <span key={item.status} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[item.status] ?? '#94a3b8' }} />{item.label}: {item.count}</span>)}
        </div>
      </StateView>
    </CardContent>
  </Card>;
}
