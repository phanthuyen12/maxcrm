import { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  isLoading,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  isLoading?: boolean;
  tone?: 'default' | 'warning' | 'destructive' | 'success';
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    success: 'bg-success/10 text-success',
  }[tone];

  return (
    <div className="flex min-h-[98px] items-center gap-3.5 bg-card p-4 md:p-5">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/10', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-muted-foreground">{label}</p>
          {isLoading ? <Skeleton className="mt-1 h-7 w-16" /> : <p className="mt-1 text-[25px] font-semibold leading-7 tabular-nums tracking-tight">{value}</p>}
        </div>
    </div>
  );
}
