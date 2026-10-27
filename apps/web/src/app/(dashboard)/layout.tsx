import { Sidebar } from '@/components/layout/sidebar';
import { RealtimeSync } from '@/components/layout/realtime-sync';
import { DashboardAuthGuard } from '@/components/layout/dashboard-auth-guard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard>
    <div className="flex h-screen bg-background">
      <RealtimeSync />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">{children}</div>
    </div>
    </DashboardAuthGuard>
  );
}
