'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Plus } from 'lucide-react';
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
import { useCreateCustomer, useCheckDuplicate } from '@/hooks/use-customers';
import { useSources } from '@/hooks/use-catalog';

const schema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên khách hàng'),
  phone: z.string().optional(),
  source: z.string().default('Zalo OA'),
});

type FormValues = z.infer<typeof schema>;

const FALLBACK_SOURCES = ['Zalo OA', 'Facebook', 'Giới thiệu', 'Website', 'Hotline'];

export function CreateCustomerDialog() {
  const [open, setOpen] = React.useState(false);
  const createCustomer = useCreateCustomer();
  const { data: sources } = useSources();
  const sourceNames = sources && sources.length > 0 ? sources.map((s) => s.name) : FALLBACK_SOURCES;
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', source: 'Zalo OA' },
  });

  const phone = watch('phone');
  const { data: duplicateData } = useCheckDuplicate(phone && phone.length >= 9 ? phone : undefined);
  const hasDuplicate = (duplicateData?.duplicates.length ?? 0) > 0;

  const onSubmit = async (values: FormValues) => {
    try {
      await createCustomer.mutateAsync(values);
      toast.success('Đã tạo khách hàng mới');
      reset();
      setOpen(false);
    } catch {
      toast.error('Tạo khách hàng thất bại');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Thêm khách hàng
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm khách hàng mới</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Tên khách hàng *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input id="phone" {...register('phone')} />
            {hasDuplicate && (
              <p className="flex items-center gap-1 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                Số điện thoại này đã tồn tại: {duplicateData?.duplicates.map((d) => d.name).join(', ')}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Nguồn</Label>
            <Select defaultValue="Zalo OA" onValueChange={(v) => setValue('source', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceNames.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Tạo khách hàng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
