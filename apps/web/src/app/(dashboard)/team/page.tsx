'use client';

import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-current-user';

type Member = { id: string; name: string; email: string; role: 'ADMIN' | 'MANAGER' | 'AGENT' | 'CHAT'; isActive: boolean; createdAt: string };
const roleNames = { ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', AGENT: 'Nhân viên', CHAT: 'Chat' };

export default function TeamPage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isManager = currentUser?.role === 'MANAGER';
  const { data: members = [], isLoading, isError } = useQuery<Member[]>({ queryKey: ['team-members'], queryFn: () => api.get<Member[]>('/users/manage') });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [role, setRole] = useState<Member['role']>('AGENT');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Member['role']>('AGENT');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshUsers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['team-members'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
    ]);
  };

  const createMember = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/users', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role: isManager ? 'AGENT' : role,
      });
      setName(''); setEmail(''); setPassword(''); setRole('AGENT');
      toast.success('Đã tạo thành viên mới');
      await refreshUsers();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không thể tạo thành viên'); }
    finally { setBusy(false); }
  };

  const startEdit = (member: Member) => {
    setError('');
    setEditingId(member.id);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditPassword('');
    setShowEditPassword(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmail('');
    setEditPassword('');
    setShowEditPassword(false);
  };

  const saveEdit = async (event: FormEvent, member: Member) => {
    event.preventDefault();
    setSavingEdit(true);
    setError('');
    try {
      await api.patch(`/users/${member.id}`, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: isManager || member.id === currentUser?.id ? member.role : editRole,
        ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
      });
      toast.success(`Đã cập nhật thông tin "${editName.trim()}"`);
      cancelEdit();
      await refreshUsers();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Không thể cập nhật thông tin thành viên';
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (member: Member) => {
    setError('');
    try {
      await api.patch(`/users/${member.id}/active`, { isActive: !member.isActive });
      toast.success(member.isActive ? `Đã vô hiệu hóa "${member.name}"` : `Đã kích hoạt lại "${member.name}"`);
      await refreshUsers();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Không thể cập nhật thành viên';
      setError(msg);
      toast.error(msg);
    }
  };

  const deleteMember = async (member: Member) => {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản "${member.name}" (${member.email})? Các hội thoại và dữ liệu khách hàng sẽ được giữ lại.`)) return;
    setDeletingId(member.id);
    setError('');
    try {
      await api.delete(`/users/${member.id}`);
      toast.success(`Đã xóa tài khoản "${member.name}"`);
      if (editingId === member.id) cancelEdit();
      await refreshUsers();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Không thể xóa tài khoản thành viên';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Quản lý tài khoản" />
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Tạo thành viên</h2>
          <p className="mt-1 text-sm text-muted-foreground">{isManager ? 'Quản lý có thể tạo và quản lý tài khoản nhân viên.' : 'Tạo tài khoản đăng nhập và phân quyền cho đội ngũ.'}</p>
          <form onSubmit={createMember} autoComplete="off" className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Họ tên" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Email đăng nhập" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div className="relative">
              <input
                className="h-10 w-full rounded-md border bg-background px-3 pr-10 text-sm"
                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                type={showCreatePassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowCreatePassword((v) => !v)}
                aria-label={showCreatePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2">{isManager ? <div className="flex h-10 flex-1 items-center rounded-md border bg-muted px-3 text-sm">Nhân viên</div> : <select className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as Member['role'])}><option value="AGENT">Nhân viên</option><option value="CHAT">Chat</option><option value="MANAGER">Quản lý</option><option value="ADMIN">Quản trị viên</option></select>}
              <Button disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo thành viên'}</Button></div>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b p-4"><h2 className="font-semibold">Danh sách thành viên</h2></div>
          {isLoading ? <p className="p-5 text-sm text-muted-foreground">Đang tải…</p> : isError ? <p className="p-5 text-sm text-destructive">Không tải được. Chức năng này dành cho quản trị viên.</p> : <div className="divide-y">
            {members.map((member) => {
              const isSelf = member.id === currentUser?.id;
              const isEditing = editingId === member.id;
              return (
                <div key={member.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{member.name} {isSelf && <span className="text-xs font-normal text-muted-foreground">(Bạn)</span>}</p>
                      <p className="text-xs text-muted-foreground">{member.email} · {roleNames[member.role]}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`mr-1 text-xs ${member.isActive ? 'text-green-700' : 'text-muted-foreground'}`}>
                        {member.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (isEditing ? cancelEdit() : startEdit(member))}
                      >
                        {isEditing ? <><X className="h-3.5 w-3.5" /> Đóng</> : <><Pencil className="h-3.5 w-3.5" /> Cập nhật</>}
                      </Button>
                      <Button
                        size="sm"
                        variant={member.isActive ? 'outline' : 'default'}
                        disabled={isSelf && member.isActive}
                        onClick={() => void toggleActive(member)}
                      >
                        {member.isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                      </Button>
                      {!isSelf && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deletingId === member.id}
                          onClick={() => void deleteMember(member)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === member.id ? 'Đang xóa…' : 'Xóa'}
                        </Button>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <form onSubmit={(event) => void saveEdit(event, member)} autoComplete="off" className="mt-4 grid gap-3 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
                      <input
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                        placeholder="Họ tên"
                        autoComplete="off"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                      <input
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                        placeholder="Email đăng nhập"
                        type="email"
                        autoComplete="off"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        required
                      />
                      <div className="relative">
                        <input
                          className="h-10 w-full rounded-md border bg-background px-3 pr-10 text-sm"
                          placeholder="Mật khẩu mới (để trống nếu không đổi)"
                          type={showEditPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          minLength={6}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                          onClick={() => setShowEditPassword((v) => !v)}
                          aria-label={showEditPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {isManager || isSelf ? (
                          <div className="flex h-10 flex-1 items-center rounded-md border bg-muted px-3 text-sm">
                            {roleNames[member.role]}
                          </div>
                        ) : (
                          <select
                            className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as Member['role'])}
                          >
                            <option value="AGENT">Nhân viên</option>
                            <option value="CHAT">Chat</option>
                            <option value="MANAGER">Quản lý</option>
                            <option value="ADMIN">Quản trị viên</option>
                          </select>
                        )}
                        <Button type="submit" size="sm" className="h-10 px-4" disabled={savingEdit}>
                          {savingEdit ? 'Đang lưu…' : 'Lưu thay đổi'}
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-10" onClick={cancelEdit}>
                          Hủy
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
            {members.length === 0 && <p className="p-5 text-sm text-muted-foreground">Chưa có thành viên.</p>}
          </div>}
        </section>
      </div>
    </main>
  </div>;
}
