'use client';

import * as React from 'react';
import { AlertTriangle, Inbox as InboxIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StateViewProps {
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingFallback?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function StateView({
  isLoading,
  isError,
  errorMessage = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  isEmpty,
  onRetry,
  loadingFallback,
  emptyIcon,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription = 'Chưa có dữ liệu để hiển thị ở đây.',
  emptyAction,
  className,
  children,
}: StateViewProps) {
  if (isLoading) {
    return <>{loadingFallback ?? <DefaultLoading />}</>;
  }

  if (isError) {
    return (
      <div className={cn('flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center', className)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" /> Thử lại
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn('flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center', className)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {emptyIcon ?? <InboxIcon className="h-6 w-6" />}
        </div>
        <div>
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
        {emptyAction}
      </div>
    );
  }

  return <>{children}</>;
}

function DefaultLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
