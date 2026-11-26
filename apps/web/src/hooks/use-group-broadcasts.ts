'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type BroadcastRepeat = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type BroadcastStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'CANCELED';

export type BroadcastRunResult = { groupId: string; groupName: string; status: 'pending' | 'sent' | 'failed'; error?: string; sentAt?: string };

export type BroadcastRun = {
  id: string;
  status: string;
  total: number;
  sent: number;
  failed: number;
  startedAt: string;
  finishedAt: string | null;
  results: BroadcastRunResult[];
};

export type BroadcastImage = { url: string; name: string };

export type GroupBroadcast = {
  id: string;
  name: string;
  accountId: string;
  account: { id: string; name: string; status: string };
  contentHtml: string;
  contentText: string;
  repeat: BroadcastRepeat;
  repeatDays: number[];
  scheduledAt: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  status: BroadcastStatus;
  intervalMs: number;
  createdBy: { id: string; name: string; avatar: string | null } | null;
  createdAt: string;
  targets: Array<{ groupId: string; groupName: string }>;
  images: BroadcastImage[];
  latestRun: BroadcastRun | null;
};

export type ZaloGroupSummary = { id: string; name: string; avatar: string; memberCount: number };

export type BroadcastPayload = {
  accountId: string;
  name: string;
  contentHtml: string;
  targets: Array<{ groupId: string; groupName: string }>;
  images: BroadcastImage[];
  scheduledAt: string;
  repeat: BroadcastRepeat;
  repeatDays?: number[];
  intervalMs?: number;
};

const KEY = ['group-broadcasts'];

export function useGroupBroadcasts() {
  return useQuery<GroupBroadcast[]>({
    queryKey: KEY,
    queryFn: () => api.get<GroupBroadcast[]>('/group-broadcasts'),
    refetchInterval: 20000,
  });
}

/** Tải nhóm từ Zalo — gọi thẳng sang máy Zalo nên cho hạn chờ rộng. */
export function useZaloGroups(accountId: string) {
  return useQuery<ZaloGroupSummary[]>({
    queryKey: ['group-broadcasts', 'groups', accountId],
    queryFn: () => api.get<ZaloGroupSummary[]>(`/group-broadcasts/accounts/${accountId}/groups`, api.slow(120000)),
    enabled: Boolean(accountId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Tải ảnh gửi kèm lên trước khi lưu lịch. */
export function useUploadBroadcastImages() {
  return useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      for (const file of files) form.append('files', file);
      return api.post<Array<BroadcastImage & { size: number }>>('/group-broadcasts/images', form, api.slow(120000));
    },
  });
}

export function useSaveGroupBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: BroadcastPayload & { id?: string }) =>
      id
        ? api.put<GroupBroadcast>(`/group-broadcasts/${id}`, payload, api.slow(20000))
        : api.post<GroupBroadcast>('/group-broadcasts', payload, api.slow(20000)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useBroadcastAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' | 'cancel' | 'run-now' }) =>
      api.post(`/group-broadcasts/${id}/${action}`, undefined, api.slow(15000)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteGroupBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/group-broadcasts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
