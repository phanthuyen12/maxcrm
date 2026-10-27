'use client';

import * as React from 'react';
import { Download, Search } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomersTable } from '@/components/customers/customers-table';
import { CreateCustomerDialog } from '@/components/customers/create-customer-dialog';
import { ImportCustomersDialog } from '@/components/customers/import-customers-dialog';
import { useCustomers } from '@/hooks/use-customers';
import { useTags } from '@/hooks/use-tags';
import { useUsers } from '@/hooks/use-users';
import { useCurrentUser } from '@/hooks/use-current-user';

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const [search, setSearch] = React.useState('');
  const [tagId, setTagId] = React.useState('all');
  const [assignedToId, setAssignedToId] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [page, setPage] = React.useState(1);

  const { data: tags } = useTags();
  const { data: users } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const canViewTeamCustomers = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const { data, isLoading, isError, refetch } = useCustomers({
    search: search || undefined,
    tagId: tagId === 'all' ? undefined : tagId,
    assignedToId: assignedToId === 'all' ? undefined : assignedToId,
    status: status === 'all' ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Khách hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc SĐT..."
                className="w-56 pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select value={tagId} onValueChange={(v) => { setTagId(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="Nhãn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhãn</SelectItem>
                {tags?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canViewTeamCustomers && <Select value={assignedToId} onValueChange={(v) => { setAssignedToId(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-40 text-sm">
                <SelectValue placeholder="Người phụ trách" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhân viên</SelectItem>
                <SelectItem value="unassigned">Chưa phân công</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>}
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="NEW">Mới</SelectItem>
                <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/api/customers/export" download>
                <Download className="h-4 w-4" /> Export
              </a>
            </Button>
            <ImportCustomersDialog />
            <CreateCustomerDialog />
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <CustomersTable
            data={data?.items ?? []}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        </div>

        {data && data.total > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Hiển thị {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, data.total)} / {data.total} khách hàng
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trước
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
