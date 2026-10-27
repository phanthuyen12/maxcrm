'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { useEngagement } from '@/hooks/use-reports';

export function EngagementChart() {
  const { data, isLoading, isError, refetch } = useEngagement(14);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Tương tác 14 ngày gần nhất</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <StateView
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
          emptyTitle="Chưa có dữ liệu"
          emptyDescription="Chưa có tin nhắn nào trong khoảng thời gian này."
          loadingFallback={<Skeleton className="h-64 w-full" />}
        >
          <div className="h-[280px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="inbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4386E8" stopOpacity={0.16} />
                  <stop offset="95%" stopColor="#0068FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2BA58A" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => v.slice(5)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 10, borderColor: 'hsl(var(--border))', fontSize: 12 }} labelFormatter={(label) => `Ngày ${label}`} />
              <Legend
                formatter={(value) => (value === 'inbound' ? 'Khách gửi' : 'Nhân viên gửi')}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Area type="linear" dataKey="inbound" stroke="#4386E8" fill="url(#inbound)" strokeWidth={2} />
              <Area type="linear" dataKey="outbound" stroke="#2BA58A" fill="url(#outbound)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </StateView>
      </CardContent>
    </Card>
  );
}
