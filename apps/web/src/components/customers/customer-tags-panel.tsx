'use client';

import { FormEvent, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAddCustomerTag, useRemoveCustomerTag } from '@/hooks/use-customers';
import { useCreateTag, useTags } from '@/hooks/use-tags';
import { Tag } from '@/lib/types';

const TAG_COLORS = ['#2BA58A', '#4386E8', '#F59E0B', '#E5484D', '#8B5CF6', '#64748B'];

export function CustomerTagsPanel({
  customerId,
  tags,
}: {
  customerId: string;
  tags: { tag: Tag }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [error, setError] = useState('');
  const { data: allTags } = useTags();
  const addTag = useAddCustomerTag(customerId);
  const removeTag = useRemoveCustomerTag(customerId);
  const createTag = useCreateTag();
  const existingIds = new Set(tags.map((t) => t.tag.id));
  const available = allTags?.filter((t) => !existingIds.has(t.id)) ?? [];

  const createAndAdd = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError('');
    try {
      const tag = await createTag.mutateAsync({ name: trimmed, color });
      await addTag.mutateAsync(tag.id);
      setName('');
      setColor(TAG_COLORS[0]);
      setCreateOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tạo được nhãn');
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(({ tag }) => (
        <Badge key={tag.id} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
          {tag.name}
          <button onClick={() => removeTag.mutate(tag.id)} className="ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {tags.length === 0 && <span className="text-xs text-muted-foreground">Chưa có nhãn</span>}
      {available.length > 0 && (
        <Select onValueChange={(value) => addTag.mutate(value)}>
          <SelectTrigger className="h-6 w-7 border-dashed p-0 [&>svg]:hidden">
            <Plus className="mx-auto h-3.5 w-3.5" />
          </SelectTrigger>
          <SelectContent>
            {available.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setCreateOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Tạo nhãn
      </Button>
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setError(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tạo nhãn mới</DialogTitle>
            <DialogDescription>Nhãn sẽ được tạo và gắn ngay cho khách hàng trong cuộc trò chuyện này.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createAndAdd} className="space-y-4">
            <div className="space-y-2"><label htmlFor="new-customer-tag" className="text-sm font-medium">Tên nhãn</label><Input id="new-customer-tag" autoFocus maxLength={40} placeholder="Ví dụ: Cần gọi lại" value={name} onChange={(event) => setName(event.target.value)} /></div>
            <fieldset className="space-y-2"><legend className="text-sm font-medium">Màu nhãn</legend><div className="flex items-center gap-2">{TAG_COLORS.map((option) => <button key={option} type="button" aria-label={`Chọn màu ${option}`} aria-pressed={color === option} onClick={() => setColor(option)} className={`h-7 w-7 rounded-full border-2 transition-transform ${color === option ? 'scale-110 border-foreground' : 'border-transparent'}`} style={{ backgroundColor: option }} />)}</div></fieldset>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button><Button type="submit" disabled={!name.trim() || createTag.isPending || addTag.isPending}>{createTag.isPending || addTag.isPending ? 'Đang lưu…' : 'Tạo và gắn nhãn'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
