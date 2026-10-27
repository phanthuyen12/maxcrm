'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/topbar';
import { EngagementChart } from '@/components/overview/engagement-chart';
import { StaffPerformanceTable } from '@/components/overview/staff-performance-table';
import { PipelineSummaryChart } from '@/components/reports/pipeline-summary-chart';
import { ConversationStatusChart } from '@/components/reports/conversation-status-chart';
import { CustomerGrowthChart } from '@/components/reports/customer-growth-chart';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function ReportsPage() {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  useEffect(() => {
    if (!isLoading && user?.role === 'AGENT') router.replace('/overview');
  }, [isLoading, router, user?.role]);

  if (isLoading || !user || user.role === 'AGENT') return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Báo cáo" />
      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <EngagementChart />
          <PipelineSummaryChart />
          <CustomerGrowthChart />
          <ConversationStatusChart />
        </div>
        <StaffPerformanceTable />
      </div>
    </div>
  );
}
