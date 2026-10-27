'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Clock3, FileSpreadsheet, Loader2, RotateCcw, Send, Upload, Users, X } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { initials } from '@/lib/utils';
import { api } from '@/lib/api';

type Account = { id: string; name: string; status: string };
type Recipient = { userId: string; displayName: string };
type Batch = { id: string; status: 'running' | 'completed'; total: number; sent: number; failed: number; results: Array<Recipient & { status: 'pending' | 'sent' | 'failed'; error?: string }> };

function parseCsv(text: string): Recipient[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const idIndex = headers.findIndex((header) => ['userid', 'user_id', 'uid', 'id'].includes(header));
  const nameIndex = headers.findIndex((header) => ['displayname', 'display_name', 'name', 'zaloname'].includes(header));
  const membershipIndex = headers.indexOf('membershipstatus');
  if (idIndex < 0) throw new Error('CSV cần có cột userId (xuất trực tiếp từ trang quét group).');
  const unique = new Map<string, Recipient>();
  for (const cells of rows.slice(1)) {
    const membershipStatus = membershipIndex >= 0 ? cells[membershipIndex]?.trim() : '';
    if (membershipStatus && membershipStatus !== 'member') continue;
    const userId = cells[idIndex]?.trim();
    if (userId) unique.set(userId, { userId, displayName: nameIndex >= 0 ? cells[nameIndex]?.trim() ?? '' : '' });
  }
  return [...unique.values()];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function BulkMessagePage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [accountId, setAccountId] = React.useState('');
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [fileName, setFileName] = React.useState('');
  const [content, setContent] = React.useState('');
  const [lastBatchContent, setLastBatchContent] = React.useState('');
  const [lastBatchAccountId, setLastBatchAccountId] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [progress, setProgress] = React.useState<{ total: number; sent: number; failed: number; results: Batch['results'] }>({ total: 0, sent: 0, failed: 0, results: [] });
  const [resultFilter, setResultFilter] = React.useState<'all' | 'sent' | 'failed' | 'pending'>('all');

  React.useEffect(() => {
    api.get<Account[]>('/zalo-personal/accounts').then((items) => {
      setAccounts(items);
      const connected = items.find((item) => item.status === 'connected');
      if (connected) setAccountId(connected.id);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Không tải được tài khoản Zalo'));
  }, []);

  const loadFile = async (file?: File) => {
    setError(''); setRecipients([]); setFileName(''); setProgress({ total: 0, sent: 0, failed: 0, results: [] }); setLastBatchContent(''); setLastBatchAccountId('');
    if (!file) return;
    try {
      const csv = file.name.toLowerCase().endsWith('.csv') ? await file.text() : '';
      if (!csv) throw new Error('Chỉ hỗ trợ file CSV được xuất từ trang quét group.');
      const parsed = parseCsv(csv);
      if (!parsed.length) throw new Error('File không có userId hợp lệ.');
      if (parsed.length > 200) throw new Error('Mỗi lượt gửi tối đa 200 user. Hãy chia danh sách thành file nhỏ hơn.');
      setRecipients(parsed); setFileName(file.name);
      const headers = csv.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0].split(',').map((value) => value.replaceAll('"', '').trim().toLowerCase());
      const accountIndex = headers.indexOf('accountid');
      if (accountIndex >= 0) {
        const firstRow = csv.replace(/^\uFEFF/, '').split(/\r?\n/)[1];
        const accountFromFile = firstRow?.split(',')[accountIndex]?.replaceAll('"', '').trim();
        if (accountFromFile && accounts.some((account) => account.id === accountFromFile)) setAccountId(accountFromFile);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được file'); }
  };

  const sendRecipients = async (targets: Recipient[], retry = false) => {
    const selectedAccountId = retry ? lastBatchAccountId : accountId;
    const messageContent = retry ? lastBatchContent : content.trim();
    if (!selectedAccountId || !targets.length || !messageContent) return;
    if (!retry) { setLastBatchContent(messageContent); setLastBatchAccountId(selectedAccountId); }
    setSending(true); setError('');
    setProgress((current) => {
      const results = retry
        ? current.results.map((result) => targets.some((target) => target.userId === result.userId) ? { ...result, status: 'pending' as const, error: undefined } : result)
        : recipients.map((recipient) => ({ ...recipient, status: 'pending' as const }));
      return { total: results.length, sent: results.filter((result) => result.status === 'sent').length, failed: results.filter((result) => result.status === 'failed').length, results };
    });
    try {
      for (let offset = 0; offset < targets.length; offset += 50) {
        const targetBatch = targets.slice(offset, offset + 50);
        const started = await api.post<Batch>(`/zalo-personal/accounts/${selectedAccountId}/bulk-send`, { recipients: targetBatch, content: messageContent });
        let batch = started;
        const mergeBatch = (nextBatch: Batch) => setProgress((current) => {
          const results = [...current.results];
          nextBatch.results.forEach((result) => {
            const index = results.findIndex((item) => item.userId === result.userId);
            if (index >= 0) results[index] = result;
          });
          return { total: results.length, sent: results.filter((result) => result.status === 'sent').length, failed: results.filter((result) => result.status === 'failed').length, results };
        });
        mergeBatch(batch);
        while (batch.status === 'running') {
          await sleep(1500);
          batch = await api.get<Batch>(`/zalo-personal/accounts/${selectedAccountId}/bulk-send/${started.id}`);
          mergeBatch(batch);
        }
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Lượt gửi bị gián đoạn';
      setError(message);
      setProgress((current) => {
        const failedIds = new Set(targets.map((target) => target.userId));
        const results = current.results.map((result) => failedIds.has(result.userId) && result.status === 'pending' ? { ...result, status: 'failed' as const, error: message } : result);
        return { ...current, results, sent: results.filter((result) => result.status === 'sent').length, failed: results.filter((result) => result.status === 'failed').length };
      });
    }
    finally { setSending(false); }
  };

  const sendBulk = (event: React.FormEvent) => {
    event.preventDefault();
    void sendRecipients(recipients);
  };
  const retryFailed = (userId?: string) => {
    const targets = progress.results.filter((result) => result.status === 'failed' && (!userId || result.userId === userId)).map(({ userId: id, displayName }) => ({ userId: id, displayName }));
    void sendRecipients(targets, true);
  };

  const connectedAccounts = accounts.filter((account) => account.status === 'connected');
  const completed = progress.sent + progress.failed;
  const visibleResults = progress.results.filter((result) => resultFilter === 'all' || result.status === resultFilter);
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <Topbar title="Gửi tin nhắn theo danh sách" />
    <main className="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-6 xl:p-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Chiến dịch Zalo</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Gửi tin theo danh sách</h1><p className="mt-1 text-sm text-muted-foreground">Gửi tới thành viên đã quét và theo dõi kết quả từng người nhận.</p></div>
          <div className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">Tối đa 200 người · giãn cách 1,5 giây</div>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <form onSubmit={sendBulk} className="min-w-0 space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-3 border-b pb-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Send className="h-5 w-5" /></span><div><h2 className="font-semibold">Soạn tin nhắn</h2><p className="mt-1 text-sm text-muted-foreground">Chọn tài khoản gửi, tải danh sách CSV và nhập nội dung.</p></div></div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block min-w-0 space-y-2 text-sm"><span className="font-medium">Tài khoản Zalo gửi</span><select className="h-10 w-full rounded-lg border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value={accountId} onChange={(event) => setAccountId(event.target.value)} required disabled={sending}>
                <option value="">Chọn tài khoản đã kết nối</option>{connectedAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>{connectedAccounts.length === 0 && <span className="block text-xs text-amber-700">Chưa có tài khoản Zalo cá nhân đang kết nối.</span>}</label>
              <div className="min-w-0 space-y-2 text-sm"><span className="font-medium">Danh sách người nhận</span><div className="flex gap-2">
                <label className={`flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${fileName ? 'border-primary/30 bg-accent/40' : 'bg-background hover:border-primary/40 hover:bg-secondary/40'} ${sending ? 'pointer-events-none opacity-60' : ''}`}>
                  <Upload className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-xs">{fileName || 'Chọn file CSV đã xuất từ Quét member group'}</span>
                  <input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; void loadFile(file); }} disabled={sending} className="sr-only" />
                </label>
                {fileName && <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" aria-label="Bỏ file CSV" title="Bỏ file CSV" disabled={sending} onClick={() => void loadFile(undefined)}><X className="h-4 w-4" /></Button>}
              </div></div>
            </div>
            {fileName && <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-accent/40 p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary"><FileSpreadsheet className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" title={fileName}>{fileName}</p><p className="mt-0.5 text-xs text-muted-foreground">{recipients.length} người nhận duy nhất đã sẵn sàng</p></div><span className="whitespace-nowrap text-sm font-semibold tabular-nums text-primary">{recipients.length}</span></div>}
            <label className="block space-y-2 text-sm"><span className="font-medium">Nội dung tin nhắn</span><Textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={5} placeholder="Nhập nội dung bạn muốn gửi…" disabled={sending} className="min-h-32 resize-y rounded-xl bg-background" /><span className="block text-right text-xs tabular-nums text-muted-foreground">{content.length} / 2000 ký tự</span></label>
            {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-xs text-muted-foreground">Chỉ gửi cho thành viên hợp lệ trong file.</p><Button type="submit" disabled={sending || !accountId || !recipients.length || !content.trim()} className="h-10 min-w-36 rounded-lg px-4">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? 'Đang gửi…' : `Gửi ${recipients.length} tin`}</Button></div>
          </form>

          <aside className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            <div><h2 className="text-sm font-semibold">Tóm tắt lượt gửi</h2><p className="mt-1 text-xs text-muted-foreground">Kiểm tra thông tin trước khi bắt đầu.</p></div>
            <div className="rounded-xl bg-secondary/70 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" />Người nhận</div><p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{recipients.length}<span className="ml-1.5 text-sm font-normal text-muted-foreground">người</span></p></div>
            <div className="space-y-3 text-sm"><div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Tài khoản</span><span className="max-w-[170px] truncate text-right font-medium" title={connectedAccounts.find((account) => account.id === accountId)?.name}>{connectedAccounts.find((account) => account.id === accountId)?.name || 'Chưa chọn'}</span></div><div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Danh sách</span><span className="max-w-[170px] truncate text-right font-medium" title={fileName}>{fileName || 'Chưa tải CSV'}</span></div><div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Nội dung</span><span className="text-right font-medium tabular-nums">{content.length}/2000</span></div></div>
            <div className="rounded-xl border border-dashed p-3 text-xs leading-5 text-muted-foreground">Tin nhắn được gửi tuần tự. Tiến độ và lỗi của từng người sẽ xuất hiện bên dưới khi bắt đầu gửi.</div>
          </aside>
        </div>

        {progress.total > 0 && <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="space-y-4 border-b p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Kết quả gửi</h2><p className="mt-1 text-sm text-muted-foreground">Trạng thái và lỗi gửi được cập nhật theo từng người.</p></div>{progress.failed > 0 && <Button variant="outline" size="sm" disabled={sending} onClick={() => retryFailed()}><RotateCcw className="h-4 w-4" />Thử lại {progress.failed} lỗi</Button>}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Tổng người nhận</p><p className="mt-1 font-semibold tabular-nums">{progress.total}</p></div><div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2"><p className="text-xs text-emerald-700">Đã gửi</p><p className="mt-1 font-semibold tabular-nums text-emerald-800">{progress.sent}</p></div><div className="rounded-lg border border-red-100 bg-red-50/70 px-3 py-2"><p className="text-xs text-red-700">Gửi lỗi</p><p className="mt-1 font-semibold tabular-nums text-red-800">{progress.failed}</p></div><div className="rounded-lg border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Còn lại</p><p className="mt-1 font-semibold tabular-nums">{progress.total - completed}</p></div></div>
            <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.round(completed / progress.total * 100)}%` }} /></div><span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round(completed / progress.total * 100)}%</span></div>
            <div className="flex gap-1 overflow-x-auto border-b">{([['all', `Tất cả (${progress.total})`], ['failed', `Gửi lỗi (${progress.failed})`], ['sent', `Đã gửi (${progress.sent})`], ['pending', `Đang chờ (${progress.total - completed})`]] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setResultFilter(key)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors ${resultFilter === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</button>)}</div>
          </div>
          <div className="max-h-[460px] overflow-auto">
            <Table className="min-w-[680px]">
              <TableHeader><TableRow><TableHead className="w-[36%]">Người nhận</TableHead><TableHead className="w-32">Trạng thái</TableHead><TableHead>Lý do / lỗi</TableHead><TableHead className="w-32 text-right">Thao tác</TableHead></TableRow></TableHeader>
              <TableBody>{visibleResults.map((result) => <TableRow key={result.userId}>
                <TableCell><div className="flex min-w-0 items-center gap-2.5"><Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{initials(result.displayName || result.userId)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-medium" title={result.displayName || result.userId}>{result.displayName || 'Người dùng Zalo'}</p><p className="truncate text-xs text-muted-foreground" title={result.userId}>{result.userId}</p></div></div></TableCell>
                <TableCell><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${result.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : result.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-secondary text-muted-foreground'}`}>{result.status === 'sent' ? <><CheckCircle2 className="h-3.5 w-3.5" />Đã gửi</> : result.status === 'failed' ? <><AlertCircle className="h-3.5 w-3.5" />Gửi lỗi</> : <><Clock3 className="h-3.5 w-3.5" />Đang chờ</>}</span></TableCell>
                <TableCell className="max-w-[420px] text-sm"><span className={`line-clamp-2 break-words ${result.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`} title={result.error}>{result.status === 'failed' ? result.error || 'Không gửi được tin nhắn' : result.status === 'sent' ? 'Tin nhắn đã được gửi thành công.' : 'Đang chờ gửi.'}</span></TableCell>
                <TableCell className="text-right">{result.status === 'failed' && <Button variant="outline" size="sm" className="h-8" disabled={sending} onClick={() => retryFailed(result.userId)}><RotateCcw className="h-3.5 w-3.5" />Thử lại</Button>}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
            {visibleResults.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Không có người nhận trong trạng thái này.</div>}
          </div>
        </section>}
      </div>
    </main>
  </div>;
}
