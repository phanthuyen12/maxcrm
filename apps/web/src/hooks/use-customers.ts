'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ActivityLogItem, Appointment, Customer, Note } from '@/lib/types';

export interface CustomerFilters {
  search?: string;
  tagId?: string;
  assignedToId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

export interface CustomerListResult {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

function toQueryString(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery<CustomerListResult>({
    queryKey: ['customers', filters],
    queryFn: () => api.get<CustomerListResult>(`/customers${toQueryString(filters)}`),
  });
}

export function useCustomer(id: string | null) {
  return useQuery<Customer>({
    queryKey: ['customer', id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Customer>) => api.post<Customer>('/customers', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Customer>) => api.patch<Customer>(`/customers/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useCheckDuplicate(phone?: string, zaloUserId?: string) {
  return useQuery<{ duplicates: Customer[] }>({
    queryKey: ['customers', 'check-duplicate', phone, zaloUserId],
    queryFn: () =>
      api.get(`/customers/check-duplicate${toQueryString({ phone, zaloUserId })}`),
    enabled: !!(phone || zaloUserId),
  });
}

export function useAddCustomerTag(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => api.post(`/customers/${customerId}/tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useRemoveCustomerTag(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => api.delete(`/customers/${customerId}/tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCustomerNotes(customerId: string | null) {
  return useQuery<Note[]>({
    queryKey: ['customer', customerId, 'notes'],
    queryFn: () => api.get<Note[]>(`/customers/${customerId}/notes`),
    enabled: !!customerId,
  });
}

export function useAddCustomerNote(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.post<Note>(`/customers/${customerId}/notes`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId, 'notes'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId, 'activity'] });
    },
  });
}

export function useCustomerAppointments(customerId: string | null) {
  return useQuery<Appointment[]>({
    queryKey: ['customer', customerId, 'appointments'],
    queryFn: () => api.get<Appointment[]>(`/customers/${customerId}/appointments`),
    enabled: !!customerId,
  });
}

export function useAddCustomerAppointment(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; startAt: string }) =>
      api.post<Appointment>(`/customers/${customerId}/appointments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId, 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId, 'activity'] });
    },
  });
}

export function useCustomerActivity(customerId: string | null) {
  return useQuery<ActivityLogItem[]>({
    queryKey: ['customer', customerId, 'activity'],
    queryFn: () => api.get<ActivityLogItem[]>(`/customers/${customerId}/activity`),
    enabled: !!customerId,
  });
}
