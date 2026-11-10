export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CallAiProviderInput {
  provider: 'ANTHROPIC' | 'OPENAI' | 'GOOGLE' | 'OPENROUTER' | 'DEEPSEEK';
  apiKey: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  messages: ChatMessage[];
}

export async function callAiProvider(input: CallAiProviderInput): Promise<string> {
  if (!input.apiKey || /[^\x00-\xFF]/.test(input.apiKey)) {
    throw new Error('API key không hợp lệ hoặc còn bị che — vui lòng dán lại API key thật');
  }
  switch (input.provider) {
    case 'ANTHROPIC':
      return callAnthropic(input);
    case 'OPENAI':
      return callOpenAi(input);
    case 'GOOGLE':
      return callGoogle(input);
    case 'OPENROUTER':
      return callOpenRouter(input);
    case 'DEEPSEEK':
      return callDeepSeek(input);
  }
}

async function callAnthropic({ apiKey, model, systemPrompt, temperature, messages }: CallAiProviderInput) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  const result: any = await res.json();
  if (!res.ok) throw new Error(result?.error?.message || 'Anthropic API lỗi');
  const text = result?.content?.find((part: any) => part.type === 'text')?.text;
  if (!text) throw new Error('Anthropic không trả về nội dung');
  return text;
}

async function callOpenAi({ apiKey, model, systemPrompt, temperature, messages }: CallAiProviderInput) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  const result: any = await res.json();
  if (!res.ok) throw new Error(result?.error?.message || 'OpenAI API lỗi');
  const text = result?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI không trả về nội dung');
  return text;
}

async function callDeepSeek({ apiKey, model, systemPrompt, temperature, messages }: CallAiProviderInput) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  const result: any = await res.json();
  if (!res.ok) throw new Error(result?.error?.message || 'DeepSeek API lỗi');
  const text = result?.choices?.[0]?.message?.content;
  if (!text) throw new Error('DeepSeek không trả về nội dung');
  return text;
}

async function callOpenRouter({ apiKey, model, systemPrompt, temperature, messages }: CallAiProviderInput) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://zalo-crm.local',
      'X-Title': 'Zalo CRM — Trợ lý AI',
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  const result: any = await res.json();
  if (!res.ok) throw new Error(result?.error?.message || 'OpenRouter API lỗi');
  const text = result?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter không trả về nội dung');
  return text;
}

export interface OpenRouterModel {
  id: string;
  name: string;
}

let openRouterModelsCache: { models: OpenRouterModel[]; fetchedAt: number } | null = null;
const OPENROUTER_MODELS_TTL_MS = 10 * 60 * 1000;

export async function listOpenRouterModels(): Promise<OpenRouterModel[]> {
  if (openRouterModelsCache && Date.now() - openRouterModelsCache.fetchedAt < OPENROUTER_MODELS_TTL_MS) {
    return openRouterModelsCache.models;
  }
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const result: any = await res.json();
  if (!res.ok) throw new Error(result?.error?.message || 'Không tải được danh sách model OpenRouter');
  const models: OpenRouterModel[] = (result?.data ?? [])
    .map((m: any) => ({ id: m.id, name: m.name || m.id }))
    .sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name));
  openRouterModelsCache = { models, fetchedAt: Date.now() };
  return models;
}

async function callGoogle({ apiKey, model, systemPrompt, temperature, messages }: CallAiProviderInput) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      }),
    },
  );
  const result: any = await res.json();
  if (!res.ok) throw new Error(result?.error?.message || 'Gemini API lỗi');
  const text = result?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('');
  if (!text) throw new Error('Gemini không trả về nội dung');
  return text;
}
