'use client';

import * as React from 'react';
import Link from 'next/link';
import { Phone } from 'lucide-react';
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
import { initials } from '@/lib/utils';
import { CustomerTagsPanel } from '@/components/customers/customer-tags-panel';
import { CustomerNotesPanel } from '@/components/customers/customer-notes-panel';
import { CustomerAppointmentsPanel } from '@/components/customers/customer-appointments-panel';
import { CustomerHistoryPanel } from '@/components/customers/customer-history-panel';

export function CustomerPanel({ conversationId }: { conversationId: string | null }) {
  const { data: conversation } = useConversation(conversationId);
  const customerId = conversation?.customer.id ?? null;
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: users } = useUsers();
  const updateConversation = useUpdateConversation(conversationId ?? '');

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
