import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export interface AiBotRule {
  label: string;
  content: string;
}

export class UpsertAiBotDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsBoolean()
  isEnabled: boolean;

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
}
