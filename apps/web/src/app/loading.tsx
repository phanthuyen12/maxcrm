import Image from 'next/image';

export default function Loading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#F7FAF8] px-6">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <Image src="/maxcrm-logo.png" alt="MAXCRM" width={2172} height={724} priority className="h-auto w-[164px] animate-pulse" />
        <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-[#DDEBE5]">
          <div className="h-full w-1/2 animate-[loading-bar_1.4s_ease-in-out_infinite] rounded-full bg-[#16846D]" />
        </div>
        <p className="mt-4 text-sm font-medium text-[#315D50]">Đang tải không gian làm việc</p>
        <p className="mt-1 text-xs text-[#71847B]">Vui lòng chờ trong giây lát</p>
      </div>
    </main>
  );
}
