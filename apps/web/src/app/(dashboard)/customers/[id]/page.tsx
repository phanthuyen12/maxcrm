'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/topbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StateView } from '@/components/state/state-view';
import {
  useCustomer,
  useDeleteCustomer,
  useUpdateCustomer,
} from '@/hooks/use-customers';
import { useUsers } from '@/hooks/use-users';
import { formatCurrency, initials } from '@/lib/utils';
import { CustomerNotesPanel } from '@/components/customers/customer-notes-panel';
import { CustomerAppointmentsPanel } from '@/components/customers/customer-appointments-panel';
import { CustomerHistoryPanel } from '@/components/customers/customer-history-panel';
import { CustomerTagsPanel } from '@/components/customers/customer-tags-panel';

const STATUS_LABEL: Record<string, string> = { NEW: 'Mới', ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động' };

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: customer, isLoading, isError, refetch } = useCustomer(params.id);
  const { data: users } = useUsers();
  const updateCustomer = useUpdateCustomer(params.id);
  const deleteCustomer = useDeleteCustomer();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Hồ sơ khách hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => router.push('/customers')}>
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Button>

        <StateView
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          loadingFallback={<Skeleton className="h-64 w-full" />}
        >
          {customer && (
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-4 text-center">
                  <Avatar className="mx-auto h-16 w-16">
                    <AvatarFallback className="text-lg">{initials(customer.name)}</AvatarFallback>
                  </Avatar>
                  <h2 className="mt-2 text-lg font-semibold">{customer.name}</h2>
                  {customer.phone && (
                    <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {customer.phone}
                    </p>
                  )}
                  <div className="mt-3 flex flex-col gap-2 text-left">
                    <Field label="Trạng thái">
                      <Select
                        value={customer.status}
                        onValueChange={(v) => updateCustomer.mutate({ status: v as any })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Nguồn">
                      <Badge variant="secondary">{customer.source}</Badge>
                    </Field>
                    <Field label="Người phụ trách">
                      <Select
                        value={customer.assignedToId ?? 'unassigned'}
                        onValueChange={(v) =>
                          updateCustomer.mutate({ assignedToId: v === 'unassigned' ? undefined : v })
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Xóa khách hàng này? Hành động không thể hoàn tác.')) {
                        deleteCustomer.mutate(customer.id, {
                          onSuccess: () => {
                            toast.success('Đã xóa khách hàng');
                            router.push('/customers');
                          },
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Xóa khách hàng
                  </Button>
                </div>

                {customer.deals && customer.deals.length > 0 && (
                  <div className="rounded-lg border bg-card p-4">
                    <h3 className="mb-2 text-sm font-medium">Deal liên quan</h3>
                    <ul className="space-y-2">
                      {customer.deals.map((deal) => (
                        <li key={deal.id} className="flex items-center justify-between text-sm">
                          <span>{formatCurrency(deal.value)}</span>
                          <Badge variant="outline">{deal.stage}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-card p-4">
                <Tabs defaultValue="notes">
                  <TabsList>
                    <TabsTrigger value="notes">Ghi chú</TabsTrigger>
                    <TabsTrigger value="appointments">Lịch hẹn</TabsTrigger>
                    <TabsTrigger value="history">Lịch sử tương tác</TabsTrigger>
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
            </div>
          )}
        </StateView>
      </div>
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
