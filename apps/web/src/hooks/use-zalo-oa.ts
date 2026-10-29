'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ZaloOA } from '@/lib/types';

export function useZaloOAs() {
  return useQuery<ZaloOA[]>({
    queryKey: ['zalo-oa'],
    queryFn: () => api.get<ZaloOA[]>('/zalo-oa'),
  });
}

export function useReconnectOA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ success: boolean; message: string }>(`/zalo-oa/${id}/reconnect`),
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['zalo-oa'] }), 1200);
      queryClient.invalidateQueries({ queryKey: ['zalo-oa'] });
    },
  });
}

export function useDeleteOA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/zalo-oa/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zalo-oa'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateOA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; dailyMessageLimit?: number }) =>
      api.patch<ZaloOA>(`/zalo-oa/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zalo-oa'] });
    },
  });
}

export function useUpdateStaffAccess(oaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, canSend }: { userId: string; canSend: boolean }) =>
      api.put(`/zalo-oa/${oaId}/staff-access/${userId}`, { canSend }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zalo-oa'] }),
  });
}

export function useRemoveStaffAccess(oaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/zalo-oa/${oaId}/staff-access/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zalo-oa'] }),
  });
}

export function useRotateWebhookSecret() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (oaId: string) => api.post<ZaloOA>(`/zalo-oa/${oaId}/rotate-webhook-secret`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zalo-oa'] }),
  });
}

export function useTestWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (oaId: string) =>
      api.post<{ success: boolean; conversationId: string }>(`/zalo-oa/${oaId}/webhook-test`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zalo-oa'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useSimulateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (oaId: string) =>
      api.post<{ conversationId: string; customerName: string; isNewConversation: boolean; assignedToName: string | null }>(
        '/zalo-mock/simulate-webhook',
        { oaId },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
