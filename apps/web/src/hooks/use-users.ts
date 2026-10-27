'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { UserSummary } from '@/lib/types';

export function useUsers() {
  return useQuery<UserSummary[]>({
    queryKey: ['users'],
    queryFn: () => api.get<UserSummary[]>('/users'),
    staleTime: 60_000,
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; isAcceptingChats?: boolean; maxConcurrentChats?: number }) =>
      api.patch<UserSummary>(`/users/${id}/availability`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
