'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTemplate } from '@/hooks/use-templates';
import { useTemplateCategories } from '@/hooks/use-catalog';

export function CreateTemplateDialog() {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [content, setContent] = React.useState('');
  const createTemplate = useCreateTemplate();
  const { data: categories } = useTemplateCategories();

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    try {
      await createTemplate.mutateAsync({ title: title.trim(), content: content.trim(), category: category.trim() || undefined });
      toast.success('Đã tạo mẫu tin nhắn');
      setOpen(false);
      setTitle('');
      setCategory('');
      setContent('');
    } catch {
      toast.error('Tạo mẫu tin nhắn thất bại');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Thêm mẫu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm mẫu trả lời nhanh</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tên mẫu *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Chào hỏi khách mới" />
          </div>
          <div className="space-y-1.5">
            <Label>Danh mục</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn danh mục (quản lý tại Cài đặt > Danh mục)" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nội dung *</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={createTemplate.isPending}>
            Lưu mẫu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
