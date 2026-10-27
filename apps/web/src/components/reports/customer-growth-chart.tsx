'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { useCustomerGrowth } from '@/hooks/use-reports';

export function CustomerGrowthChart() {
  const { data, isLoading, isError, refetch } = useCustomerGrowth(14);
  return <Card>
    <CardHeader><CardTitle className="text-foreground">Khách hàng mới · 14 ngày</CardTitle></CardHeader>
    <CardContent>
      <StateView isLoading={isLoading} isError={isError} onRetry={refetch} isEmpty={!isLoading && !isError && !(data?.length)} emptyTitle="Chưa có dữ liệu" emptyDescription="Khách hàng mới sẽ được thống kê theo ngày." loadingFallback={<Skeleton className="h-64 w-full" />}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data}>
            <defs><linearGradient id="customerGrowth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
            <Tooltip labelFormatter={(value) => `Ngày ${value}`} />
            <Area type="monotone" dataKey="count" name="Khách mới" stroke="#8b5cf6" fill="url(#customerGrowth)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </StateView>
    </CardContent>
  </Card>;
}
