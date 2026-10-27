'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCurrentUser } from '@/hooks/use-current-user';

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isError, data } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && data?.role === 'CHAT' && window.location.pathname !== '/inbox') router.replace('/inbox');
  }, [data, isLoading, router]);

  useEffect(() => {
    if (!isLoading && (isError || !data)) router.replace('/login');
  }, [data, isError, isLoading, router]);

  useEffect(() => {
    if (!isLoading) return;
    const timeout = window.setTimeout(() => router.replace('/login'), 3000);
    return () => window.clearTimeout(timeout);
  }, [isLoading, router]);

  if (isLoading || isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7FAF8] px-6">
        <div className="flex flex-col items-center text-center">
          <Image src="/maxcrm-logo.png" alt="MAXCRM" width={2172} height={724} priority className="h-auto w-[148px] animate-pulse" />
          <span className="mt-7 h-8 w-8 animate-spin rounded-full border-[3px] border-[#DDEBE5] border-t-[#16846D]" />
          <p className="mt-4 text-sm font-medium text-[#315D50]">Đang kiểm tra phiên đăng nhập…</p>
        </div>
      </div>
    );
  }

  if (data.role === 'CHAT' && typeof window !== 'undefined' && window.location.pathname !== '/inbox') return null;

  return children;
}
