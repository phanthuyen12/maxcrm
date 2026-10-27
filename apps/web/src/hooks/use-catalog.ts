'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CustomerSource, TemplateCategory } from '@/lib/types';

export function useSources() {
  return useQuery<CustomerSource[]>({
    queryKey: ['catalog', 'sources'],
    queryFn: () => api.get<CustomerSource[]>('/catalog/sources'),
    staleTime: 60_000,
  });
}

export function useCreateSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<CustomerSource>('/catalog/sources', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'sources'] }),
  });
}

export function useUpdateSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<CustomerSource>(`/catalog/sources/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'sources'] }),
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/sources/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'sources'] }),
  });
}

export function useTemplateCategories() {
  return useQuery<TemplateCategory[]>({
    queryKey: ['catalog', 'template-categories'],
    queryFn: () => api.get<TemplateCategory[]>('/catalog/template-categories'),
    staleTime: 60_000,
  });
}

export function useCreateTemplateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<TemplateCategory>('/catalog/template-categories', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'template-categories'] }),
  });
}

export function useUpdateTemplateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<TemplateCategory>(`/catalog/template-categories/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'template-categories'] }),
  });
}

export function useDeleteTemplateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/template-categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'template-categories'] }),
  });
}
