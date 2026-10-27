'use client';

import * as React from 'react';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StateView } from '@/components/state/state-view';
import { useUpdateAvailability, useUsers } from '@/hooks/use-users';
import { initials } from '@/lib/utils';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  AGENT: 'Nhân viên',
};

export function StaffRosterTable() {
  const { data: users, isLoading, isError, refetch } = useUsers();
  const updateAvailability = useUpdateAvailability();
  const [draftLimit, setDraftLimit] = React.useState<Record<string, string>>({});

  const commitLimit = (userId: string, value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return;
    updateAvailability.mutate({ id: userId, maxConcurrentChats: n });
  };

  return (
    <StateView
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
      isEmpty={!isLoading && !isError && (users?.length ?? 0) === 0}
      emptyIcon={<Users className="h-6 w-6" />}
      emptyTitle="Chưa có nhân viên"
      emptyDescription="Chưa có nhân viên nào trong hệ thống."
      loadingFallback={<Skeleton className="h-64 w-full" />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nhân viên</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Đang nhận chat</TableHead>
            <TableHead>Giới hạn đồng thời</TableHead>
            <TableHead>Đang xử lý</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((u) => {
            const active = u.activeConversationCount ?? 0;
            const limit = u.maxConcurrentChats ?? 0;
            const nearFull = limit > 0 && active / limit >= 0.8;
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={u.isAcceptingChats ?? true}
                    onCheckedChange={(checked) =>
                      updateAvailability.mutate({ id: u.id, isAcceptingChats: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    className="h-8 w-20"
                    value={draftLimit[u.id] ?? String(u.maxConcurrentChats ?? '')}
                    onChange={(e) => setDraftLimit((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    onBlur={(e) => commitLimit(u.id, e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={nearFull ? 'warning' : 'outline'}>
                    {active}/{limit}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </StateView>
  );
}
