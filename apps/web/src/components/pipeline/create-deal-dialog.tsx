'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomers } from '@/hooks/use-customers';
import { useCreateDeal } from '@/hooks/use-pipeline';

export function CreateDealDialog() {
  const [open, setOpen] = React.useState(false);
  const [customerId, setCustomerId] = React.useState('');
  const [value, setValue] = React.useState('');
  const { data } = useCustomers({ pageSize: 100 });
  const createDeal = useCreateDeal();

  const handleSubmit = async () => {
    if (!customerId || !value) return;
    try {
      await createDeal.mutateAsync({ customerId, value: parseInt(value, 10) });
      toast.success('Đã tạo deal mới');
      setOpen(false);
      setCustomerId('');
      setValue('');
    } catch {
      toast.error('Tạo deal thất bại');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Thêm deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm deal mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Khách hàng</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn khách hàng" />
              </SelectTrigger>
              <SelectContent>
                {data?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.phone ? `· ${c.phone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Giá trị (VNĐ)</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="2000000" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={!customerId || !value || createDeal.isPending}>
            Tạo deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
