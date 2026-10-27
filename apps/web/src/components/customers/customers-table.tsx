'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StateView } from '@/components/state/state-view';
import { Customer } from '@/lib/types';
import { formatDateTime, initials } from '@/lib/utils';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'warning' | 'success' }> = {
  NEW: { label: 'Mới', variant: 'default' },
  ACTIVE: { label: 'Đang hoạt động', variant: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', variant: 'warning' },
};

const columns: ColumnDef<Customer>[] = [
  {
    header: 'Khách hàng',
    accessorKey: 'name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{initials(row.original.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.phone ?? '—'}</p>
        </div>
      </div>
    ),
  },
  {
    header: 'Nguồn',
    accessorKey: 'source',
  },
  {
    header: 'Nhãn',
    id: 'tags',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tags.slice(0, 2).map(({ tag }) => (
          <Badge key={tag.id} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
            {tag.name}
          </Badge>
        ))}
        {row.original.tags.length > 2 && (
          <Badge variant="outline">+{row.original.tags.length - 2}</Badge>
        )}
      </div>
    ),
  },
  {
    header: 'Người phụ trách',
    id: 'assignedTo',
    cell: ({ row }) =>
      row.original.assignedTo ? row.original.assignedTo.name : <span className="text-muted-foreground">Chưa phân công</span>,
  },
  {
    header: 'Trạng thái',
    accessorKey: 'status',
    cell: ({ row }) => {
      const meta = STATUS_LABEL[row.original.status];
      return <Badge variant={meta.variant}>{meta.label}</Badge>;
    },
  },
  {
    header: 'Ngày tạo',
    accessorKey: 'createdAt',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
  },
];

export function CustomersTable({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: Customer[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const router = useRouter();
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <StateView
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      isEmpty={!isLoading && !isError && data.length === 0}
      emptyIcon={<Users className="h-6 w-6" />}
      emptyTitle="Không tìm thấy khách hàng"
      emptyDescription="Thử điều chỉnh bộ lọc hoặc thêm khách hàng mới."
      loadingFallback={<TableSkeleton />}
    >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => router.push(`/customers/${row.original.id}`)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </StateView>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
