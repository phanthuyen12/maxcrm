'use client';

import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { UserSummary } from '@/lib/types';

export function useCurrentUser() {
  return useQuery<UserSummary, ApiError>({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get<UserSummary>('/auth/me'),
    retry: false,
  });
}
