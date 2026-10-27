'use client';

import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const [role, setRole] = useState<Member['role']>('AGENT');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const createMember = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/users', { name, email, password, role: isManager ? 'AGENT' : role });
      setName(''); setEmail(''); setPassword(''); setRole('AGENT');
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['team-members'] }), queryClient.invalidateQueries({ queryKey: ['users'] })]);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không thể tạo thành viên'); }
    finally { setBusy(false); }
  };

  const toggleActive = async (member: Member) => {
    setError('');
    try {
      await api.patch(`/users/${member.id}/active`, { isActive: !member.isActive });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['team-members'] }), queryClient.invalidateQueries({ queryKey: ['users'] })]);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không thể cập nhật thành viên'); }
  };

  return <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Quản lý tài khoản" />
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Tạo thành viên</h2>
          <p className="mt-1 text-sm text-muted-foreground">{isManager ? 'Quản lý có thể tạo và quản lý tài khoản nhân viên.' : 'Tạo tài khoản đăng nhập và phân quyền cho đội ngũ.'}</p>
          <form onSubmit={createMember} className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Họ tên" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Email đăng nhập" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Mật khẩu (tối thiểu 6 ký tự)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            <div className="flex gap-2">{isManager ? <div className="flex h-10 flex-1 items-center rounded-md border bg-muted px-3 text-sm">Nhân viên</div> : <select className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as Member['role'])}><option value="AGENT">Nhân viên</option><option value="CHAT">Chat</option><option value="MANAGER">Quản lý</option><option value="ADMIN">Quản trị viên</option></select>}
              <Button disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo thành viên'}</Button></div>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b p-4"><h2 className="font-semibold">Danh sách thành viên</h2></div>
          {isLoading ? <p className="p-5 text-sm text-muted-foreground">Đang tải…</p> : isError ? <p className="p-5 text-sm text-destructive">Không tải được. Chức năng này dành cho quản trị viên.</p> : <div className="divide-y">
            {members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div><p className="text-sm font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.email} · {roleNames[member.role]}</p></div>
              <div className="flex items-center gap-3"><span className={`text-xs ${member.isActive ? 'text-green-700' : 'text-muted-foreground'}`}>{member.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</span>
                <Button size="sm" variant={member.isActive ? 'outline' : 'default'} onClick={() => void toggleActive(member)}>{member.isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}</Button></div>
            </div>)}
            {members.length === 0 && <p className="p-5 text-sm text-muted-foreground">Chưa có thành viên.</p>}
          </div>}
        </section>
      </div>
    </main>
  </div>;
}
