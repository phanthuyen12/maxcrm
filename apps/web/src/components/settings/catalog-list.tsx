'use client';

import * as React from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export interface CatalogItem {
  id: string;
  name: string;
  color?: string;
}

/**
 * Danh sách quản trị dùng chung cho các danh mục đơn giản (nhãn, nguồn khách hàng,
 * danh mục mẫu tin nhắn): thêm/sửa/xoá 1 field `name` (và `color` nếu hasColor).
 */
export function CatalogList({
  items,
  isLoading,
  hasColor = false,
  placeholder = 'Thêm mới...',
  onCreate,
  onUpdate,
  onDelete,
}: {
  items: CatalogItem[] | undefined;
  isLoading: boolean;
  hasColor?: boolean;
  placeholder?: string;
  onCreate: (name: string, color?: string) => Promise<unknown>;
  onUpdate: (id: string, name: string, color?: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [newName, setNewName] = React.useState('');
  const [newColor, setNewColor] = React.useState('#0068FF');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreate(name, hasColor ? newColor : undefined);
      setNewName('');
      toast.success('Đã thêm');
    } catch {
      toast.error('Thêm thất bại (có thể đã tồn tại tên này)');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    try {
      await onUpdate(editingId, editingName.trim());
      setEditingId(null);
      toast.success('Đã lưu');
    } catch {
      toast.error('Lưu thất bại');
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    if (!window.confirm(`Xoá "${item.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await onDelete(item.id);
      toast.success('Đã xoá');
    } catch {
      toast.error('Xoá thất bại (có thể đang được sử dụng)');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items?.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
          {hasColor && (
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border"
              style={{ backgroundColor: item.color }}
            />
          )}
          {editingId === item.id ? (
            <>
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="h-7 flex-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm">{item.name}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(item)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ))}
      {(items?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground">Chưa có danh mục nào.</p>}

      <div className="flex items-center gap-2 pt-1">
        {hasColor && (
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-9 w-9 shrink-0 cursor-pointer rounded-md border bg-transparent"
          />
        )}
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={placeholder}
          className="h-9 flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
          <Plus className="h-3.5 w-3.5" /> Thêm
        </Button>
      </div>
    </div>
  );
}
