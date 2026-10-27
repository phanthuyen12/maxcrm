'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useUsers } from '@/hooks/use-users';
import { useCurrentUser } from '@/hooks/use-current-user';

type Account = { id: string; name: string; status: string; qrImage: string | null; hasProxy: boolean; proxyType: string | null; createdAt: string; channelId: string; staffAccess: Array<{ user: { id: string; name: string; role: string }; canSend: boolean }> };
type ZaloStatusEvent = { accountId: string; status: string; qrImage: string | null };
type Friend = { userId: string; displayName: string; zaloName: string; avatar: string; phoneNumber: string };
type FriendRequest = { userId: string; displayName: string; zaloName: string; avatar: string; phoneNumber: string };
type Group = { id: string; name: string; memberCount: number };
type AccountDirectory = { friends: Friend[]; requests: FriendRequest[]; groups: Group[]; loading: boolean };
const statusNames: Record<string, string> = { disconnected: 'Chưa kết nối', waiting_qr: 'Chờ quét mã', scanned: 'Đã quét, đang xác nhận', connected: 'Đã kết nối', reconnecting: 'Đang kết nối lại', error: 'Có lỗi' };

export default function PersonalZaloPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyDrafts, setProxyDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [directories, setDirectories] = useState<Record<string, AccountDirectory>>({});
  const [cleanupMessage, setCleanupMessage] = useState('');
  const router = useRouter();
  const { data: users = [] } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const isSuperAdmin = currentUser?.role === 'ADMIN';
  const canManageAccess = isSuperAdmin;
  const canClearChats = currentUser?.role === 'ADMIN';

  const refresh = async () => {
    try { setAccounts(await api.get<Account[]>('/zalo-personal/accounts')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được danh sách tài khoản'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    const socket = getSocket();
    const onStatus = (next: ZaloStatusEvent) => setAccounts((current) => current.map((account) => account.id === next.accountId ? { ...account, status: next.status, qrImage: next.qrImage } : account));
    socket.on('zalo:personal:status', onStatus);
    return () => { socket.off('zalo:personal:status', onStatus); };
  }, []);

  useEffect(() => {
    if (!accounts.some((account) => ['waiting_qr', 'scanned'].includes(account.status))) return;
    const timer = window.setInterval(() => { void refresh(); }, 2500);
    return () => window.clearInterval(timer);
  }, [accounts]);

  const addAccount = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    try {
      await api.post('/zalo-personal/accounts', { name, proxyUrl: proxyUrl.trim() || undefined });
      setName(''); setProxyUrl(''); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể thêm tài khoản'); }
  };

  const accountAction = async (account: Account, action: 'login' | 'disconnect' | 'delete') => {
    setBusyId(account.id); setError('');
    try {
      if (action === 'login') {
        const next = await api.post<Account>(`/zalo-personal/accounts/${account.id}/login`);
        setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, ...next } : item));
      } else if (action === 'disconnect') {
        const next = await api.post<Account>(`/zalo-personal/accounts/${account.id}/disconnect`);
        setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, ...next } : item));
      } else {
        await api.delete(`/zalo-personal/accounts/${account.id}`);
        setAccounts((current) => current.filter((item) => item.id !== account.id));
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Thao tác thất bại'); }
    finally { setBusyId(''); }
  };

  const updateProxy = async (account: Account) => {
    setBusyId(account.id); setError('');
    try {
      const updated = await api.patch<Account>(`/zalo-personal/accounts/${account.id}/proxy`, { proxyUrl: proxyDrafts[account.id]?.trim() || null });
      setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, ...updated } : item));
      setProxyDrafts((current) => ({ ...current, [account.id]: '' }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể cập nhật proxy'); }
    finally { setBusyId(''); }
  };

  const setChannelAccess = async (account: Account, userId: string, canSend: boolean) => {
    try { await api.put(`/zalo-oa/${account.channelId}/staff-access/${userId}`, { canSend }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể cập nhật quyền kênh'); }
  };

  const removeChannelMember = async (account: Account, userId: string) => {
    try { await api.delete(`/zalo-oa/${account.channelId}/staff-access/${userId}`); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể gỡ thành viên khỏi kênh'); }
  };

  const loadDirectory = async (account: Account) => {
    setDirectories((current) => ({ ...current, [account.id]: { ...(current[account.id] ?? { friends: [], requests: [], groups: [] }), loading: true } }));
    try {
      const [friends, requests, groups] = await Promise.all([
        api.get<Friend[]>(`/zalo-personal/accounts/${account.id}/friends`),
        api.get<FriendRequest[]>(`/zalo-personal/accounts/${account.id}/friend-requests`),
        api.get<Group[]>(`/zalo-personal/accounts/${account.id}/groups`),
      ]);
      setDirectories((current) => ({ ...current, [account.id]: { friends, requests, groups, loading: false } }));
    } catch (e) {
      setDirectories((current) => ({ ...current, [account.id]: { ...(current[account.id] ?? { friends: [], requests: [], groups: [] }), loading: false } }));
      setError(e instanceof Error ? e.message : 'Không tải được bạn bè/nhóm');
    }
  };

  const acceptRequest = async (account: Account, friend: FriendRequest) => {
    try {
      await api.post(`/zalo-personal/accounts/${account.id}/friend-requests/${friend.userId}/accept`);
      await loadDirectory(account);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không chấp nhận được lời mời'); }
  };

  const openChat = async (account: Account, targetId: string, displayName: string, isGroup: boolean) => {
    try {
      const result = await api.post<{ conversationId: string }>(`/zalo-personal/accounts/${account.id}/chat`, { targetId, displayName, isGroup });
      router.push(`/inbox?conversationId=${encodeURIComponent(result.conversationId)}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không mở được hội thoại'); }
  };

  const clearPersonalChats = async () => {
    if (!window.confirm('Xóa toàn bộ hội thoại và tin nhắn đã lưu trong CRM thuộc các kênh Zalo cá nhân? Khách hàng và dữ liệu Zalo OA sẽ được giữ lại.')) return;
    try {
      const result = await api.delete<{ deletedConversations: number }>('/zalo-personal/chat-data');
      setCleanupMessage(`Đã xóa ${result.deletedConversations} hội thoại Zalo cá nhân khỏi CRM.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không xóa được dữ liệu chat'); }
  };

  return <div className="flex flex-1 flex-col overflow-hidden">
    <Topbar title="Quản lý nhiều tài khoản Zalo" />
    <main className="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-7">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-accent-foreground"><Smartphone className="h-6 w-6" /></span>
          <div><h2 className="text-2xl font-bold tracking-tight">Zalo cá nhân</h2><p className="mt-1 text-sm text-muted-foreground">Quản lý tài khoản, quyền thành viên và danh bạ Zalo</p></div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold">{isSuperAdmin ? 'Thêm tài khoản Zalo' : 'Tài khoản Zalo được cấp quyền'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Mỗi tài khoản có phiên đăng nhập và proxy riêng. Hỗ trợ HTTP/HTTPS và SOCKS5.</p>
            </div>
            {canClearChats && <Button variant="destructive" size="sm" onClick={() => void clearPersonalChats()}>Xóa chat Zalo cá nhân đã lưu</Button>}
          </div>
          {cleanupMessage && <p className="mt-2 text-sm text-muted-foreground">{cleanupMessage}</p>}
          {isSuperAdmin && <form onSubmit={addAccount} className="mt-5 grid gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(260px,2fr)_auto]">
            <input className="h-11 min-w-0 rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Tên dễ nhớ, ví dụ Zalo CSKH 1" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="h-11 min-w-0 rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Proxy tùy chọn: http://user:pass@host:port hoặc socks5://..." value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} />
            <Button type="submit">Thêm tài khoản</Button>
          </form>}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
        {loading && <p className="text-sm text-muted-foreground">Đang tải tài khoản…</p>}
        {!loading && accounts.length === 0 && <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">Chưa có tài khoản Zalo được cấp quyền.</div>}
        <div className="grid items-start gap-5 2xl:grid-cols-2">
          {accounts.map((account) => <article key={account.id} className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="break-words text-base font-bold">{account.name}</h3><p className="mt-2 inline-flex items-center gap-2 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium"><span className={`h-2 w-2 rounded-full ${account.status === 'connected' ? 'bg-emerald-500' : account.status === 'error' ? 'bg-destructive' : 'bg-amber-500'}`} />{statusNames[account.status] ?? account.status}</p>
             <p className="mt-2 text-xs text-muted-foreground">{account.hasProxy ? `Proxy ${account.proxyType}` : 'Không dùng proxy'}</p>
                {isSuperAdmin && <div className="mt-3 flex flex-wrap gap-2">
                  <input className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs" aria-label={`Proxy mới cho ${account.name}`} placeholder="Proxy mới (để trống để gỡ proxy)" value={proxyDrafts[account.id] ?? ''} onChange={(event) => setProxyDrafts((current) => ({ ...current, [account.id]: event.target.value }))} />
                  <Button size="sm" variant="outline" disabled={busyId === account.id} onClick={() => void updateProxy(account)}>{busyId === account.id ? 'Đang lưu…' : 'Cập nhật proxy'}</Button>
                </div>}
              </div>
               {isSuperAdmin && <Button variant="outline" size="sm" disabled={busyId === account.id} onClick={() => void accountAction(account, 'delete')}>Xóa</Button>}
            </div>
            {account.qrImage && <img src={account.qrImage.startsWith('data:') ? account.qrImage : `data:image/png;base64,${account.qrImage}`} alt={`Mã QR ${account.name}`} className="mx-auto my-4 h-60 w-60 rounded border object-contain" />}
            {isSuperAdmin && <div className="mt-4 flex flex-wrap gap-2">
              {account.status === 'connected'
                ? <Button variant="destructive" disabled={busyId === account.id} onClick={() => void accountAction(account, 'disconnect')}>Ngắt kết nối</Button>
                : <Button disabled={busyId === account.id || ['waiting_qr', 'scanned', 'reconnecting'].includes(account.status)} onClick={() => void accountAction(account, 'login')}>{busyId === account.id ? 'Đang xử lý…' : account.status === 'reconnecting' ? 'Đang kết nối lại…' : account.status === 'waiting_qr' ? 'Đang chờ mã QR…' : 'Kết nối bằng QR'}</Button>}
            </div>}
            </div>
            <div className="border-t px-5 py-4 md:px-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div><h4 className="text-sm font-medium">Thành viên được cấp quyền</h4><p className="text-xs text-muted-foreground">Bật quyền gửi tin cho từng nhân viên trên kênh này.</p></div>
                {canManageAccess && <select className="h-9 max-w-44 rounded-md border bg-background px-2 text-xs" value="" onChange={(event) => { if (event.target.value) void setChannelAccess(account, event.target.value, true); }}>
                  <option value="">+ Thêm thành viên</option>
                  {users.filter((user) => !account.staffAccess.some((access) => access.user.id === user.id)).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>}
              </div>
              {account.staffAccess.length === 0 ? <p className="text-xs text-muted-foreground">Chưa có thành viên được cấp quyền.</p> : <ul className="space-y-2">
                {account.staffAccess.map((access) => <li key={access.user.id} className="flex items-center justify-between text-sm">
                  <span>{access.user.name} <span className="text-xs text-muted-foreground">· {access.user.role}</span></span>
                  <div className="flex items-center gap-3 text-xs"><label className="flex items-center gap-1.5"><input type="checkbox" checked={access.canSend} disabled={!canManageAccess} onChange={(event) => void setChannelAccess(account, access.user.id, event.target.checked)} /> Được gửi tin</label>
                    {canManageAccess && <button className="text-destructive" onClick={() => void removeChannelMember(account, access.user.id)}>Gỡ</button>}</div>
                </li>)}
              </ul>}
            </div>
            <div className="border-t px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h4 className="text-sm font-medium">Bạn bè, lời mời và nhóm</h4><p className="text-xs text-muted-foreground">Dữ liệu trực tiếp từ tài khoản Zalo đã kết nối.</p></div>
                <Button variant="outline" size="sm" disabled={account.status !== 'connected' || directories[account.id]?.loading} onClick={() => void loadDirectory(account)}>
                  {directories[account.id]?.loading ? 'Đang tải…' : 'Tải danh bạ Zalo'}
                </Button>
              </div>
              {directories[account.id] && !directories[account.id].loading && <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div><h5 className="mb-2 text-xs font-semibold">Bạn bè ({directories[account.id].friends.length})</h5><ul className="max-h-56 space-y-2 overflow-y-auto">
                  {directories[account.id].friends.slice(0, 100).map((friend) => <li key={friend.userId} className="flex items-center justify-between gap-2 text-xs"><span className="truncate">{friend.displayName || friend.zaloName || friend.userId}</span><Button size="sm" variant="outline" onClick={() => void openChat(account, friend.userId, friend.displayName || friend.zaloName, false)}>Chat</Button></li>)}
                </ul></div>
                <div><h5 className="mb-2 text-xs font-semibold">Lời mời kết bạn ({directories[account.id].requests.length})</h5><ul className="max-h-56 space-y-2 overflow-y-auto">
                  {directories[account.id].requests.map((friend) => <li key={friend.userId} className="flex items-center justify-between gap-2 text-xs"><span className="truncate">{friend.displayName || friend.zaloName || friend.userId}</span><Button size="sm" onClick={() => void acceptRequest(account, friend)}>Chấp nhận</Button></li>)}
                </ul></div>
                <div><h5 className="mb-2 text-xs font-semibold">Nhóm ({directories[account.id].groups.length})</h5><ul className="max-h-56 space-y-2 overflow-y-auto">
                  {directories[account.id].groups.map((group) => <li key={group.id} className="flex items-center justify-between gap-2 text-xs"><span className="truncate">{group.name} · {group.memberCount}</span><Button size="sm" variant="outline" onClick={() => void openChat(account, group.id, group.name, true)}>Chat</Button></li>)}
                </ul></div>
              </div>}
            </div>
          </article>)}
        </div>
        <p className="text-xs text-muted-foreground">Phiên đăng nhập Zalo chỉ giữ trong bộ nhớ API; sau khi khởi động lại API, hãy kết nối lại bằng QR. URL proxy được lưu trong cơ sở dữ liệu và không hiển thị lại đầy đủ trong giao diện.</p>
      </section>
    </main>
  </div>;
}
