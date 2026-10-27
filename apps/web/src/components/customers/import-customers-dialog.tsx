'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';

interface ImportResult {
  success: number;
  duplicated: number;
  failed: number;
  total: number;
  errors: string[];
}

export function ImportCustomersDialog() {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const queryClient = useQueryClient();

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<ImportResult>('/customers/import', formData);
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Nhập thành công ${res.success}/${res.total} khách hàng`);
    } catch {
      toast.error('Nhập dữ liệu thất bại. Vui lòng kiểm tra lại file CSV.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setFile(null);
          setResult(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nhập danh sách khách hàng từ CSV</DialogTitle>
          <DialogDescription>
            File CSV cần có cột <code>ten</code> (bắt buộc) và <code>sdt</code>, <code>nguon</code> (tuỳ chọn).
          </DialogDescription>
        </DialogHeader>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded-md border border-input p-2 text-sm"
        />
        {result && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p>Tổng dòng: {result.total}</p>
            <p className="text-success">Thành công: {result.success}</p>
            <p className="text-warning">Trùng lặp (đã bỏ qua): {result.duplicated}</p>
            <p className="text-destructive">Lỗi: {result.failed}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Đóng
          </Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Nhập dữ liệu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
