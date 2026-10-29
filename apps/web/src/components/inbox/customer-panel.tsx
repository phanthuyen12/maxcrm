'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Phone, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConversation, useUpdateConversation } from '@/hooks/use-conversations';
import { useCustomer } from '@/hooks/use-customers';
import { useUsers } from '@/hooks/use-users';
import { useCurrentUser } from '@/hooks/use-current-user';
import { api } from '@/lib/api';
import { initials } from '@/lib/utils';
import { CustomerTagsPanel } from '@/components/customers/customer-tags-panel';
import { CustomerNotesPanel } from '@/components/customers/customer-notes-panel';
import { CustomerAppointmentsPanel } from '@/components/customers/customer-appointments-panel';
import { CustomerHistoryPanel } from '@/components/customers/customer-history-panel';

export function CustomerPanel({ conversationId }: { conversationId: string | null }) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: conversation } = useConversation(conversationId);
  const customerId = conversation?.customer.id ?? null;
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: users } = useUsers();
  const updateConversation = useUpdateConversation(conversationId ?? '');
  const isAdmin = currentUser?.role === 'ADMIN';
  const groupAssignedUsers = conversation?.groupAssignedUsers ?? [];
  const availableGroupSales = (users ?? []).filter(
    (u) => u.role !== 'ADMIN' && !groupAssignedUsers.some((a) => a.id === u.id),
  );

  const handleAssignGroupSale = async (userId: string) => {
    if (!conversation?.personalAccountId || !conversation?.personalGroupId) return;
    try {
      await api.put(
        `/zalo-personal/accounts/${conversation.personalAccountId}/groups/${encodeURIComponent(conversation.personalGroupId)}/access/${encodeURIComponent(userId)}`,
        { groupName: customer?.name },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      ]);
      toast.success('Đã phân quyền xem nhóm cho sale');
    } catch {
      toast.error('Không thể phân quyền nhóm');
    }
  };

  const handleRemoveGroupSale = async (userId: string) => {
    if (!conversation?.personalAccountId || !conversation?.personalGroupId) return;
    try {
      await api.delete(
        `/zalo-personal/accounts/${conversation.personalAccountId}/groups/${encodeURIComponent(conversation.personalGroupId)}/access/${encodeURIComponent(userId)}`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      ]);
      toast.success('Đã gỡ quyền xem nhóm của sale');
    } catch {
      toast.error('Không thể gỡ quyền nhóm');
    }
  };

  if (!conversationId) {
    return <div className="min-h-0 w-full border-l bg-card" />;
  }

  return (
    <div className="scrollbar-thin flex min-h-0 w-full flex-1 flex-col overflow-y-auto border-l bg-card">
      {isLoading || !customer ? (
        <div className="space-y-3 p-4">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 border-b p-4 text-left">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="text-lg">{initials(customer.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link href={`/customers/${customer.id}`} className="block truncate text-[15px] font-semibold hover:underline" title={customer.name}>{customer.name}</Link>
              {customer.phone && <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /> {customer.phone}</p>}
              <Badge variant="secondary" className="mt-1 h-5 max-w-full truncate px-2 text-[10px]">{customer.source}</Badge>
            </div>
          </div>

          <div className="space-y-3 border-b p-4">
            <Field label="Người phụ trách">
              <Select
                value={conversation?.assignedTo?.id ?? 'unassigned'}
                onValueChange={(value) =>
                  updateConversation.mutate({ assignedToId: value === 'unassigned' ? undefined : value })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Chưa phân công</SelectItem>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {isAdmin && conversation?.isGroup && conversation?.personalAccountId && conversation?.personalGroupId && (
              <Field label="Sale được thấy nhóm này">
                <div className="space-y-2 rounded-lg border bg-muted/20 p-2.5 text-xs">
                  {groupAssignedUsers.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      Chưa phân riêng — tất cả sale trong tài khoản Zalo này đều thấy.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {groupAssignedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                        >
                          {u.name}
                          <button
                            type="button"
                            className="hover:text-destructive"
                            title={`Gỡ ${u.name}`}
                            onClick={() => void handleRemoveGroupSale(u.id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {availableGroupSales.length > 0 && (
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) void handleAssignGroupSale(e.target.value);
                      }}
                    >
                      <option value="">+ Chỉ định sale được xem nhóm</option>
                      {availableGroupSales.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </Field>
            )}

            <Field label="Nhãn">
              <CustomerTagsPanel customerId={customer.id} tags={customer.tags} />
            </Field>
          </div>

          <div className="p-3">
            <Tabs defaultValue="notes" className="flex min-h-0 flex-col">
              <TabsList className="grid h-10 w-full shrink-0 grid-cols-3">
                <TabsTrigger value="notes">Ghi chú</TabsTrigger>
                <TabsTrigger value="appointments">Lịch hẹn</TabsTrigger>
                <TabsTrigger value="history">Lịch sử</TabsTrigger>
              </TabsList>
              <TabsContent value="notes">
                <CustomerNotesPanel customerId={customer.id} />
              </TabsContent>
              <TabsContent value="appointments">
                <CustomerAppointmentsPanel customerId={customer.id} />
              </TabsContent>
              <TabsContent value="history">
                <CustomerHistoryPanel customerId={customer.id} />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
