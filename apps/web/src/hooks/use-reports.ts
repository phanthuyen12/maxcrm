'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EngagementPoint, OverviewStats, StaffPerformance } from '@/lib/types';

export function useOverviewStats() {
  return useQuery<OverviewStats>({
    queryKey: ['reports', 'overview'],
    queryFn: () => api.get<OverviewStats>('/reports/overview'),
    refetchInterval: 60_000,
  });
}

export interface ConversationOverview {
  periods: { week: number; month: number; year: number };
  channels: Array<{ id: string; name: string; provider: string; kind: string; week: number; month: number; year: number }>;
}

export function useConversationOverview() {
  return useQuery<ConversationOverview>({
    queryKey: ['reports', 'conversation-overview'],
    queryFn: () => api.get<ConversationOverview>('/reports/conversation-overview'),
    refetchInterval: 60_000,
  });
}

export function useEngagement(days = 14) {
  return useQuery<EngagementPoint[]>({
    queryKey: ['reports', 'engagement', days],
    queryFn: () => api.get<EngagementPoint[]>(`/reports/engagement?days=${days}`),
  });
}

export function useStaffPerformance() {
  return useQuery<StaffPerformance[]>({
    queryKey: ['reports', 'staff-performance'],
    queryFn: () => api.get<StaffPerformance[]>('/reports/staff-performance'),
  });
}

export function usePipelineSummary() {
  return useQuery<{ stage: string; count: number; totalValue: number }[]>({
    queryKey: ['reports', 'pipeline-summary'],
    queryFn: () => api.get('/reports/pipeline-summary'),
  });
}

export function useConversationStatus() {
  return useQuery<{ status: string; count: number }[]>({
    queryKey: ['reports', 'conversation-status'],
    queryFn: () => api.get('/reports/conversation-status'),
  });
}

export function useCustomerGrowth(days = 14) {
  return useQuery<{ date: string; count: number }[]>({
    queryKey: ['reports', 'customer-growth', days],
    queryFn: () => api.get(`/reports/customer-growth?days=${days}`),
  });
}
