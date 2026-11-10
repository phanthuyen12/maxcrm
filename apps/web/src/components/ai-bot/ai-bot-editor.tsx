'use client';

import * as React from 'react';
import { Database, FileSliders, ListPlus, Loader2, Send, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AiBotDocumentsPanel } from '@/components/ai-bot/ai-bot-documents-panel';
import { useCreateAiBot, useDeleteAiBot, useOpenRouterModels, useTestAiBot, useUpdateAiBot } from '@/hooks/use-ai-bot';
import { AiBotConfig, AiBotRule, AiProvider } from '@/lib/types';
import { ApiError } from '@/lib/api';

const PROVIDER_LABELS: Record<AiProvider, string> = {
  ANTHROPIC: 'Anthropic Claude',
  OPENAI: 'OpenAI',
  GOOGLE: 'Google Gemini',
  DEEPSEEK: 'DeepSeek',
  OPENROUTER: 'OpenRouter (nhiều hãng AI)',
};

const MODEL_OPTIONS: Record<Exclude<AiProvider, 'OPENROUTER'>, { value: string; label: string }[]> = {
  ANTHROPIC: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — nhanh, rẻ' },
    { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 — khuyên dùng' },
    { value: 'claude-opus-5', label: 'Claude Opus 5 — chất lượng cao nhất' },
  ],
  OPENAI: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini — nhanh, rẻ' },
    { value: 'gpt-4o', label: 'GPT-4o — chất lượng cao' },
  ],
  GOOGLE: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — nhanh, rẻ' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — chất lượng cao' },
  ],
  DEEPSEEK: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat — nhanh, rẻ' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner — suy luận sâu' },
  ],
};

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function AiBotEditor({
  zaloOAId,
  initialBot,
  onDeleted,
  onCreated,
}: {
  zaloOAId: string;
  initialBot: AiBotConfig | null;
  onDeleted: () => void;
  onCreated?: (botId: string) => void;
}) {
  const [bot, setBot] = React.useState<AiBotConfig | null>(initialBot);
  const [name, setName] = React.useState(initialBot?.name ?? 'Bot mới');
  const [isEnabled, setIsEnabled] = React.useState(initialBot?.isEnabled ?? false);
  const [provider, setProvider] = React.useState<AiProvider>(initialBot?.provider ?? 'ANTHROPIC');
  const [apiKey, setApiKey] = React.useState(initialBot?.apiKey ?? '');
  const [model, setModel] = React.useState(
    initialBot?.model ?? (initialBot?.provider && initialBot.provider !== 'OPENROUTER' ? MODEL_OPTIONS[initialBot.provider][0].value : MODEL_OPTIONS.ANTHROPIC[0].value),
  );
  const [systemPrompt, setSystemPrompt] = React.useState(initialBot?.systemPrompt ?? '');
  const [rules, setRules] = React.useState<AiBotRule[]>(initialBot?.rules ?? []);
  const [knowledgeBase, setKnowledgeBase] = React.useState(initialBot?.knowledgeBase ?? '');
  const [testMessage, setTestMessage] = React.useState('Chào shop, sản phẩm này giá bao nhiêu?');
  const [chatLog, setChatLog] = React.useState<ChatTurn[]>([]);

  const create = useCreateAiBot();
  const update = useUpdateAiBot();
  const remove = useDeleteAiBot();
  const test = useTestAiBot();
  const { data: openRouterModels, isLoading: openRouterModelsLoading } = useOpenRouterModels();

  const saving = create.isPending || update.isPending;

  const handleProviderChange = (next: AiProvider) => {
    setProvider(next);
    setModel(next === 'OPENROUTER' ? '' : MODEL_OPTIONS[next][0].value);
  };

  const buildDraft = () => ({
    name,
    isEnabled,
    provider,
    apiKey,
    model,
    systemPrompt,
    rules: rules.filter((r) => r.content.trim()),
    knowledgeBase: knowledgeBase || undefined,
  });

  const addRule = () => setRules((list) => [...list, { label: '', content: '' }]);
  const updateRule = (index: number, patch: Partial<AiBotRule>) =>
    setRules((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const removeRule = (index: number) => setRules((list) => list.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!apiKey.trim() || !systemPrompt.trim()) {
      toast.error('Vui lòng điền API key và hướng dẫn trả lời');
      return;
    }
    if (!bot) {
      create.mutate({ zaloOAId, ...buildDraft() }, {
        onSuccess: (res) => {
          setBot(res);
          toast.success('Đã tạo bot — giờ bạn có thể upload tài liệu hoặc chat thử');
          onCreated?.(res.id);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Tạo bot thất bại'),
      });
    } else {
      update.mutate({ botId: bot.id, ...buildDraft() }, {
        onSuccess: (res) => {
          setBot(res);
          toast.success('Đã cập nhật bot');
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Cập nhật thất bại'),
      });
    }
  };

  const handleDelete = () => {
    if (!bot) {
      onDeleted();
      return;
    }
    if (!window.confirm(`Xoá bot "${bot.name}"? Toàn bộ tài liệu đã upload cho bot này cũng sẽ bị xoá.`)) return;
    remove.mutate(bot.id, {
      onSuccess: () => {
        toast.success('Đã xoá bot');
        onDeleted();
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Xoá bot thất bại'),
    });
  };

  const handleTest = () => {
    if (!apiKey.trim() || !systemPrompt.trim() || !testMessage.trim()) {
      toast.error('Vui lòng điền API key, hướng dẫn trả lời và câu hỏi thử');
      return;
    }
    const message = testMessage.trim();
    const history = chatLog;
    setChatLog((log) => [...log, { role: 'user', content: message }]);
    setTestMessage('');
    test.mutate({ ...buildDraft(), message, botId: bot?.id, history }, {
      onSuccess: (res) => setChatLog((log) => [...log, { role: 'assistant', content: res.reply }]),
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Chat thử thất bại — kiểm tra lại API key hoặc model');
        setChatLog((log) => log.slice(0, -1));
      },
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên bot, ví dụ: Bot bán hàng"
          className="h-8 max-w-xs border-none bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{isEnabled ? 'Đang bật' : 'Đang tắt'}</span>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="gap-1.5">
            <FileSliders className="h-3.5 w-3.5" /> Cấu hình
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <Database className="h-3.5 w-3.5" /> Tài liệu
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Chat thử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nhà cung cấp AI</Label>
              <Select value={provider} onValueChange={(v) => handleProviderChange(v as AiProvider)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              {provider === 'OPENROUTER' ? (
                <>
                  <Input
                    list="openrouter-models"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={openRouterModelsLoading ? 'Đang tải danh sách model...' : 'Gõ để tìm model, ví dụ: openai/gpt-4o-mini'}
                  />
                  <datalist id="openrouter-models">
                    {openRouterModels?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </datalist>
                </>
              ) : (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS[provider].map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input type="password" placeholder="Dán API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Hướng dẫn trả lời</Label>
            <Textarea rows={4} placeholder="Nhập hướng dẫn trả lời" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Ví dụ: Bạn là nhân viên tư vấn của shop ABC, trả lời ngắn gọn, thân thiện, luôn mời khách để lại số điện thoại nếu khách quan tâm sản phẩm.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Quy tắc nhỏ (không bắt buộc)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addRule}>
                <ListPlus className="h-3.5 w-3.5" /> Thêm quy tắc
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tách các quy tắc riêng (giọng điệu, chống bịa thông tin, ngôn ngữ, điều kiện chuyển người thật...) thành
              từng mục nhỏ thay vì gộp vào 1 đoạn dài — dễ sửa/xoá từng cái mà không ảnh hưởng phần còn lại.
            </p>
            {rules.length > 0 && (
              <div className="space-y-2">
                {rules.map((rule, index) => (
                  <div key={index} className="space-y-1.5 rounded-lg border border-border bg-background p-2.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={rule.label}
                        onChange={(e) => updateRule(index, { label: e.target.value })}
                        placeholder="Tên quy tắc, ví dụ: LANGUAGE RULE"
                        className="h-8 flex-1 text-sm font-medium"
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeRule(index)} title="Xoá quy tắc này">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={rule.content}
                      onChange={(e) => updateRule(index, { content: e.target.value })}
                      placeholder="Nội dung quy tắc này"
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Thông tin / FAQ ngắn (không bắt buộc)</Label>
            <Textarea rows={3} placeholder="Nhập FAQ ngắn gọn" value={knowledgeBase} onChange={(e) => setKnowledgeBase(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Dán giá, chính sách đổi trả, câu hỏi thường gặp ngắn gọn... Nội dung này luôn được gửi cho AI ở mọi tin nhắn — tài liệu dài nên upload ở tab Tài liệu để tiết kiệm token.
            </p>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              {bot ? 'Cập nhật cấu hình' : 'Tạo bot'}
            </Button>
            <Button variant="outline" disabled={remove.isPending} onClick={handleDelete} title="Xoá bot">
              {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
              <span className="text-destructive">Xoá</span>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          {bot ? (
            <AiBotDocumentsPanel botId={bot.id} />
          ) : (
            <p className="rounded-lg bg-secondary px-3 py-2.5 text-center text-xs text-muted-foreground">
              Bấm "Tạo bot" ở tab Cấu hình trước, sau đó quay lại đây để upload tài liệu.
            </p>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-2.5">
          <div className="max-h-64 min-h-[5rem] space-y-2 overflow-y-auto rounded-lg border border-border bg-background/60 p-2.5">
            {chatLog.length === 0 ? (
              <p className="flex h-full items-center justify-center py-6 text-center text-xs text-muted-foreground">
                Gửi một câu hỏi mẫu của khách để xem AI trả lời trước khi bật thật.
              </p>
            ) : (
              chatLog.map((turn, i) => (
                <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${
                      turn.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'
                    }`}
                  >
                    {turn.content}
                  </div>
                </div>
              ))
            )}
            {test.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-lg bg-background px-3 py-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Đang trả lời...
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            <Input
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !test.isPending) handleTest(); }}
              placeholder="Nhập câu hỏi mẫu của khách"
            />
            <Button size="icon" variant="outline" disabled={test.isPending} onClick={handleTest} title="Gửi thử">
              {test.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
