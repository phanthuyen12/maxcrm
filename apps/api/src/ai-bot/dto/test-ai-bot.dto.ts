import { IsArray, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { AiBotRule } from './upsert-ai-bot.dto';

export interface TestChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export class TestAiBotDto {
  @IsIn(['ANTHROPIC', 'OPENAI', 'GOOGLE', 'OPENROUTER', 'DEEPSEEK'])
  provider: 'ANTHROPIC' | 'OPENAI' | 'GOOGLE' | 'OPENROUTER' | 'DEEPSEEK';

  @IsString()
  apiKey: string;

  @IsString()
  model: string;

  @IsString()
  systemPrompt: string;

  @IsOptional()
  @IsArray()
  rules?: AiBotRule[];

  @IsOptional()
  @IsString()
  knowledgeBase?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  botId?: string;

  @IsOptional()
  @IsArray()
  history?: TestChatTurn[];
}
