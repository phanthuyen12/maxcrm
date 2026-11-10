'use client';

import * as React from 'react';
import { Bot, ChevronDown, Database, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AiBotEditor } from '@/components/ai-bot/ai-bot-editor';
import { AiBotChannel } from '@/lib/types';

export function AiBotChannelCard({ channel }: { channel: AiBotChannel }) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{channel.name}</p>
            <p className="text-xs text-muted-foreground">{channel.provider}</p>
          </div>
        </div>
        <Badge variant="outline">{channel.bots.length} bot</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {channel.bots.length === 0 && (
          <p className="rounded-lg bg-secondary/60 px-3 py-2.5 text-center text-xs text-muted-foreground">
            Chưa có bot nào cho kênh này. Tạo bot đầu tiên để bắt đầu.
          </p>
        )}

        <ul className="space-y-2">
          {channel.bots.map((bot) => (
            <li key={bot.id} className="rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setOpenId(openId === bot.id ? null : bot.id)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-secondary/50"
              >
                <span className="flex-1 truncate text-sm font-medium text-foreground">{bot.name}</span>
                <span className="text-xs text-muted-foreground">{bot.provider}</span>
                {!!bot.documentCount && (
                  <span className="flex items-center gap-0.5 text-xs text-primary">
                    <Database className="h-3 w-3" /> {bot.documentCount}
                  </span>
                )}
                {bot.isEnabled ? <Badge variant="success">Đang bật</Badge> : <Badge variant="outline">Đang tắt</Badge>}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openId === bot.id ? 'rotate-180' : ''}`} />
              </button>
              {openId === bot.id && (
                <div className="border-t border-border p-3">
                  <AiBotEditor zaloOAId={channel.id} initialBot={bot} onDeleted={() => setOpenId(null)} />
                </div>
              )}
            </li>
          ))}
        </ul>

        {openId === 'new' ? (
          <AiBotEditor
            zaloOAId={channel.id}
            initialBot={null}
            onDeleted={() => setOpenId(null)}
            onCreated={(botId) => setOpenId(botId)}
          />
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setOpenId('new')}>
            <Plus className="h-3.5 w-3.5" /> Tạo bot mới
          </Button>
        )}

        <Separator />
        <p className="text-center text-[11px] text-muted-foreground">
          Khi nhân viên đã nhận xử lý một hội thoại, trợ lý AI sẽ tự động im lặng ở hội thoại đó. Mỗi kênh chỉ 1 bot được bật cùng lúc.
        </p>
      </CardContent>
    </Card>
  );
}
