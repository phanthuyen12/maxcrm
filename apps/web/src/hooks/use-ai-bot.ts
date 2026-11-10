'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AiBotChannel, AiBotConfig, AiBotDocument, AiBotRule, AiProvider, OpenRouterModel } from '@/lib/types';

export interface AiBotDraft {
  name?: string;
  isEnabled: boolean;
  provider: AiProvider;
  apiKey: string;
  model: string;
  systemPrompt: string;
  rules?: AiBotRule[];
  knowledgeBase?: string;
  temperature?: number;
}

export function useAiBotChannels() {
  return useQuery<AiBotChannel[]>({
    queryKey: ['ai-bot', 'channels'],
    queryFn: () => api.get<AiBotChannel[]>('/ai-bot/channels'),
  });
}

export function useCreateAiBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ zaloOAId, ...draft }: AiBotDraft & { zaloOAId: string }) =>
      api.post<AiBotConfig>(`/ai-bot/${zaloOAId}/bots`, draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-bot', 'channels'] }),
  });
}

export function useUpdateAiBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ botId, ...draft }: AiBotDraft & { botId: string }) =>
      api.patch<AiBotConfig>(`/ai-bot/bots/${botId}`, draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-bot', 'channels'] }),
  });
}

export function useDeleteAiBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (botId: string) => api.delete<{ success: boolean; deleted: boolean }>(`/ai-bot/bots/${botId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-bot', 'channels'] }),
  });
}

export function useOpenRouterModels() {
  return useQuery<OpenRouterModel[]>({
    queryKey: ['ai-bot', 'openrouter-models'],
    queryFn: () => api.get<OpenRouterModel[]>('/ai-bot/models/openrouter'),
    staleTime: 10 * 60 * 1000,
  });
}

export interface TestChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function useTestAiBot() {
  return useMutation({
    mutationFn: (draft: AiBotDraft & { message: string; botId?: string; history?: TestChatTurn[] }) =>
      api.post<{ reply: string }>('/ai-bot/test', draft),
  });
}

export function useAiBotDocuments(botId: string) {
  return useQuery<AiBotDocument[]>({
    queryKey: ['ai-bot', 'documents', botId],
    queryFn: () => api.get<AiBotDocument[]>(`/ai-bot/bots/${botId}/documents`),
  });
}

export function useUploadAiBotDocument(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<AiBotDocument>(`/ai-bot/bots/${botId}/documents`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-bot', 'documents', botId] });
      queryClient.invalidateQueries({ queryKey: ['ai-bot', 'channels'] });
    },
  });
}

export function useDeleteAiBotDocument(botId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.delete(`/ai-bot/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-bot', 'documents', botId] });
      queryClient.invalidateQueries({ queryKey: ['ai-bot', 'channels'] });
    },
  });
}
