'use client';

import { AlertCircle, Clock, MessageSquareWarning, UserPlus, UsersRound, MessagesSquare } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { StatCard } from '@/components/overview/stat-card';
import { EngagementChart } from '@/components/overview/engagement-chart';
import { StaffPerformanceTable } from '@/components/overview/staff-performance-table';
import { useOverviewStats } from '@/hooks/use-reports';
import { LayoutDashboard } from 'lucide-react';
import { ConversationOverview } from '@/components/overview/conversation-overview';
import { useCurrentUser } from '@/hooks/use-current-user';
import { CustomerGrowthChart } from '@/components/reports/customer-growth-chart';
import { PipelineSummaryChart } from '@/components/reports/pipeline-summary-chart';

export default function OverviewPage() {
  const { data, isLoading } = useOverviewStats();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  if (userLoading || !user) {
    return <div className="flex flex-1 flex-col overflow-hidden"><Topbar title="Tổng quan" /><main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Đang tải bảng điều khiển…</main></div>;
  }

  if (user.role === 'AGENT') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title="Tổng quan" />
        <main className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-accent text-accent-foreground"><LayoutDashboard className="h-5 w-5" /></span>
            <div><h1 className="text-[26px] font-semibold leading-tight tracking-tight">Không gian của tôi</h1><p className="mt-1 text-sm text-muted-foreground">Tổng quan công việc được phân công cho bạn</p></div>
          </div>
          <div className="max-w-sm overflow-hidden rounded-2xl border bg-card shadow-sm">
            <StatCard label="Hội thoại cần xử lý của tôi" value={data?.myOpenConversations ?? 0} icon={MessageSquareWarning} isLoading={isLoading} tone="warning" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Tổng quan" />
      <main className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-accent text-accent-foreground"><LayoutDashboard className="h-5 w-5" /></span>
          <div><h1 className="text-[26px] font-semibold leading-tight tracking-tight">Bảng điều khiển</h1><p className="mt-1 text-sm text-muted-foreground">Tổng quan khách hàng, hội thoại và hiệu suất chăm sóc</p></div>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border xl:grid-cols-4">
          <StatCard
            label="Khách mới hôm nay"
            value={data?.newCustomersToday ?? 0}
            icon={UserPlus}
            isLoading={isLoading}
          />
          <StatCard
            label="Hội thoại chưa xử lý"
            value={data?.unresolvedConversations ?? 0}
            icon={MessageSquareWarning}
            isLoading={isLoading}
            tone="warning"
          />
          <StatCard
            label="Thời gian phản hồi TB"
            value={`${data?.avgResponseMinutes ?? 0} phút`}
            icon={Clock}
            isLoading={isLoading}
          />
          <StatCard
            label="Công việc quá hạn"
            value={data?.overdueTasks ?? 0}
            icon={AlertCircle}
            isLoading={isLoading}
            tone="destructive"
          />
          <StatCard
            label="Khách mới tuần này"
            value={data?.newCustomersWeek ?? 0}
            icon={UsersRound}
            isLoading={isLoading}
          />
          <StatCard
            label="Tin nhắn hôm nay"
            value={data?.messagesToday ?? 0}
            icon={MessagesSquare}
            isLoading={isLoading}
          />
          <StatCard
            label="Facebook Page phân công"
            value={data?.assignedPages ?? 0}
            icon={UsersRound}
            isLoading={isLoading}
          />
        </div>

        <ConversationOverview />

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          <EngagementChart />
          <StaffPerformanceTable />
        </div>
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <CustomerGrowthChart />
          <PipelineSummaryChart />
        </div>
      </main>
    </div>
  );
}
