'use client';

import * as React from 'react';
import { Copy, Eye, EyeOff, Loader2, PlugZap, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  useDeleteOA,
  useReconnectOA,
  useRemoveStaffAccess,
  useRotateWebhookSecret,
  useSimulateWebhook,
  useTestWebhook,
  useUpdateStaffAccess,
} from '@/hooks/use-zalo-oa';
import { useUsers } from '@/hooks/use-users';
import { ZaloOA } from '@/lib/types';
import { cn, formatRelativeTime, initials } from '@/lib/utils';

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  CONNECTED: { label: 'Đã kết nối', variant: 'success' },
  DISCONNECTED: { label: 'Đang kết nối lại...', variant: 'warning' },
  EXPIRED: { label: 'Hết hạn, cần kết nối lại', variant: 'destructive' },
};

export function OaCard({ oa }: { oa: ZaloOA }) {
  const reconnect = useReconnectOA();
  const deleteOA = useDeleteOA();
  const updateAccess = useUpdateStaffAccess(oa.id);
  const removeAccess = useRemoveStaffAccess(oa.id);
  const rotateSecret = useRotateWebhookSecret();
  const testWebhook = useTestWebhook();
  const simulateWebhook = useSimulateWebhook();
  const { data: allUsers } = useUsers();

  const [showSecret, setShowSecret] = React.useState(false);

  const statusMeta = STATUS_META[oa.status];
  const usagePercent = Math.min(100, Math.round((oa.messagesSentToday / oa.dailyMessageLimit) * 100));
  const existingIds = new Set(oa.staffAccess.map((a) => a.user.id));
  const availableUsers = allUsers?.filter((u) => !existingIds.has(u.id)) ?? [];

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(oa.webhookUrl);
      toast.success('Đã copy webhook URL');
    } catch {
      toast.error('Không thể copy, vui lòng copy thủ công');
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials(oa.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{oa.name}</p>
            <p className="text-xs text-muted-foreground">ID: {oa.zaloOaId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={deleteOA.isPending}
            onClick={() => {
              if (!window.confirm(`Xóa tài khoản Zalo OA "${oa.name}" (${oa.zaloOaId}) và các hội thoại liên quan?`)) return;
              deleteOA.mutate(oa.id, {
                onSuccess: () => toast.success(`Đã xóa tài khoản Zalo OA "${oa.name}"`),
                onError: () => toast.error('Không thể xóa tài khoản Zalo OA'),
              });
            }}
            title="Xóa tài khoản Zalo OA"
          >
            {deleteOA.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Xóa OA
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Đồng bộ lần cuối: {oa.lastSyncAt ? formatRelativeTime(oa.lastSyncAt) : 'Chưa từng'}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={reconnect.isPending}
            onClick={() =>
              reconnect.mutate(oa.id, {
                onSuccess: (res) => toast.info(res.message),
                onError: () => toast.error('Kết nối lại thất bại'),
              })
            }
          >
            {reconnect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Kết nối lại
          </Button>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Giới hạn gửi tin / ngày (chính sách Zalo OA)</span>
            <span className="font-medium">
              {oa.messagesSentToday}/{oa.dailyMessageLimit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full', usagePercent > 85 ? 'bg-destructive' : 'bg-primary')}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Webhook nhận tin nhắn</p>
            {oa.webhookVerifiedAt ? (
              <Badge variant="success" className="text-[10px]">
                Đã xác minh {formatRelativeTime(oa.webhookVerifiedAt)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Chưa xác minh
              </Badge>
            )}
          </div>
          <div className="flex gap-1.5">
            <Input readOnly value={oa.webhookUrl} className="h-8 flex-1 text-xs" onFocus={(e) => e.target.select()} />
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={copyWebhookUrl} title="Copy URL">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Input
              readOnly
              type={showSecret ? 'text' : 'password'}
              value={oa.webhookSecret ?? ''}
              className="h-8 flex-1 text-xs"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setShowSecret((s) => !s)}
              title={showSecret ? 'Ẩn secret' : 'Hiện secret'}
            >
              {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={rotateSecret.isPending}
              onClick={() => {
                if (!window.confirm('Tạo secret mới? Secret cũ sẽ ngừng hoạt động ngay.')) return;
                rotateSecret.mutate(oa.id, {
                  onSuccess: () => toast.success('Đã tạo webhook secret mới'),
                  onError: () => toast.error('Tạo secret thất bại'),
                });
              }}
            >
              Tạo lại secret
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={testWebhook.isPending}
              onClick={() =>
                testWebhook.mutate(oa.id, {
                  onSuccess: () => toast.success('Webhook hoạt động tốt, đã xác minh'),
                  onError: () => toast.error('Kiểm tra webhook thất bại'),
                })
              }
            >
              {testWebhook.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
              Kiểm tra webhook
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={simulateWebhook.isPending}
              title="Giả lập khách hàng mới nhắn tin qua webhook (demo, không gọi Zalo thật)"
              onClick={() =>
                simulateWebhook.mutate(oa.id, {
                  onSuccess: (res) =>
                    toast.success(
                      `Khách "${res.customerName}" vừa nhắn tin${
                        res.assignedToName ? ` — đã phân cho ${res.assignedToName}` : ' — chưa phân công (không có nhân viên khả dụng)'
                      }`,
                    ),
                  onError: () => toast.error('Giả lập webhook thất bại'),
                })
              }
            >
              {simulateWebhook.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Giả lập khách mới
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">User theo kênh — quyền gửi tin</p>
            {availableUsers.length > 0 && (
              <Select onValueChange={(userId) => updateAccess.mutate({ userId, canSend: true })}>
                <SelectTrigger className="h-6 w-auto gap-1 border-dashed px-2 text-[11px]">
                  + Thêm thành viên
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            {oa.staffAccess.map((access) => (
              <div key={access.user.id} className="flex items-center justify-between text-sm">
                <span>{access.user.name}</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={access.canSend}
                    onCheckedChange={(checked) => updateAccess.mutate({ userId: access.user.id, canSend: checked })}
                  />
                  <button
                    onClick={() => {
                      if (!window.confirm(`Bỏ quyền của "${access.user.name}" trên kênh này?`)) return;
                      removeAccess.mutate(access.user.id);
                    }}
                    title="Bỏ thành viên khỏi kênh"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            ))}
            {oa.staffAccess.length === 0 && (
              <p className="text-xs text-muted-foreground">Chưa có nhân viên được cấp quyền.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
