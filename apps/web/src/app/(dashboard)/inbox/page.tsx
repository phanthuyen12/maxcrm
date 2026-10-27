'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Topbar } from '@/components/layout/topbar';
import { ConversationList } from '@/components/inbox/conversation-list';
import { ChatPanel } from '@/components/inbox/chat-panel';
import { CustomerPanel } from '@/components/inbox/customer-panel';
import { Button } from '@/components/ui/button';
import { UserRound } from 'lucide-react';

function InboxContent() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = React.useState<string | null>(searchParams.get('conversationId'));
  const [showCustomer, setShowCustomer] = React.useState(false);
  const [profileCollapsed, setProfileCollapsed] = React.useState(false);

  React.useEffect(() => {
    const conversationId = searchParams.get('conversationId');
    if (conversationId) setSelectedId(conversationId);
  }, [searchParams]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar title="Hộp thư Zalo" />
      <div className="flex min-h-0 flex-1 overflow-hidden border-t bg-card">
        <div className={`min-h-0 w-full shrink-0 md:w-[300px] lg:w-[320px] ${selectedId ? 'hidden md:flex' : 'flex'} flex-col`}>
          <ConversationList selectedId={selectedId} onSelect={(id) => { setSelectedId(id); }} />
        </div>
        <div className={`relative min-h-0 min-w-0 flex-1 ${selectedId ? 'flex' : 'hidden md:flex'} flex-col`}>
          <ChatPanel conversationId={selectedId} onBack={() => { setSelectedId(null); setShowCustomer(false); }} onShowCustomer={() => { if (window.matchMedia('(min-width: 1280px)').matches) setProfileCollapsed((open) => !open); else setShowCustomer(true); }} customerOpen={!profileCollapsed} />
        </div>
        <div className={`${profileCollapsed ? 'hidden' : 'hidden xl:flex'} min-h-0 w-[290px] shrink-0`}>
          <CustomerPanel conversationId={selectedId} />
        </div>
        {showCustomer && selectedId && <div className="fixed inset-0 z-40 xl:hidden">
          <button aria-label="Đóng hồ sơ khách hàng" className="absolute inset-0 bg-black/30" onClick={() => setShowCustomer(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(360px,90vw)] flex-col bg-card shadow-xl"><div className="flex h-12 items-center justify-between border-b px-4"><span className="font-semibold">Hồ sơ khách hàng</span><Button variant="ghost" size="sm" onClick={() => setShowCustomer(false)}>Đóng</Button></div><CustomerPanel conversationId={selectedId} /></div>
        </div>}
      </div>
    </div>
  );
}

export default function InboxPage() {
  return <React.Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Đang tải hộp thư…</div>}><InboxContent /></React.Suspense>;
}
