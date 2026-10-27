'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Conversation, Message } from '@/lib/types';

export interface ConversationFilters {
  search?: string;
  status?: string;
  assignedToId?: string;
  zaloOAId?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: unknown;
}

function toQueryString(filters: ConversationFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useConversations(filters: ConversationFilters = {}) {
  return useQuery<Conversation[]>({
    queryKey: ['conversations', filters],
    queryFn: () => api.get<Conversation[]>(`/conversations${toQueryString(filters)}`),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useAllConversationsForBadge() {
  return useQuery<{ count: number }>({
    queryKey: ['conversations', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/conversations/unread-count'),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  const { data } = useAllConversationsForBadge();
  return data?.count ?? 0;
}

export function useConversation(id: string | null) {
  return useQuery<Conversation>({
    queryKey: ['conversation', id],
    queryFn: () => api.get<Conversation>(`/conversations/${id}`),
    enabled: !!id,
  });
}

export function useConversationMessages(id: string | null) {
  return useQuery<Message[]>({
    queryKey: ['conversation', id, 'messages'],
    queryFn: () => api.get<Message[]>(`/conversations/${id}/messages`),
    enabled: !!id,
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { content: string; type?: string; attachmentUrl?: string }) =>
      api.post<Message>(`/conversations/${conversationId}/messages`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversation(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { status?: string; assignedToId?: string }) =>
      api.patch<Conversation>(`/conversations/${conversationId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });
}

export function usePinConversation(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinned: boolean) => api.patch<{ id: string; isPinned: boolean }>(`/conversations/${conversationId}/pin`, { pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });
}

export function useSimulateIncoming() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      api.post('/zalo-mock/simulate-incoming', { conversationId }),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId, 'messages'] });
    },
  });
}
