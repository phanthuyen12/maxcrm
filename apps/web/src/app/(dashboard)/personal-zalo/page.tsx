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

type AssignedGroupUser = { id: string; name: string; role: string };
type ManagedGroup = { id: string; name: string; memberCount?: number; assignedUsers: AssignedGroupUser[] };
type Account = {
  id: string;
  name: string;
  status: string;
  qrImage: string | null;
  hasProxy: boolean;
  proxyType: string | null;
  createdAt: string;
  channelId: string;
  staffAccess: Array<{ user: { id: string; name: string; role: string }; canSend: boolean }>;
  managedGroups?: ManagedGroup[];
};
type ZaloStatusEvent = { accountId: string; status: string; qrImage: string | null };
type Friend = { userId: string; displayName: string; zaloName: string; avatar: string; phoneNumber: string };
type FriendRequest = { userId: string; displayName: string; zaloName: string; avatar: string; phoneNumber: string };
type Group = { id: string; name: string; memberCount: number; assignedUsers?: AssignedGroupUser[] };
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

  const assignGroupSale = async (account: Account, group: { id: string; name: string }, userId: string) => {
    try {
      const updated = await api.put<{ groupId: string; assignedUsers: AssignedGroupUser[] }>(
        `/zalo-personal/accounts/${account.id}/groups/${encodeURIComponent(group.id)}/access/${encodeURIComponent(userId)}`,
        { groupName: group.name },
      );
      setDirectories((current) => {
        const dir = current[account.id];
        if (!dir) return current;
        return {
          ...current,
          [account.id]: {
            ...dir,
            groups: dir.groups.map((g) => (g.id === group.id ? { ...g, assignedUsers: updated.assignedUsers } : g)),
          },
        };
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể phân công sale cho nhóm');
    }
  };

  const removeGroupSale = async (account: Account, groupId: string, userId: string) => {
    try {
      const updated = await api.delete<{ groupId: string; assignedUsers: AssignedGroupUser[] }>(
        `/zalo-personal/accounts/${account.id}/groups/${encodeURIComponent(groupId)}/access/${encodeURIComponent(userId)}`,
      );
      setDirectories((current) => {
        const dir = current[account.id];
        if (!dir) return current;
        return {
          ...current,
          [account.id]: {
            ...dir,
            groups: dir.groups.map((g) => (g.id === groupId ? { ...g, assignedUsers: updated.assignedUsers } : g)),
          },
        };
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể gỡ sale khỏi nhóm');
    }
  };

  const clearGroupSales = async (account: Account, groupId: string) => {
    try {
      await api.delete(`/zalo-personal/accounts/${account.id}/groups/${encodeURIComponent(groupId)}/access`);
      setDirectories((current) => {
        const dir = current[account.id];
        if (!dir) return current;
        return {
          ...current,
          [account.id]: {
            ...dir,
            groups: dir.groups.map((g) => (g.id === groupId ? { ...g, assignedUsers: [] } : g)),
          },
        };
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể đặt lại quyền nhóm');
    }
  };

  const getCombinedGroups = (account: Account): ManagedGroup[] => {
    const map = new Map<string, ManagedGroup>();
    for (const g of account.managedGroups ?? []) {
      map.set(g.id, { id: g.id, name: g.name, memberCount: g.memberCount, assignedUsers: g.assignedUsers ?? [] });
    }
    for (const g of directories[account.id]?.groups ?? []) {
      const existing = map.get(g.id);
      map.set(g.id, {
        id: g.id,
        name: g.name || existing?.name || `Nhóm ${g.id}`,
        memberCount: g.memberCount ?? existing?.memberCount,
        assignedUsers: g.assignedUsers ?? existing?.assignedUsers ?? [],
      });
    }
    return [...map.values()];
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
                <div>
                  <h4 className="text-sm font-medium">Bạn bè, lời mời & Phân chia nhóm cho Sale</h4>
                  <p className="text-xs text-muted-foreground">
                    Nhóm được gán riêng thì chỉ những Sale được gán mới nhìn thấy; nhóm không gán riêng thì tất cả Sale trong kênh đều thấy.
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={account.status !== 'connected' || directories[account.id]?.loading} onClick={() => void loadDirectory(account)}>
                  {directories[account.id]?.loading ? 'Đang tải…' : 'Tải danh bạ & nhóm Zalo'}
                </Button>
              </div>
              {(() => {
                const combinedGroups = getCombinedGroups(account);
                const dir = directories[account.id];
                if (!dir && combinedGroups.length === 0) return null;
                return (
                  <div className="mt-4 space-y-4">
                    <div>
                      <h5 className="mb-2 text-xs font-semibold">
                        Danh sách Nhóm Zalo ({combinedGroups.length})
                      </h5>
                      {combinedGroups.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Chưa có nhóm nào. Hãy bấm &ldquo;Tải danh bạ &amp; nhóm Zalo&rdquo; khi tài khoản đã kết nối.</p>
                      ) : (
                        <ul className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                          {combinedGroups.map((group) => {
                            const assigned = group.assignedUsers ?? [];
                            const availableSales = users.filter((u) => u.role !== 'ADMIN' && !assigned.some((a) => a.id === u.id));
                            return (
                              <li key={group.id} className="rounded-xl border bg-background/70 p-3 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-foreground">
                                      {group.name}
                                      {typeof group.memberCount === 'number' && (
                                        <span className="ml-1.5 font-normal text-muted-foreground">· {group.memberCount} thành viên</span>
                                      )}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                      {assigned.length === 0
                                        ? 'Trạng thái: Tất cả sale đều thấy nhóm này'
                                        : `Trạng thái: Chỉ ${assigned.length} sale được chỉ định mới thấy nhóm này`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {canManageAccess && availableSales.length > 0 && (
                                      <select
                                        className="h-8 max-w-44 rounded-md border bg-background px-2 text-xs"
                                        value=""
                                        onChange={(e) => {
                                          if (e.target.value) void assignGroupSale(account, group, e.target.value);
                                        }}
                                      >
                                        <option value="">+ Phân cho sale</option>
                                        {availableSales.map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.name}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={account.status !== 'connected'}
                                      onClick={() => void openChat(account, group.id, group.name, true)}
                                    >
                                      Chat
                                    </Button>
                                  </div>
                                </div>
                                {assigned.length > 0 && (
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
                                    <span className="text-[11px] text-muted-foreground">Sale được thấy:</span>
                                    {assigned.map((u) => (
                                      <span
                                        key={u.id}
                                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                                      >
                                        {u.name}
                                        {canManageAccess && (
                                          <button
                                            type="button"
                                            className="ml-0.5 text-primary/70 hover:text-destructive"
                                            title={`Bỏ quyền xem nhóm của ${u.name}`}
                                            onClick={() => void removeGroupSale(account, group.id, u.id)}
                                          >
                                            ×
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                    {canManageAccess && (
                                      <button
                                        type="button"
                                        className="ml-auto text-[11px] text-muted-foreground underline hover:text-foreground"
                                        onClick={() => void clearGroupSales(account, group.id)}
                                      >
                                        Mở cho tất cả sale
                                      </button>
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    {dir && !dir.loading && (
                      <div className="grid gap-4 border-t pt-3 md:grid-cols-2">
                        <div>
                          <h5 className="mb-2 text-xs font-semibold">Bạn bè ({dir.friends.length})</h5>
                          <ul className="max-h-48 space-y-2 overflow-y-auto">
                            {dir.friends.slice(0, 100).map((friend) => (
                              <li key={friend.userId} className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate">{friend.displayName || friend.zaloName || friend.userId}</span>
                                <Button size="sm" variant="outline" onClick={() => void openChat(account, friend.userId, friend.displayName || friend.zaloName, false)}>
                                  Chat
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="mb-2 text-xs font-semibold">Lời mời kết bạn ({dir.requests.length})</h5>
                          <ul className="max-h-48 space-y-2 overflow-y-auto">
                            {dir.requests.map((friend) => (
                              <li key={friend.userId} className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate">{friend.displayName || friend.zaloName || friend.userId}</span>
                                <Button size="sm" onClick={() => void acceptRequest(account, friend)}>
                                  Chấp nhận
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </article>)}
        </div>
        <p className="text-xs text-muted-foreground">Phiên đăng nhập Zalo chỉ giữ trong bộ nhớ API; sau khi khởi động lại API, hãy kết nối lại bằng QR. URL proxy được lưu trong cơ sở dữ liệu và không hiển thị lại đầy đủ trong giao diện.</p>
      </section>
    </main>
  </div>;
}
