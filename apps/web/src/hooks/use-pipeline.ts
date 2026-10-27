'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Deal } from '@/lib/types';

export function useDeals() {
  return useQuery<Deal[]>({
    queryKey: ['deals'],
    queryFn: () => api.get<Deal[]>('/pipeline/deals'),
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { customerId: string; value: number; stage?: string; note?: string }) =>
      api.post<Deal>('/pipeline/deals', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      api.patch<Deal>(`/pipeline/deals/${id}/stage`, { stage }),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      const previous = queryClient.getQueryData<Deal[]>(['deals']);
      queryClient.setQueryData<Deal[]>(['deals'], (old) =>
        old?.map((d) => (d.id === id ? { ...d, stage: stage as Deal['stage'] } : d)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['deals'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}
