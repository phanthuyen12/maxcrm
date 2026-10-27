'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageTemplate } from '@/lib/types';

export function useTemplates() {
  return useQuery<MessageTemplate[]>({
    queryKey: ['templates'],
    queryFn: () => api.get<MessageTemplate[]>('/templates'),
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; content: string; category?: string }) =>
      api.post<MessageTemplate>('/templates', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });
}
