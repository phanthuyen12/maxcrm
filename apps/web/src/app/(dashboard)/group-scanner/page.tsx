'use client';

import * as React from 'react';
import { Download, Loader2, ScanSearch } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

type Account = { id: string; name: string; status: string };
type Member = {
  id: string;
  displayName: string;
  zaloName: string;
  avatar: string;
  accountStatus: number;
  type: number;
  globalId: string;
  lastUpdateTime: number;
  membershipStatus: 'member' | 'pending_approval' | 'blocked';
};
type ScanResult = {
  accountId: string;
  group: { id: string; name: string; description: string; avatar: string; totalMember: number; hasMoreMember: number } | null;
  members: Member[];
  scannedCount: number;
};
type JoinResult = { joinStatus: 'joined' | 'pending_approval'; group: { id: string; name: string; totalMember: number } };

export default function GroupScannerPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [accountId, setAccountId] = React.useState('');
  const [link, setLink] = React.useState('');
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [joinInfo, setJoinInfo] = React.useState<JoinResult | null>(null);
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    api.get<Account[]>('/zalo-personal/accounts')
      .then((items) => {
        setAccounts(items);
        const connected = items.find((item) => item.status === 'connected');
        if (connected) setAccountId(connected.id);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Không tải được tài khoản'))
      .finally(() => setLoadingAccounts(false));
  }, []);

  const joinGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountId || !link.trim()) return;
    setScanning(true);
    setError('');
    setResult(null);
    try {
      setJoinInfo(await api.post<JoinResult>(`/zalo-personal/accounts/${accountId}/join-group-link`, { link: link.trim() }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tham gia được nhóm');
    } finally {
      setScanning(false);
    }
  };

  const checkApproval = async () => {
    if (!joinInfo || !accountId) return;
    setScanning(true);
    setError('');
    try {
      const status = await api.get<{ joined: boolean }>(`/zalo-personal/accounts/${accountId}/group-membership?groupId=${encodeURIComponent(joinInfo.group.id)}`);
      setJoinInfo({ ...joinInfo, joinStatus: status.joined ? 'joined' : 'pending_approval' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kiểm tra được trạng thái duyệt');
    } finally {
      setScanning(false);
    }
  };

  const scan = async () => {
    if (!accountId || !link.trim() || joinInfo?.joinStatus !== 'joined') return;
    setScanning(true);
    setError('');
    setResult(null);
    try {
      const scanResult = await api.post<Omit<ScanResult, 'accountId'>>(`/zalo-personal/accounts/${accountId}/scan-group-link`, { link: link.trim() });
      setResult({ ...scanResult, accountId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Quét thành viên nhóm thất bại');
    } finally {
      setScanning(false);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const rows = [['accountId', 'groupId', 'groupName', 'userId', 'displayName', 'zaloName', 'globalId', 'avatar', 'accountStatus', 'type', 'membershipStatus'], ...result.members.map((member) => [result.accountId, result.group?.id ?? '', result.group?.name ?? '', member.id, member.displayName, member.zaloName, member.globalId, member.avatar, String(member.accountStatus), String(member.type), member.membershipStatus])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'zalo-group-members.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const connectedAccounts = accounts.filter((account) => account.status === 'connected');

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <Topbar title="Quét thành viên nhóm Zalo" />
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><ScanSearch className="h-5 w-5" /></div>
            <div><h2 className="font-semibold">Quét member group</h2><p className="text-sm text-muted-foreground">Chọn tài khoản Zalo cá nhân, nhập link mời nhóm để lấy hồ sơ thành viên.</p></div>
          </div>
          <form onSubmit={joinGroup} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={accountId} onChange={(event) => { setAccountId(event.target.value); setJoinInfo(null); setResult(null); }} disabled={loadingAccounts || scanning} required>
              <option value="">{loadingAccounts ? 'Đang tải tài khoản…' : 'Chọn tài khoản đã kết nối'}</option>
              {connectedAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <Input value={link} onChange={(event) => { setLink(event.target.value); setJoinInfo(null); setResult(null); }} placeholder="https://zalo.me/g/..." disabled={scanning} required />
            <Button type="submit" disabled={scanning || !accountId || !link.trim()}>
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              {scanning ? 'Đang xử lý…' : 'Tham gia nhóm'}
            </Button>
          </form>
          {joinInfo && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div><p className="text-sm font-medium">{joinInfo.group.name}</p><p className={`text-xs ${joinInfo.joinStatus === 'joined' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {joinInfo.joinStatus === 'joined' ? 'Tài khoản đã là thành viên nhóm, có thể quét member.' : 'Đã gửi yêu cầu tham gia. Hãy chờ quản trị viên nhóm duyệt trong Zalo.'}
            </p></div>
            {joinInfo.joinStatus === 'pending_approval'
              ? <Button variant="outline" size="sm" onClick={() => void checkApproval()} disabled={scanning}>{scanning ? 'Đang kiểm tra…' : 'Kiểm tra đã được duyệt'}</Button>
              : <Button size="sm" onClick={() => void scan()} disabled={scanning}>{scanning ? 'Đang quét…' : 'Quét member'}</Button>}
          </div>}
          {connectedAccounts.length === 0 && !loadingAccounts && <p className="mt-3 text-sm text-amber-600">Chưa có tài khoản Zalo cá nhân nào kết nối. Kết nối tài khoản trước khi quét.</p>}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>

        {result && <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div className="flex items-center gap-3">
              {result.group?.avatar && <img src={result.group.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />}
            <div><h3 className="font-semibold">{result.group?.name ?? 'Nhóm Zalo'}</h3><p className="text-sm text-muted-foreground">{result.scannedCount} hồ sơ · {result.members.filter((member) => member.membershipStatus === 'pending_approval').length} chờ duyệt · {result.members.filter((member) => member.membershipStatus === 'blocked').length} bị chặn · nhóm có {result.group?.totalMember ?? result.scannedCount} thành viên</p></div>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!result.members.length}><Download className="h-4 w-4" />Xuất CSV</Button>
          </div>
          {result.group?.description && <p className="border-b px-4 py-3 text-sm text-muted-foreground">{result.group.description}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Thành viên</th><th className="px-4 py-3">User ID</th><th className="px-4 py-3">Global ID</th><th className="px-4 py-3">Phân loại</th><th className="px-4 py-3">Loại tài khoản</th><th className="px-4 py-3">Trạng thái</th></tr></thead>
              <tbody>{result.members.map((member) => <tr key={member.id} className="border-t">
                <td className="px-4 py-3"><div className="flex items-center gap-3">{member.avatar ? <img src={member.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-muted" />}<div><p className="font-medium">{member.displayName || member.zaloName || 'Chưa có tên'}</p>{member.displayName && member.zaloName && member.displayName !== member.zaloName && <p className="text-xs text-muted-foreground">{member.zaloName}</p>}</div></div></td>
                <td className="px-4 py-3 font-mono text-xs">{member.id}</td><td className="px-4 py-3 font-mono text-xs">{member.globalId || '—'}</td><td className="px-4 py-3">{member.membershipStatus === 'pending_approval' ? 'Chờ duyệt' : member.membershipStatus === 'blocked' ? 'Bị chặn' : 'Thành viên'}</td><td className="px-4 py-3">{member.type}</td><td className="px-4 py-3">{member.accountStatus}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {result.scannedCount < (result.group?.totalMember ?? result.scannedCount) && <p className="border-t p-3 text-xs text-amber-600">Zalo chỉ trả về một phần danh sách thành viên cho link/tài khoản này.</p>}
        </section>}
      </div>
    </main>
  </div>;
}
