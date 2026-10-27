'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(4, 'Mật khẩu tối thiểu 4 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

function BrandLogo({ mobile = false }: { mobile?: boolean }) {
  return (
    <a href="/login" aria-label="MAXCRM - Trang đăng nhập" className={`inline-flex w-fit rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#19836B] ${mobile ? 'mb-10 md:hidden' : ''}`}>
      <Image src="/maxcrm-logo.png" alt="MAXCRM" width={2172} height={724} priority className={mobile ? 'h-auto w-[152px]' : 'h-auto w-[176px]'} />
    </a>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [authError, setAuthError] = React.useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'nhanvien1@zalocrm.vn', password: '123456' },
  });

  const onSubmit = async (data: LoginForm) => {
    setAuthError('');
    try {
      await api.post('/auth/login', data);
      toast.success('Đăng nhập thành công');
      router.push('/overview');
      router.refresh();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Đăng nhập thất bại';
      setAuthError(message);
      toast.error(message);
    }
  };

  return (
    <main className="grid min-h-[100dvh] bg-white md:grid-cols-[54%_46%]">
      <section className="m-0 hidden min-h-[100dvh] flex-col rounded-none bg-[#EFF7F3] px-8 py-8 text-[#173F35] md:m-5 md:flex md:min-h-[calc(100dvh-40px)] md:rounded-[24px] lg:m-6 lg:min-h-[calc(100dvh-48px)] lg:px-10 lg:py-10">
        <BrandLogo />

        <div className="mx-auto my-auto w-full max-w-[560px] py-8 lg:py-10">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[#41695D] lg:text-xs">KHÔNG GIAN LÀM VIỆC TẬP TRUNG</p>
          <h1 className="mt-4 text-[34px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#173F35] lg:text-[46px]">Mọi kết nối.<br />Một không gian.</h1>
          <p className="mt-4 max-w-[480px] text-[15px] leading-6 text-[#526C62]">Quản lý hội thoại và chăm sóc khách hàng cùng đội ngũ của bạn.</p>

          <div className="mt-7 overflow-hidden rounded-xl border border-[#D9E7E0] bg-white shadow-[0_10px_28px_-22px_rgba(21,62,53,0.32)] lg:mt-8">
            <div className="flex h-10 items-center gap-1.5 border-b border-[#E8EEEB] bg-[#FBFCFB] px-4" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-[#D7E4DE]" /><span className="h-2 w-2 rounded-full bg-[#D7E4DE]" /><span className="h-2 w-2 rounded-full bg-[#D7E4DE]" />
              <span className="ml-2 text-[10px] font-medium text-[#8A9A93]">Hộp thư</span>
            </div>
            <div className="grid min-h-[220px] grid-cols-[38%_62%] lg:min-h-[280px]">
              <div className="border-r border-[#E8EEEB] bg-[#FCFDFC]">
                <div className="border-b border-[#EEF2F0] px-3 py-2.5 text-[11px] font-semibold text-[#536C61] lg:px-4 lg:text-xs">Hội thoại <span className="float-right rounded-full bg-[#E5F3EE] px-1.5 text-[#19836B]">3</span></div>
                {[
                  ['AL', 'An Linh', 'Cho mình xin thông tin…', true],
                  ['MK', 'Minh Khoa', 'Cảm ơn bạn nhé!', false],
                  ['TH', 'Thu Hà', 'Mình đã nhận được…', false],
                ].map(([initials, name, preview, active]) => (
                  <div key={String(initials)} className={`flex items-start gap-2 px-2.5 py-3 lg:gap-2.5 lg:px-3.5 lg:py-3.5 ${active ? 'bg-[#EEF7F3]' : 'border-b border-[#F0F3F1]'}`}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DDEDE6] text-[10px] font-semibold text-[#376C5B] lg:h-8 lg:w-8 lg:text-[11px]">{initials}</span>
                    <span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-[#344A41] lg:text-xs">{name}</span><span className="mt-0.5 block truncate text-[10px] text-[#687D73] lg:text-[11px]">{preview}</span></span>
                  </div>
                ))}
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2.5 border-b border-[#E8EEEB] px-3 py-2.5 lg:px-4 lg:py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DDEDE6] text-[10px] font-semibold text-[#376C5B]">AL</span>
                  <div><p className="text-xs font-semibold text-[#344A41]">An Linh</p><p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#60796E]"><span className="h-1.5 w-1.5 rounded-full bg-[#48A77F]" /> Đang hoạt động</p></div>
                </div>
                <div className="flex flex-1 flex-col justify-end gap-3 bg-[#FAFCFB] p-3 lg:gap-4 lg:p-4">
                  <p className="w-fit max-w-[88%] rounded-xl rounded-bl-sm bg-white px-3 py-2.5 text-[11px] leading-[1.5] text-[#465C52] ring-1 ring-[#E8EEEB] lg:px-4 lg:text-xs">Chào bạn, mình muốn tìm hiểu thêm về dịch vụ.</p>
                  <p className="ml-auto w-fit max-w-[88%] rounded-xl rounded-br-sm bg-[#E4F3EC] px-3 py-2.5 text-[11px] leading-[1.5] text-[#315D4E] lg:px-4 lg:text-xs">Mình gửi bạn thông tin tham khảo nhé.</p>
                  <span className="text-right text-[10px] text-[#71847B]">10:42</span>
                </div>
                <div className="border-t border-[#E8EEEB] px-3 py-2"><div className="rounded-md border border-[#E7ECE9] px-2.5 py-1.5 text-[9px] text-[#A0ACA6]">Nhập tin nhắn…</div></div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-right text-[10px] text-[#75877F]">Minh họa giao diện</p>
        </div>

        <p className="ml-1 text-xs text-[#73877E]">MAXCRM · Nền tảng quản lý khách hàng</p>
      </section>

      <section className="flex min-h-[100dvh] items-center justify-center px-6 py-8 sm:px-10 md:px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-[400px]">
          <BrandLogo mobile />

          <header>
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[#172B25] sm:text-[32px]">Đăng nhập</h2>
            <p className="mt-2 text-sm leading-6 text-[#66746F]">Chào mừng bạn quay lại MAXCRM.</p>
          </header>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#263A34]">Email</Label>
              <Input id="email" type="email" autoComplete="username" placeholder="Nhập email của bạn" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} className="h-12 rounded-[10px] border-[#D8E2DE] bg-white px-3.5 text-base placeholder:text-[#98A59F] focus-visible:border-[#19836B] focus-visible:ring-2 focus-visible:ring-[#19836B]/20 sm:text-sm" {...register('email')} />
              {errors.email && <p id="email-error" role="alert" className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#263A34]">Mật khẩu</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} className="h-12 rounded-[10px] border-[#D8E2DE] bg-white px-3.5 pr-12 text-base placeholder:text-[#98A59F] focus-visible:border-[#19836B] focus-visible:ring-2 focus-visible:ring-[#19836B]/20 sm:text-sm" {...register('password')} />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 inline-flex min-h-10 min-w-10 items-center justify-center rounded-r-[10px] text-[#718079] hover:text-[#183C33] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#19836B]" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
              {errors.password && <p id="password-error" role="alert" className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {authError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700">{authError}</p>}

            <Button type="submit" className="mt-1 h-12 w-full rounded-[10px] bg-[#16846D] text-[15px] font-semibold text-white hover:bg-[#126F5B] focus-visible:ring-2 focus-visible:ring-[#16846D]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đăng nhập…</> : 'Đăng nhập'}
            </Button>
          </form>

          {process.env.NODE_ENV === 'development' && (
            <details className="group mt-6 border-t border-[#E7ECE9] pt-5 text-sm text-[#526C62]">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-sm font-medium text-[#315D50] marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19836B] [&::-webkit-details-marker]:hidden">Trải nghiệm với tài khoản dùng thử<ChevronDown className="h-4 w-4 shrink-0 text-[#668077] transition-transform duration-150 group-open:rotate-180" /></summary>
              <div className="mt-3 rounded-lg bg-[#F2F7F4] px-4 py-3 leading-6">
                <p>Email: <span className="font-medium text-[#29483D]">nhanvien1@zalocrm.vn</span></p>
                <p>Mật khẩu: <span className="font-medium text-[#29483D]">123456</span></p>
              </div>
            </details>
          )}
        </div>
      </section>
    </main>
  );
}
